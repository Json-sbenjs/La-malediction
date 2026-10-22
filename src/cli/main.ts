// Interface terminal pour tester le moteur : npm run cli
import { createInterface } from "node:readline";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { stdin, stdout } from "node:process";
import {
  MALEDICTION as RULES,
  checkComposition,
  createGame,
  currentStep,
  getRole,
  recommend,
  balanceOf,
  verdictFor,
  submit,
  type Candidate,
  type Composition,
  type GameState,
  type StepInput,
} from "../engine/index.js";

const SAVE = "partie.json";
const rl = createInterface({ input: stdin, output: stdout });

// File de lignes : fonctionne au clavier comme avec une entrée redirigée (tests scriptés).
const lines: string[] = [];
const waiting: ((line: string) => void)[] = [];
rl.on("line", (line) => (waiting.length ? waiting.shift()!(line) : lines.push(line)));
let closed = false;
rl.on("close", () => {
  closed = true;
  if (waiting.length) endOfInput();
});
function endOfInput(): never {
  console.log("\nEntrée terminée.");
  process.exit(0);
}
function ask(prompt: string): Promise<string> {
  stdout.write(prompt);
  if (lines.length) return Promise.resolve(lines.shift()!);
  if (closed) endOfInput();
  return new Promise((resolve) => waiting.push(resolve));
}

const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;

async function main() {
  console.log(bold(`\n=== ${RULES.name} — assistant du MJ ===\n`));
  let state: GameState | undefined;
  if (existsSync(SAVE) && (await yesNo("Une partie sauvegardée existe. La reprendre ?"))) {
    state = JSON.parse(readFileSync(SAVE, "utf8"));
  }
  state ??= await setup();
  await loop(state);
  rl.close();
}

// ---------- Préparation ----------

async function setup(): Promise<GameState> {
  const names = await askNames();
  let composition = recommend(RULES, names.length).composition;

  for (;;) {
    printComposition(composition);
    const answer = (
      await ask(dim("Entrée = valider, « role=nombre » pour modifier (ex. sorciere=0 pelerin=5), « r » = rôles : "))
    ).trim();
    if (answer === "") {
      const problems = checkComposition(RULES, composition, names.length);
      if (!problems.length) break;
      problems.forEach((p) => console.log(red("  ✗ " + p)));
      continue;
    }
    if (answer === "r") {
      for (const r of RULES.roles) console.log(`  ${bold(r.id)} — ${r.name} (${r.camp}) : ${r.description}`);
      continue;
    }
    composition = { ...composition };
    for (const part of answer.split(/\s+/)) {
      const [id, n] = part.split("=");
      if (!RULES.roles.some((r) => r.id === id) || Number.isNaN(Number(n))) {
        console.log(red(`  ✗ « ${part} » non compris.`));
        continue;
      }
      if (Number(n) > 0) composition[id] = Number(n);
      else delete composition[id];
    }
  }

  const state = createGame(RULES, names, composition);
  console.log(bold("\nDistribution des rôles (à montrer à chaque joueur) :"));
  for (const p of state.players) console.log(`  ${p.name.padEnd(14)} ${getRole(RULES, p.role).name}`);
  await ask(dim("\nEntrée pour commencer la première nuit…"));
  return state;
}

async function askNames(): Promise<string[]> {
  for (;;) {
    const raw = await ask(`Noms des joueurs séparés par des virgules (${RULES.minPlayers} à ${RULES.maxPlayers}) :\n> `);
    const names = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (names.length < RULES.minPlayers || names.length > RULES.maxPlayers) {
      console.log(red(`  ✗ ${names.length} joueur(s) : il en faut entre ${RULES.minPlayers} et ${RULES.maxPlayers}.`));
    } else if (new Set(names).size !== names.length) {
      console.log(red("  ✗ Deux joueurs ont le même nom."));
    } else return names;
  }
}

function printComposition(c: Composition) {
  const balance = balanceOf(RULES, c);
  console.log(bold("\nComposition proposée :"));
  for (const [id, n] of Object.entries(c)) console.log(`  ${String(n).padStart(2)} × ${getRole(RULES, id).name} ${dim(`(${id})`)}`);
  console.log(`  Équilibre : ${balance > 0 ? "+" : ""}${balance} → ${verdictFor(balance)}`);
}

// ---------- Boucle de jeu ----------

async function loop(initial: GameState) {
  let state = initial;
  for (;;) {
    writeFileSync(SAVE, JSON.stringify(state));
    const step = currentStep(RULES, state);
    console.log("\n" + bold(step.title));

    if (step.kind === "game-over") {
      console.log(step.message);
      if (await yesNo("Afficher l'historique ?")) printHistory(state);
      unlinkSync(SAVE);
      return;
    }

    let input: StepInput | "quit";
    try {
      input = await askStep(state, step);
    } catch (e) {
      console.log(red("  ✗ " + (e as Error).message));
      continue;
    }
    if (input === "quit") {
      console.log(`Partie sauvegardée dans ${SAVE}.`);
      return;
    }
    try {
      state = submit(RULES, state, input);
    } catch (e) {
      console.log(red("  ✗ " + (e as Error).message));
    }
  }
}

type Step = ReturnType<typeof currentStep>;

async function askStep(state: GameState, step: Step): Promise<StepInput | "quit"> {
  const help = dim("  (commandes : h = historique, j = joueurs, q = sauvegarder et quitter)");
  switch (step.kind) {
    case "game-over":
      return "quit";

    case "info":
      console.log(step.message);
      return (await command(state, "Entrée pour continuer")) ?? { kind: "ack" };

    case "dawn":
      console.log(step.deaths.length ? `Morts cette nuit : ${step.deaths.map((d) => d.name).join(", ")}` : "Personne n'est mort cette nuit.");
      return (await command(state, "Entrée pour passer au vote")) ?? { kind: "ack" };

    case "night-wake": {
      console.log(`Joueur(s) : ${step.actors.map((a) => a.name).join(", ")}`);
      console.log(help);
      const choices: Record<string, number[]> = {};
      for (const { ability, candidates, usesLeft } of step.abilities) {
        const uses = usesLeft !== undefined ? ` — reste ${usesLeft}` : "";
        const picked = await pick(state, `${ability.label}${uses}`, candidates, ability.targets, ability.optional);
        if (picked === "quit") return "quit";
        if (picked.length) choices[ability.id] = picked;
      }
      return { kind: "night-wake", choices };
    }

    case "death-ability": {
      const picked = await pick(state, step.ability.label, step.candidates, step.ability.targets, step.ability.optional);
      return picked === "quit" ? "quit" : { kind: "death-ability", targets: picked };
    }

    case "day-vote": {
      console.log(help);
      const picked = await pick(state, "Qui le village élimine-t-il ? (Entrée = personne)", step.candidates, 1, true);
      return picked === "quit" ? "quit" : { kind: "day-vote", eliminated: picked[0] ?? null };
    }
  }
}

/** Gère les commandes communes. Renvoie "quit" pour quitter, undefined pour continuer. */
async function command(state: GameState, prompt: string): Promise<"quit" | undefined> {
  for (;;) {
    const a = (await ask(dim(prompt + " › "))).trim().toLowerCase();
    if (a === "q") return "quit";
    if (a === "h") printHistory(state);
    else if (a === "j") printPlayers(state);
    else return undefined;
  }
}

async function pick(state: GameState, label: string, candidates: Candidate[], count: number, optional: boolean): Promise<number[] | "quit"> {
  if (!candidates.length) {
    console.log(dim(`  ${label} : aucune cible possible.`));
    return [];
  }
  console.log(`  ${bold(label)} ${dim(`(${count} cible${count > 1 ? "s" : ""}${optional ? ", Entrée pour passer" : ""})`)}`);
  candidates.forEach((c, i) => console.log(`    ${String(i + 1).padStart(2)}. ${c.name}`));
  for (;;) {
    const a = (await ask("  › ")).trim().toLowerCase();
    if (a === "q") return "quit";
    if (a === "h") { printHistory(state); continue; }
    if (a === "j") { printPlayers(state); continue; }
    if (a === "") {
      if (optional) return [];
      console.log(red("  ✗ Ce pouvoir est obligatoire."));
      continue;
    }
    const nums = a.split(/[\s,]+/).map(Number);
    const need = Math.min(count, candidates.length);
    if (nums.length !== need || nums.some((n) => !Number.isInteger(n) || n < 1 || n > candidates.length)) {
      console.log(red(`  ✗ Donne ${need} numéro(s) entre 1 et ${candidates.length}.`));
      continue;
    }
    return nums.map((n) => candidates[n - 1].id);
  }
}

function printPlayers(state: GameState) {
  for (const p of state.players) {
    const line = `  ${p.name.padEnd(14)} ${getRole(RULES, p.role).name}`;
    console.log(p.alive ? line : dim(line + " ✝"));
  }
}

function printHistory(state: GameState) {
  for (const h of state.history) console.log(dim(`  [${h.phase === "night" ? "Nuit" : "Jour"} ${h.turn}] `) + h.text);
}

async function yesNo(q: string): Promise<boolean> {
  return /^o/i.test((await ask(`${q} (o/n) `)).trim());
}

main();
