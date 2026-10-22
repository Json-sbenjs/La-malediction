import type { RuleSet } from "./types.js";

// Règles par défaut de « La Malédiction ».
// Pour ajouter un rôle maison : ajouter une entrée dans `roles`, rien d'autre à toucher.
// Les pouvoirs se construisent avec les effets du moteur (kill, protect, heal, inspect, link, mark).

export const MALEDICTION: RuleSet = {
  name: "La Malédiction",
  minPlayers: 8,
  maxPlayers: 25,
  fillerRole: "pelerin",
  hostileRole: "spectre",

  camps: [
    { id: "pelerins", name: "Pèlerins", victory: "eliminate-hostiles", hostiles: ["spectres", "solitaire"] },
    { id: "spectres", name: "Spectres", victory: "parity" },
    { id: "solitaire", name: "Solitaires", victory: "last-standing" },
  ],

  groupWakes: [
    {
      id: "spectres",
      label: "Les Spectres",
      camp: "spectres",
      order: 50,
      frequency: "every-night",
      abilities: [
        { id: "maudire", label: "Maudire une victime", effect: "kill", targets: 1, targetRule: "other-camp", optional: false },
      ],
    },
  ],

  roles: [
    {
      id: "pelerin",
      name: "Pèlerin",
      camp: "pelerins",
      description: "Aucun pouvoir. Doit démasquer les spectres pendant les votes du jour.",
      power: 1,
      max: 25,
    },
    {
      id: "spectre",
      name: "Spectre",
      camp: "spectres",
      description: "Se réveille avec les autres spectres et maudit un pèlerin chaque nuit.",
      power: -6,
      max: 25,
    },
    {
      id: "voyante",
      name: "Voyante",
      camp: "pelerins",
      description: "Chaque nuit, découvre le rôle d'un joueur.",
      power: 7,
      priority: 1,
      wake: {
        order: 30,
        frequency: "every-night",
        abilities: [
          { id: "sonder", label: "Découvrir un rôle", effect: "inspect", targets: 1, targetRule: "not-self", optional: false },
        ],
      },
    },
    {
      id: "sorciere",
      name: "Sorcière",
      camp: "pelerins",
      description: "Une potion de vie (sauve la victime de la nuit) et une potion de mort, une seule fois chacune.",
      power: 6,
      priority: 2,
      wake: {
        order: 60,
        frequency: "every-night",
        abilities: [
          { id: "vie", label: "Potion de vie", effect: "heal", targets: 1, targetRule: "night-victims", uses: 1, optional: true },
          { id: "mort", label: "Potion de mort", effect: "kill", targets: 1, targetRule: "not-self", uses: 1, optional: true },
        ],
      },
    },
    {
      id: "chasseur",
      name: "Chasseur",
      camp: "pelerins",
      description: "En mourant, il emporte un joueur de son choix avec lui.",
      power: 3,
      priority: 3,
      onDeath: { id: "tir", label: "Dernier tir", effect: "kill", targets: 1, targetRule: "any-alive", optional: false },
    },
    {
      id: "protecteur",
      name: "Protecteur",
      camp: "pelerins",
      description: "Chaque nuit, protège un joueur (pas deux fois de suite le même).",
      power: 4,
      priority: 4,
      wake: {
        order: 20,
        frequency: "every-night",
        abilities: [
          { id: "proteger", label: "Protéger", effect: "protect", targets: 1, targetRule: "any-alive", optional: false, noRepeatTarget: true },
        ],
      },
    },
    {
      id: "cupidon",
      name: "Cupidon",
      camp: "pelerins",
      description: "La première nuit, lie deux joueurs : si l'un meurt, l'autre meurt de chagrin.",
      power: 1,
      priority: 5,
      minPlayers: 10,
      wake: {
        order: 10,
        frequency: "first-night",
        abilities: [
          { id: "lier", label: "Lier deux amoureux", effect: "link", targets: 2, targetRule: "any-alive", uses: 1, optional: false },
        ],
      },
    },
    {
      id: "ermite",
      name: "Ermite maudit",
      camp: "solitaire",
      description: "Solitaire. Une nuit sur deux, tue un joueur. Gagne s'il est le dernier en vie.",
      power: -4,
      priority: 6,
      minPlayers: 14,
      wake: {
        order: 70,
        frequency: "even-nights",
        abilities: [
          { id: "egorger", label: "Tuer un joueur", effect: "kill", targets: 1, targetRule: "not-self", optional: true },
        ],
      },
    },
  ],
};
