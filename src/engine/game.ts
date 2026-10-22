import type {
  Ability,
  Candidate,
  CampId,
  DeathCause,
  Frequency,
  GameState,
  GroupWake,
  Player,
  PlayerId,
  RoleDefinition,
  RuleSet,
  Step,
  StepInput,
  WakeSlot,
} from "./types.js";
import type { Composition } from "./recommend.js";
import { checkComposition } from "./recommend.js";

// Le moteur est une machine à étapes : `currentStep` dit au MJ quoi faire,
// `submit` applique sa réponse et renvoie le nouvel état. L'état est un objet
// JSON simple, donc facile à sauvegarder (fichier en CLI, localStorage sur tablette).

export type Rng = () => number;

// ---------- Création de partie ----------

export function createGame(
  rules: RuleSet,
  names: string[],
  composition: Composition,
  rng: Rng = Math.random,
): GameState {
  const problems = checkComposition(rules, composition, names.length);
  if (problems.length) throw new Error(problems.join("\n"));
  if (new Set(names).size !== names.length) throw new Error("Deux joueurs ont le même nom.");

  const deck = shuffle(
    Object.entries(composition).flatMap(([roleId, n]) => Array<string>(n).fill(roleId)),
    rng,
  );
  const players: Player[] = names.map((name, i) => {
    const role = getRole(rules, deck[i]);
    const usesLeft: Record<string, number> = {};
    for (const a of [...(role.wake?.abilities ?? []), ...(role.onDeath ? [role.onDeath] : [])]) {
      if (a.uses !== undefined) usesLeft[a.id] = a.uses;
    }
    return { id: i, name, role: role.id, alive: true, usesLeft, lastTargets: {} };
  });

  const state: GameState = {
    rulesName: rules.name,
    players,
    turn: 0,
    phase: "night",
    nightQueue: [],
    pendingKills: [],
    protectedIds: [],
    links: [],
    deathTriggers: [],
    lastNightDeaths: [],
    dawnPending: false,
    history: [],
  };
  log(state, `Partie créée avec ${names.length} joueurs.`);
  for (const p of players) log(state, `${p.name} reçoit le rôle ${getRole(rules, p.role).name}.`);
  startNight(rules, state);
  return state;
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- Étape courante ----------

export function currentStep(rules: RuleSet, state: GameState): Step {
  if (state.phase === "over" && state.winner) {
    const deaths = state.dawnPending && state.lastNightDeaths.length
      ? `Morts de la nuit : ${state.lastNightDeaths.map((id) => player(state, id).name).join(", ")}.\n`
      : "";
    return { kind: "game-over", title: "Fin de la partie", message: deaths + state.winner.text };
  }
  if (state.info) return { kind: "info", title: "Information pour le MJ", message: state.info };

  // On annonce les morts de la nuit avant de résoudre leurs pouvoirs (ex. tir du chasseur).
  if (state.phase === "day" && state.dawnPending) {
    return {
      kind: "dawn",
      title: `Jour ${state.turn} — Le village se réveille`,
      deaths: state.lastNightDeaths.map((id) => toCandidate(player(state, id))),
    };
  }

  if (state.deathTriggers.length) {
    const actor = player(state, state.deathTriggers[0]);
    const ability = getRole(rules, actor.role).onDeath!;
    return {
      kind: "death-ability",
      title: `${actor.name} (${getRole(rules, actor.role).name}) meurt : ${ability.label}`,
      actor: toCandidate(actor),
      ability,
      candidates: candidatesFor(rules, state, ability, [actor]),
    };
  }

  if (state.phase === "night") {
    const slot = state.nightQueue[0];
    const { label, actors, abilities } = resolveSlot(rules, state, slot);
    return {
      kind: "night-wake",
      title: `Nuit ${state.turn} — ${label} se réveille${slot.key.startsWith("group:") ? "nt" : ""}`,
      actors: actors.map(toCandidate),
      abilities: abilities.map((ability) => ({
        ability,
        candidates: candidatesFor(rules, state, ability, actors),
        usesLeft: ability.uses === undefined ? undefined : actors[0].usesLeft[ability.id],
      })),
    };
  }

  return { kind: "day-vote", title: `Jour ${state.turn} — Vote du village`, candidates: alive(state).map(toCandidate) };
}

// ---------- Réponse du MJ ----------

export function submit(rules: RuleSet, prev: GameState, input: StepInput): GameState {
  const state: GameState = structuredClone(prev);
  const step = currentStep(rules, state);

  switch (step.kind) {
    case "game-over":
      throw new Error("La partie est terminée.");

    case "info":
      expect(input, "ack");
      state.info = undefined;
      break;

    case "death-ability": {
      if (input.kind !== "death-ability") throw new Error("Réponse attendue : death-ability.");
      const actor = player(state, step.actor.id);
      state.deathTriggers.shift();
      applyAbility(rules, state, step.ability, input.targets, [actor], step.candidates, true);
      checkVictory(rules, state);
      break;
    }

    case "night-wake": {
      if (input.kind !== "night-wake") throw new Error("Réponse attendue : night-wake.");
      const slot = state.nightQueue.shift()!;
      const { actors } = resolveSlot(rules, state, slot);
      for (const { ability, candidates } of step.abilities) {
        applyAbility(rules, state, ability, input.choices[ability.id] ?? [], actors, candidates, false);
      }
      advanceNight(rules, state);
      break;
    }

    case "dawn":
      expect(input, "ack");
      state.dawnPending = false;
      break;

    case "day-vote": {
      if (input.kind !== "day-vote") throw new Error("Réponse attendue : day-vote.");
      if (input.eliminated === null) {
        log(state, "Le village n'élimine personne.");
      } else {
        if (!step.candidates.some((c) => c.id === input.eliminated)) throw new Error("Joueur non éligible au vote.");
        const target = player(state, input.eliminated);
        log(state, `Le village élimine ${target.name} (${getRole(rules, target.role).name}).`);
        kill(rules, state, target.id, "vote");
      }
      if (!checkVictory(rules, state)) state.phase = "night";
      break;
    }
  }

  // Une fois les morts du jour réglés (pouvoirs de mort compris), on enchaîne sur la nuit.
  if (state.phase === "night" && state.nightQueue.length === 0 && !state.deathTriggers.length && !state.info) {
    startNight(rules, state);
  }
  return state;
}

/** Correction manuelle du MJ : tuer ou ressusciter un joueur hors du déroulé normal. */
export function setAlive(rules: RuleSet, prev: GameState, id: PlayerId, aliveFlag: boolean): GameState {
  const state: GameState = structuredClone(prev);
  const p = player(state, id);
  if (aliveFlag) {
    p.alive = true;
    log(state, `Le MJ ramène ${p.name} en jeu.`);
  } else if (p.alive) {
    log(state, `Le MJ retire ${p.name} de la partie.`);
    kill(rules, state, id, "mj");
  }
  checkVictory(rules, state);
  return state;
}

// ---------- Nuit ----------

function startNight(rules: RuleSet, state: GameState) {
  state.turn++;
  state.phase = "night";
  state.pendingKills = [];
  state.protectedIds = [];
  state.lastNightDeaths = [];
  log(state, `La nuit ${state.turn} tombe.`);

  const slots: WakeSlot[] = [];
  for (const role of rules.roles) {
    if (role.wake && activeTonight(role.wake.frequency, state.turn)) slots.push({ key: `role:${role.id}`, order: role.wake.order });
  }
  for (const g of rules.groupWakes) {
    if (activeTonight(g.frequency, state.turn)) slots.push({ key: `group:${g.id}`, order: g.order });
  }
  state.nightQueue = slots.sort((a, b) => a.order - b.order);
  advanceNight(rules, state);
}

function activeTonight(freq: Frequency, turn: number): boolean {
  switch (freq) {
    case "every-night":
      return true;
    case "first-night":
      return turn === 1;
    case "even-nights":
      return turn % 2 === 0;
    case "odd-nights":
      return turn % 2 === 1;
  }
}

/** Saute les réveils sans joueur vivant ou sans pouvoir utilisable, résout la nuit si la file est vide. */
function advanceNight(rules: RuleSet, state: GameState) {
  while (state.nightQueue.length) {
    const { actors, abilities } = resolveSlot(rules, state, state.nightQueue[0]);
    if (actors.length && abilities.length) return;
    state.nightQueue.shift();
  }
  resolveNight(rules, state);
}

function resolveSlot(rules: RuleSet, state: GameState, slot: WakeSlot) {
  const [type, id] = slot.key.split(":");
  if (type === "group") {
    const g = rules.groupWakes.find((x) => x.id === id) as GroupWake;
    const actors = alive(state).filter((p) => getRole(rules, p.role).camp === g.camp);
    return { label: g.label, actors, abilities: g.abilities };
  }
  const role = getRole(rules, id);
  const actors = alive(state).filter((p) => p.role === id);
  // Pour les rôles individuels, on considère le premier joueur vivant qui le détient.
  const holder = actors[0];
  const abilities = (role.wake?.abilities ?? []).filter(
    (a) => holder && (a.uses === undefined || (holder.usesLeft[a.id] ?? 0) > 0),
  );
  return { label: role.name, actors: holder ? [holder] : [], abilities };
}

function resolveNight(rules: RuleSet, state: GameState) {
  const victims: { id: PlayerId; cause: DeathCause }[] = [];
  for (const k of state.pendingKills) {
    const target = player(state, k.target);
    if (!target.alive || victims.some((v) => v.id === k.target)) continue;
    if (!k.unstoppable && state.protectedIds.includes(k.target)) {
      log(state, `${target.name} était protégé(e) et survit (${k.source}).`);
      continue;
    }
    victims.push({ id: k.target, cause: k.cause });
  }
  state.pendingKills = [];

  const before = new Set(alive(state).map((p) => p.id));
  for (const v of victims) kill(rules, state, v.id, v.cause);
  state.lastNightDeaths = [...before].filter((id) => !player(state, id).alive);
  if (!state.lastNightDeaths.length) log(state, "Personne n'est mort cette nuit.");

  state.phase = "day";
  state.dawnPending = true;
  log(state, `Le jour ${state.turn} se lève.`);
  checkVictory(rules, state);
}

// ---------- Pouvoirs ----------

function candidatesFor(rules: RuleSet, state: GameState, ability: Ability, actors: Player[]): Candidate[] {
  const actorIds = actors.map((a) => a.id);
  const camp = actors[0] ? getRole(rules, actors[0].role).camp : undefined;
  let list: Player[];
  switch (ability.targetRule) {
    case "night-victims":
      list = state.pendingKills
        .map((k) => player(state, k.target))
        .filter((p, i, arr) => p.alive && arr.indexOf(p) === i);
      break;
    case "not-self":
      list = alive(state).filter((p) => !actorIds.includes(p.id));
      break;
    case "other-camp":
      list = alive(state).filter((p) => getRole(rules, p.role).camp !== camp);
      break;
    default:
      list = alive(state);
  }
  if (ability.noRepeatTarget && actors[0]) {
    const last = actors[0].lastTargets[ability.id] ?? [];
    list = list.filter((p) => !last.includes(p.id));
  }
  return list.map(toCandidate);
}

function applyAbility(
  rules: RuleSet,
  state: GameState,
  ability: Ability,
  targets: PlayerId[],
  actors: Player[],
  candidates: Candidate[],
  immediate: boolean,
) {
  const who = actors.map((a) => a.name).join(", ");
  if (!targets.length) {
    if (!ability.optional && candidates.length) throw new Error(`« ${ability.label} » est obligatoire.`);
    if (ability.optional) log(state, `${who} n'utilise pas « ${ability.label} ».`);
    return;
  }
  if (targets.length !== Math.min(ability.targets, candidates.length)) {
    throw new Error(`« ${ability.label} » demande ${ability.targets} cible(s).`);
  }
  if (new Set(targets).size !== targets.length) throw new Error("Une même cible a été choisie deux fois.");
  for (const t of targets) {
    if (!candidates.some((c) => c.id === t)) throw new Error(`${player(state, t).name} n'est pas une cible valide.`);
  }

  const holder = actors[0];
  if (ability.uses !== undefined) holder.usesLeft[ability.id] = (holder.usesLeft[ability.id] ?? 0) - 1;
  holder.lastTargets[ability.id] = targets;
  const names = targets.map((t) => player(state, t).name).join(" et ");

  switch (ability.effect) {
    case "kill": {
      const cause: DeathCause = immediate ? "death-ability" : rules.groupWakes.some((g) => g.abilities.includes(ability)) ? "spectres" : "kill";
      log(state, `${who} : « ${ability.label} » sur ${names}.`);
      for (const t of targets) {
        if (immediate) kill(rules, state, t, cause);
        else state.pendingKills.push({ target: t, cause, source: ability.label, unstoppable: !!ability.unstoppable });
      }
      break;
    }
    case "protect":
      state.protectedIds.push(...targets);
      log(state, `${who} protège ${names}.`);
      break;
    case "heal":
      state.pendingKills = state.pendingKills.filter((k) => k.unstoppable || !targets.includes(k.target));
      log(state, `${who} : « ${ability.label} » sauve ${names}.`);
      break;
    case "inspect": {
      const reveals = targets.map((t) => {
        const p = player(state, t);
        return `${p.name} est ${getRole(rules, p.role).name}`;
      });
      log(state, `${who} découvre que ${reveals.join(", ")}.`);
      state.info = `${reveals.join("\n")}.\nMontre-le discrètement à ${who}.`;
      break;
    }
    case "link":
      if (targets.length >= 2) state.links.push([targets[0], targets[1]]);
      log(state, `${who} lie ${names}.`);
      break;
    case "mark":
      log(state, `${who} : « ${ability.label} » sur ${names}.${ability.note ? " " + ability.note : ""}`);
      break;
  }
}

function kill(rules: RuleSet, state: GameState, id: PlayerId, cause: DeathCause) {
  const p = player(state, id);
  if (!p.alive) return;
  p.alive = false;
  const role = getRole(rules, p.role);
  if (cause !== "vote" && cause !== "mj") log(state, `${p.name} (${role.name}) meurt (${causeLabel(cause)}).`);
  if (role.onDeath && (role.onDeath.uses === undefined || (p.usesLeft[role.onDeath.id] ?? 0) > 0)) {
    state.deathTriggers.push(p.id);
  }
  for (const [a, b] of state.links) {
    const other = a === id ? b : b === id ? a : undefined;
    if (other !== undefined && player(state, other).alive) kill(rules, state, other, "link");
  }
}

function causeLabel(cause: DeathCause): string {
  return {
    spectres: "maudit par les spectres",
    kill: "tué dans la nuit",
    vote: "éliminé par le vote",
    link: "de chagrin",
    "death-ability": "emporté dans la mort",
    mj: "décision du MJ",
  }[cause];
}

// ---------- Victoire ----------

/** Vérifie les conditions de victoire. Ne conclut pas tant qu'un pouvoir de mort est en attente. */
function checkVictory(rules: RuleSet, state: GameState): boolean {
  if (state.deathTriggers.length) return false;
  const living = alive(state);
  const winner = findWinner(rules, state, living);
  if (!winner) return false;
  state.phase = "over";
  state.winner = winner;
  state.info = undefined;
  state.nightQueue = [];
  log(state, winner.text);
  return true;
}

function findWinner(rules: RuleSet, state: GameState, living: Player[]): GameState["winner"] {
  if (!living.length) return { camp: "none", text: "Tout le monde est mort : la malédiction a tout emporté." };

  const lovers = new Set(state.links.flat());
  if (lovers.size && living.length === 2 && living.every((p) => lovers.has(p.id))) {
    return { camp: "lovers", text: `Les amoureux ${living.map((p) => p.name).join(" et ")} gagnent ensemble !` };
  }

  const campOf = (p: Player): CampId => getRole(rules, p.role).camp;
  for (const camp of rules.camps) {
    const members = living.filter((p) => campOf(p) === camp.id);
    if (!members.length) continue;
    const others = living.length - members.length;
    let won = false;
    if (camp.victory === "last-standing") won = living.length === 1;
    else if (camp.victory === "parity") {
      // Un solitaire encore en vie empêche la victoire par parité.
      const loners = living.some((p) => rules.camps.find((c) => c.id === campOf(p))?.victory === "last-standing");
      won = members.length >= others && !loners;
    } else won = !living.some((p) => camp.hostiles?.includes(campOf(p)));
    if (won) return { camp: camp.id, text: `Victoire des ${camp.name} !` };
  }
  return undefined;
}

// ---------- Utilitaires ----------

export function getRole(rules: RuleSet, id: string): RoleDefinition {
  const role = rules.roles.find((r) => r.id === id);
  if (!role) throw new Error(`Rôle inconnu : ${id}`);
  return role;
}

function player(state: GameState, id: PlayerId): Player {
  const p = state.players.find((x) => x.id === id);
  if (!p) throw new Error(`Joueur inconnu : ${id}`);
  return p;
}

function alive(state: GameState): Player[] {
  return state.players.filter((p) => p.alive);
}

function toCandidate(p: Player): Candidate {
  return { id: p.id, name: p.name };
}

function expect(input: StepInput, kind: StepInput["kind"]) {
  if (input.kind !== kind) throw new Error(`Réponse attendue : ${kind}.`);
}

function log(state: GameState, text: string) {
  state.history.push({ turn: state.turn, phase: state.phase, text });
}
