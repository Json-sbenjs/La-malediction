// Interface tablette / PC (PWA). Toute la logique vient du moteur partagé avec le CLI.
import {
  MALEDICTION as RULES,
  balanceOf,
  checkComposition,
  createGame,
  currentStep,
  getRole,
  recommend,
  setAlive,
  submit,
  verdictFor,
  type Composition,
  type GameState,
  type PlayerId,
  type Step,
  type StepInput,
} from "../engine/index.js";

const SAVE_KEY = "malediction:partie";
const NAMES_KEY = "malediction:noms";

type Screen =
  | { name: "home" }
  | { name: "players"; text: string; error?: string }
  | { name: "composition"; names: string[]; composition: Composition; error?: string }
  | { name: "reveal"; state: GameState }
  | { name: "game"; state: GameState; selection: Record<string, PlayerId[]>; error?: string; tab: "joueurs" | "historique" };

let screen: Screen = { name: "home" };
const app = document.getElementById("app")!;

// ---------- Mini helper DOM ----------

type Child = Node | string | null | undefined | false;
function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<Record<string, unknown>> = {},
  ...children: (Child | Child[])[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v as EventListener);
    else if (k === "class") el.className = String(v);
    else if (k === "value") (el as HTMLInputElement).value = String(v);
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of children.flat()) if (c) el.append(c);
  return el;
}

function go(next: Screen) {
  screen = next;
  render();
}

// ---------- Sauvegarde (localStorage peut être indisponible : navigation privée…) ----------

function save(state: GameState | null) {
  try {
    if (state && state.phase !== "over") localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    else localStorage.removeItem(SAVE_KEY);
  } catch {}
}
function loadSave(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function lastNames(): string {
  try {
    return localStorage.getItem(NAMES_KEY) ?? "";
  } catch {
    return "";
  }
}

// ---------- Écrans ----------

function render() {
  app.replaceChildren(
    ({
      home: renderHome,
      players: renderPlayers,
      composition: renderComposition,
      reveal: renderReveal,
      game: renderGame,
    } as Record<Screen["name"], () => HTMLElement>)[screen.name](),
  );
}

function renderHome() {
  const saved = loadSave();
  return h(
    "div",
    {},
    h("h1", {}, `🌒 ${RULES.name}`),
    h(
      "div",
      { class: "card" },
      h("p", {}, "Assistant du maître du jeu : distribution des rôles, déroulé des nuits, votes et historique."),
      h("p", { class: "muted" }, `De ${RULES.minPlayers} à ${RULES.maxPlayers} joueurs.`),
      h(
        "div",
        { class: "row" },
        h("button", { class: "primary", onclick: () => go({ name: "players", text: lastNames() }) }, "Nouvelle partie"),
        saved &&
          h(
            "button",
            { onclick: () => go({ name: "game", state: saved, selection: {}, tab: "joueurs" }) },
            `Reprendre (nuit/jour ${saved.turn}, ${saved.players.filter((p) => p.alive).length} en vie)`,
          ),
      ),
    ),
    h(
      "div",
      { class: "card" },
      h("h2", {}, "Rôles disponibles"),
      RULES.roles.map((r) =>
        h("div", { class: "role-line" }, h("div", { class: "info" }, h("strong", {}, r.name), " ", campTag(r.camp), h("div", { class: "muted" }, r.description))),
      ),
    ),
  );
}

function renderPlayers() {
  const s = screen as Extract<Screen, { name: "players" }>;
  const parse = (t: string) => t.split(/[\n,]/).map((x) => x.trim()).filter(Boolean);
  const count = h("span", { class: "muted" }, `${parse(s.text).length} joueur(s)`);
  const area = h("textarea", {
    placeholder: "Un nom par ligne",
    value: s.text,
    oninput: (e: Event) => {
      s.text = (e.target as HTMLTextAreaElement).value;
      count.textContent = `${parse(s.text).length} joueur(s)`;
    },
  });
  const next = () => {
    const names = parse(s.text);
    let error: string | undefined;
    if (names.length < RULES.minPlayers || names.length > RULES.maxPlayers) error = `Il faut entre ${RULES.minPlayers} et ${RULES.maxPlayers} joueurs (${names.length} saisis).`;
    else if (new Set(names).size !== names.length) error = "Deux joueurs ont le même nom.";
    if (error) return go({ ...s, error });
    try {
      localStorage.setItem(NAMES_KEY, names.join("\n"));
    } catch {}
    go({ name: "composition", names, composition: recommend(RULES, names.length).composition });
  };
  return h(
    "div",
    {},
    h("h1", {}, "Joueurs"),
    h(
      "div",
      { class: "card" },
      area,
      s.error && h("div", { class: "error" }, s.error),
      h("div", { class: "row", style: "margin-top:12px" }, count, h("span", { class: "spacer" }), h("button", { class: "ghost", onclick: () => go({ name: "home" }) }, "Retour"), h("button", { class: "primary", onclick: next }, "Composition →")),
    ),
  );
}

function renderComposition() {
  const s = screen as Extract<Screen, { name: "composition" }>;
  const n = s.names.length;
  const total = Object.values(s.composition).reduce((a, b) => a + b, 0);
  const balance = balanceOf(RULES, s.composition);
  const problems = checkComposition(RULES, s.composition, n);

  const change = (id: string, delta: number) => {
    const c = { ...s.composition, [id]: Math.max(0, (s.composition[id] ?? 0) + delta) };
    if (!c[id]) delete c[id];
    go({ ...s, composition: c, error: undefined });
  };
  const start = () => {
    try {
      const state = createGame(RULES, s.names, s.composition);
      save(state);
      go({ name: "reveal", state });
    } catch (e) {
      go({ ...s, error: (e as Error).message });
    }
  };

  return h(
    "div",
    {},
    h("h1", {}, `Composition — ${n} joueurs`),
    h(
      "div",
      { class: "card" },
      h(
        "div",
        { class: "row" },
        h("span", { class: "big" }, `${total} / ${n} rôles`),
        h("span", { class: "tag" }, `Équilibre ${balance > 0 ? "+" : ""}${balance} · ${verdictFor(balance)}`),
        h("span", { class: "spacer" }),
        h("button", { class: "small ghost", onclick: () => go({ ...s, composition: recommend(RULES, n).composition }) }, "↺ Recommandation"),
      ),
      RULES.roles.map((r) => {
        const c = s.composition[r.id] ?? 0;
        const tooFew = !!r.minPlayers && n < r.minPlayers;
        return h(
          "div",
          { class: "role-line" },
          h(
            "div",
            { class: "info" },
            h("strong", {}, r.name),
            " ",
            campTag(r.camp),
            tooFew && h("span", { class: "tag" }, `conseillé dès ${r.minPlayers}`),
            h("div", { class: "muted" }, r.description),
          ),
          h("button", { class: "small", onclick: () => change(r.id, -1), disabled: c === 0 }, "−"),
          h("span", { class: "count" }, String(c)),
          h("button", { class: "small", onclick: () => change(r.id, +1), disabled: c >= (r.max ?? 1) }, "+"),
        );
      }),
      problems.length > 0 && h("div", { class: "error" }, problems.join("\n")),
      s.error && h("div", { class: "error" }, s.error),
      h(
        "div",
        { class: "row end", style: "margin-top:12px" },
        h("button", { class: "ghost", onclick: () => go({ name: "players", text: s.names.join("\n") }) }, "← Joueurs"),
        h("button", { class: "primary", onclick: start, disabled: problems.length > 0 }, "Distribuer les rôles"),
      ),
    ),
  );
}

function renderReveal() {
  const s = screen as Extract<Screen, { name: "reveal" }>;
  return h(
    "div",
    {},
    h("h1", {}, "Distribution des rôles"),
    h(
      "div",
      { class: "card" },
      h("p", { class: "muted" }, "Montre son rôle à chaque joueur. Touche un nom pour révéler/masquer son rôle."),
      h(
        "div",
        { class: "grid" },
        s.state.players.map((p) => {
          const btn = h("button", {}, p.name);
          let shown = false;
          btn.addEventListener("click", () => {
            shown = !shown;
            btn.textContent = shown ? `${p.name} : ${getRole(RULES, p.role).name}` : p.name;
            btn.classList.toggle("selected", shown);
          });
          return btn;
        }),
      ),
      h(
        "div",
        { class: "row end", style: "margin-top:16px" },
        h("button", { class: "primary", onclick: () => go({ name: "game", state: s.state, selection: {}, tab: "joueurs" }) }, "Commencer la nuit 1 →"),
      ),
    ),
  );
}

function renderGame() {
  const s = screen as Extract<Screen, { name: "game" }>;
  const step = currentStep(RULES, s.state);
  const phaseClass = s.state.phase === "night" && !s.state.dawnPending ? "phase-night" : "phase-day";
  return h(
    "div",
    {},
    h(
      "div",
      { class: "row" },
      h("h1", {}, `🌒 ${RULES.name}`),
      h("span", { class: "spacer" }),
      h("button", { class: "small ghost", onclick: () => confirm("Quitter la partie ? Elle reste sauvegardée.") && go({ name: "home" }) }, "Menu"),
    ),
    h(
      "div",
      { class: "layout" },
      h("div", { class: `card ${phaseClass}` }, ...renderStep(s, step)),
      h(
        "div",
        { class: "card" },
        h(
          "div",
          { class: "row" },
          h("button", { class: `small ${s.tab === "joueurs" ? "selected" : ""}`, onclick: () => go({ ...s, tab: "joueurs" }) }, "Joueurs"),
          h("button", { class: `small ${s.tab === "historique" ? "selected" : ""}`, onclick: () => go({ ...s, tab: "historique" }) }, "Historique"),
        ),
        s.tab === "joueurs" ? renderPlayerList(s) : renderHistory(s.state),
      ),
    ),
  );
}

function renderStep(s: Extract<Screen, { name: "game" }>, step: Step): (Child | Child[])[] {
  const send = (input: StepInput) => {
    try {
      const state = submit(RULES, s.state, input);
      save(state);
      go({ ...s, state, selection: {}, error: undefined });
    } catch (e) {
      go({ ...s, error: (e as Error).message });
    }
  };
  const error = s.error && h("div", { class: "error" }, s.error);

  // Boutons de sélection de cibles, partagés par les pouvoirs de nuit, de mort et le vote.
  const picker = (key: string, candidates: { id: PlayerId; name: string }[], max: number) => {
    const chosen = s.selection[key] ?? [];
    if (!candidates.length) return h("p", { class: "muted" }, "Aucune cible possible.");
    return h(
      "div",
      { class: "grid" },
      candidates.map((c) =>
        h(
          "button",
          {
            class: chosen.includes(c.id) ? "selected" : "",
            onclick: () => {
              let next = chosen.includes(c.id) ? chosen.filter((x) => x !== c.id) : [...chosen, c.id];
              if (next.length > max) next = next.slice(-max);
              go({ ...s, selection: { ...s.selection, [key]: next }, error: undefined });
            },
          },
          c.name,
        ),
      ),
    );
  };

  switch (step.kind) {
    case "game-over":
      return [
        h("h2", {}, step.title),
        h("div", { class: "banner big" }, step.message),
        h("div", { class: "row end" }, h("button", { class: "primary", onclick: () => { save(null); go({ name: "home" }); } }, "Nouvelle partie")),
      ];

    case "info":
      return [
        h("h2", {}, step.title),
        h("div", { class: "banner big" }, step.message),
        h("div", { class: "row end" }, h("button", { class: "primary", onclick: () => send({ kind: "ack" }) }, "Continuer")),
      ];

    case "dawn":
      return [
        h("h2", {}, `☀️ ${step.title}`),
        h("div", { class: "banner big" }, step.deaths.length ? `Morts cette nuit : ${step.deaths.map((d) => d.name).join(", ")}` : "Personne n'est mort cette nuit."),
        h("div", { class: "row end" }, h("button", { class: "primary", onclick: () => send({ kind: "ack" }) }, "Continuer")),
      ];

    case "night-wake":
      return [
        h("h2", {}, `🌙 ${step.title}`),
        h("p", { class: "muted" }, `À réveiller : ${step.actors.map((a) => a.name).join(", ")}`),
        step.abilities.map(({ ability, candidates, usesLeft }) =>
          h(
            "div",
            {},
            h("h3", {}, `${ability.label}${usesLeft !== undefined ? ` · reste ${usesLeft}` : ""}${ability.targets > 1 ? ` · ${ability.targets} cibles` : ""}${ability.optional ? " · facultatif" : ""}`),
            picker(ability.id, candidates, ability.targets),
          ),
        ),
        error,
        h(
          "div",
          { class: "row end", style: "margin-top:16px" },
          h("button", { class: "primary", onclick: () => send({ kind: "night-wake", choices: s.selection }) }, "Valider et rendormir"),
        ),
      ];

    case "death-ability":
      return [
        h("h2", {}, `⚰️ ${step.title}`),
        picker("death", step.candidates, step.ability.targets),
        error,
        h(
          "div",
          { class: "row end", style: "margin-top:16px" },
          step.ability.optional && h("button", { class: "ghost", onclick: () => send({ kind: "death-ability", targets: [] }) }, "Passer"),
          h("button", { class: "primary", onclick: () => send({ kind: "death-ability", targets: s.selection.death ?? [] }) }, "Valider"),
        ),
      ];

    case "day-vote": {
      const chosen = s.selection.vote?.[0];
      return [
        h("h2", {}, `🗳️ ${step.title}`),
        h("p", { class: "muted" }, "Sélectionne le joueur éliminé par le village."),
        picker("vote", step.candidates, 1),
        error,
        h(
          "div",
          { class: "row end", style: "margin-top:16px" },
          h("button", { class: "ghost", onclick: () => send({ kind: "day-vote", eliminated: null }) }, "Personne n'est éliminé"),
          h(
            "button",
            {
              class: "primary",
              disabled: chosen === undefined,
              onclick: () => {
                const name = s.state.players.find((p) => p.id === chosen)?.name;
                if (confirm(`Éliminer ${name} ?`)) send({ kind: "day-vote", eliminated: chosen! });
              },
            },
            "Éliminer",
          ),
        ),
      ];
    }
  }
}

function renderPlayerList(s: Extract<Screen, { name: "game" }>) {
  const lovers = new Set(s.state.links.flat());
  return h(
    "div",
    { class: "players" },
    h(
      "ul",
      {},
      s.state.players.map((p) =>
        h(
          "li",
          { class: p.alive ? "" : "dead" },
          h("span", { class: "spacer" }, `${p.name}${lovers.has(p.id) ? " ❤" : ""}`),
          h("span", { class: "tag" }, getRole(RULES, p.role).name),
          s.state.phase !== "over" &&
            h(
              "button",
              {
                class: "small ghost",
                title: p.alive ? "Retirer ce joueur (correction MJ)" : "Ramener ce joueur",
                onclick: () => {
                  if (!confirm(p.alive ? `Retirer ${p.name} de la partie ?` : `Ramener ${p.name} en jeu ?`)) return;
                  const state = setAlive(RULES, s.state, p.id, !p.alive);
                  save(state);
                  go({ ...s, state });
                },
              },
              p.alive ? "✝" : "↺",
            ),
        ),
      ),
    ),
  );
}

function renderHistory(state: GameState) {
  return h(
    "div",
    { class: "history" },
    h("ul", {}, [...state.history].reverse().map((e) => h("li", {}, h("span", { class: "muted" }, `${e.phase === "night" ? "Nuit" : e.phase === "day" ? "Jour" : "Fin"} ${e.turn} · `), e.text))),
    h(
      "div",
      { class: "row end", style: "margin-top:12px" },
      h("button", { class: "small ghost", onclick: () => exportHistory(state) }, "Exporter (.txt)"),
    ),
  );
}

function exportHistory(state: GameState) {
  const text = state.history.map((e) => `[${e.phase === "night" ? "Nuit" : "Jour"} ${e.turn}] ${e.text}`).join("\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const a = h("a", { href: url, download: `malediction-${new Date().toISOString().slice(0, 10)}.txt` });
  a.click();
  URL.revokeObjectURL(url);
}

function campTag(campId: string) {
  return h("span", { class: "tag" }, RULES.camps.find((c) => c.id === campId)?.name ?? campId);
}

render();

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
