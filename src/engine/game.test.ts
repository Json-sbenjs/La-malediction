import { describe, expect, it } from "vitest";
import { MALEDICTION as R } from "./roles.js";
import { createGame, currentStep, submit, setAlive } from "./game.js";
import { recommend, checkComposition, balanceOf } from "./recommend.js";
import type { GameState, StepInput } from "./types.js";

// rng proche de 1 : le mélange ne change pas l'ordre, les rôles sont distribués dans l'ordre de la composition.
const noShuffle = () => 0.9999;
const NAMES = ["Ana", "Bob", "Cléo", "Dan", "Eva", "Fred", "Gus", "Hugo", "Iris", "Jade"];

function game(composition: Record<string, number>, n = 8): GameState {
  return createGame(R, NAMES.slice(0, n), composition, noShuffle);
}
const id = (s: GameState, name: string) => s.players.find((p) => p.name === name)!.id;
const play = (s: GameState, input: StepInput) => submit(R, s, input);
const wake = (s: GameState, choices: Record<string, string[]>) =>
  play(s, { kind: "night-wake", choices: Object.fromEntries(Object.entries(choices).map(([k, v]) => [k, v.map((n) => id(s, n))])) });

describe("recommandations", () => {
  it("propose une composition complète et équilibrée pour 8 à 25 joueurs", () => {
    for (let n = 8; n <= 25; n++) {
      const rec = recommend(R, n);
      expect(checkComposition(R, rec.composition, n)).toEqual([]);
      expect(Math.abs(rec.balance)).toBeLessThanOrEqual(4);
      expect(rec.balance).toBe(balanceOf(R, rec.composition));
    }
  });

  it("augmente le nombre de spectres avec le nombre de joueurs", () => {
    expect(recommend(R, 8).composition.spectre).toBe(2);
    expect(recommend(R, 25).composition.spectre).toBe(6);
  });

  it("respecte la liste des rôles autorisés", () => {
    const rec = recommend(R, 12, ["voyante"]);
    expect(Object.keys(rec.composition).sort()).toEqual(["pelerin", "spectre", "voyante"]);
  });
});

describe("déroulé d'une partie", () => {
  it("nuit avec voyante, spectres et sorcière, puis vote", () => {
    // Ana, Bob = spectres ; Cléo = voyante ; Dan = sorcière ; reste = pèlerins
    let s = game({ spectre: 2, voyante: 1, sorciere: 1, pelerin: 4 });
    expect(currentStep(R, s).kind).toBe("night-wake");
    expect(currentStep(R, s).title).toContain("Voyante");

    s = wake(s, { sonder: ["Ana"] });
    const info = currentStep(R, s);
    expect(info.kind === "info" && info.message).toContain("Ana est Spectre");
    s = play(s, { kind: "ack" });

    const spectres = currentStep(R, s);
    expect(spectres.kind === "night-wake" && spectres.actors.map((a) => a.name)).toEqual(["Ana", "Bob"]);
    // Les spectres ne peuvent pas se cibler entre eux.
    expect(spectres.kind === "night-wake" && spectres.abilities[0].candidates.map((c) => c.name)).not.toContain("Bob");
    s = wake(s, { maudire: ["Eva"] });

    const witch = currentStep(R, s);
    expect(witch.kind === "night-wake" && witch.abilities[0].candidates.map((c) => c.name)).toEqual(["Eva"]);
    s = wake(s, { vie: ["Eva"] });

    const dawn = currentStep(R, s);
    expect(dawn.kind === "dawn" && dawn.deaths).toEqual([]);
    s = play(s, { kind: "ack" });

    expect(currentStep(R, s).kind).toBe("day-vote");
    s = play(s, { kind: "day-vote", eliminated: id(s, "Ana") });
    expect(s.players.find((p) => p.name === "Ana")!.alive).toBe(false);

    // Nuit 2 : la potion de vie est épuisée, il ne reste que la potion de mort.
    s = wake(s, { sonder: ["Bob"] });
    s = play(s, { kind: "ack" });
    s = wake(s, { maudire: ["Fred"] });
    const witch2 = currentStep(R, s);
    expect(witch2.kind === "night-wake" && witch2.abilities.map((a) => a.ability.id)).toEqual(["mort"]);
    s = wake(s, { mort: ["Bob"] });

    // Bob (dernier spectre) meurt : victoire des pèlerins.
    const end = currentStep(R, s);
    expect(end.kind).toBe("game-over");
    expect(end.kind === "game-over" && end.message).toContain("Pèlerins");
    expect(s.history.length).toBeGreaterThan(10);
  });

  it("le protecteur sauve sa cible et ne peut pas la protéger deux fois de suite", () => {
    let s = game({ spectre: 2, protecteur: 1, pelerin: 5 });
    s = wake(s, { proteger: ["Dan"] });
    s = wake(s, { maudire: ["Dan"] });
    expect(currentStep(R, s).kind).toBe("dawn");
    expect(s.players[id(s, "Dan")].alive).toBe(true);
    s = play(s, { kind: "ack" });
    s = play(s, { kind: "day-vote", eliminated: null });

    const step = currentStep(R, s);
    expect(step.kind === "night-wake" && step.abilities[0].candidates.map((c) => c.name)).not.toContain("Dan");
  });

  it("le chasseur tire après l'annonce de sa mort", () => {
    // Ana, Bob = spectres ; Cléo = chasseur
    let s = game({ spectre: 2, chasseur: 1, pelerin: 5 });
    s = wake(s, { maudire: ["Cléo"] });
    const dawn = currentStep(R, s);
    expect(dawn.kind === "dawn" && dawn.deaths.map((d) => d.name)).toEqual(["Cléo"]);
    s = play(s, { kind: "ack" });
    expect(currentStep(R, s).kind).toBe("death-ability");
    s = play(s, { kind: "death-ability", targets: [id(s, "Ana")] });
    expect(s.players[id(s, "Ana")].alive).toBe(false);
    expect(currentStep(R, s).kind).toBe("day-vote");
  });

  it("le chasseur éliminé au vote tire avant la nuit suivante", () => {
    let s = game({ spectre: 2, chasseur: 1, pelerin: 5 });
    s = wake(s, { maudire: ["Hugo"] });
    s = play(s, { kind: "ack" });
    s = play(s, { kind: "day-vote", eliminated: id(s, "Cléo") });
    expect(currentStep(R, s).kind).toBe("death-ability");
    s = play(s, { kind: "death-ability", targets: [id(s, "Bob")] });
    const night = currentStep(R, s);
    expect(night.kind === "night-wake" && night.title).toContain("Nuit 2");
  });

  it("les amoureux meurent ensemble et peuvent gagner à deux", () => {
    // Ana = spectre ; Bob = cupidon ; reste = pèlerins
    let s = createGame(R, NAMES, { spectre: 1, cupidon: 1, pelerin: 8 }, noShuffle);
    s = wake(s, { lier: ["Ana", "Jade"] });
    s = wake(s, { maudire: ["Jade"] });
    // Jade meurt, Ana (amoureuse, dernier spectre) meurt de chagrin : victoire des pèlerins.
    expect(s.players[id(s, "Ana")].alive).toBe(false);
    expect(currentStep(R, s).kind).toBe("game-over");
  });

  it("les spectres gagnent à la parité", () => {
    let s = game({ spectre: 2, pelerin: 6 });
    s = wake(s, { maudire: ["Cléo"] });
    s = play(s, { kind: "ack" });
    s = play(s, { kind: "day-vote", eliminated: id(s, "Dan") });
    s = wake(s, { maudire: ["Eva"] });
    s = play(s, { kind: "ack" });
    // Restent Ana, Bob (spectres), Fred, Gus, Hugo : éliminer Fred donne 2 contre 2.
    s = play(s, { kind: "day-vote", eliminated: id(s, "Fred") });
    const end = currentStep(R, s);
    expect(end.kind === "game-over" && end.message).toContain("Spectres");
  });

  it("refuse les réponses invalides", () => {
    const s = game({ spectre: 2, pelerin: 6 });
    expect(() => wake(s, {})).toThrow(/obligatoire/);
    expect(() => wake(s, { maudire: ["Bob"] })).toThrow(/cible valide/);
    expect(() => play(s, { kind: "ack" })).toThrow();
  });

  it("le MJ peut corriger un joueur à la main", () => {
    let s = game({ spectre: 2, pelerin: 6 });
    s = setAlive(R, s, id(s, "Hugo"), false);
    expect(s.players[id(s, "Hugo")].alive).toBe(false);
    s = setAlive(R, s, id(s, "Hugo"), true);
    expect(s.players[id(s, "Hugo")].alive).toBe(true);
  });

  it("l'état reste sérialisable en JSON", () => {
    let s = game({ spectre: 2, voyante: 1, pelerin: 5 });
    s = JSON.parse(JSON.stringify(s));
    s = wake(s, { sonder: ["Ana"] });
    expect(currentStep(R, s).kind).toBe("info");
  });
});
