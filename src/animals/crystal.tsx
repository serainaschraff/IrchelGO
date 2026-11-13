import { createCreatureDefinition } from "./CreatureModel";

export const crystalVariants = [
  createCreatureDefinition("amethyst-crystal", "Amethyst Crystal", "crystal", {
    body: "#9b6bd6",
    belly: "#e7d5ff",
    detail: "#513979",
    accent: "#c99cff",
  }),
  createCreatureDefinition("rose-quartz-crystal", "Rose Quartz Crystal", "crystal", {
    body: "#dc849e",
    belly: "#ffe0e8",
    detail: "#793f59",
    accent: "#f4b4c6",
  }),
] as const;
