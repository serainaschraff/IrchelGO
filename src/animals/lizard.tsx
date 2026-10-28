import { createCreatureDefinition } from "./CreatureModel";

export const lizardVariants = [
  createCreatureDefinition("emerald-lizard", "Emerald Lizard", "lizard", {
    body: "#3d9b69",
    belly: "#c9e6a3",
    detail: "#254f3b",
    accent: "#6ad09a",
  }),
  createCreatureDefinition("copper-lizard", "Copper Lizard", "lizard", {
    body: "#b36b43",
    belly: "#f1d0a1",
    detail: "#54392e",
    accent: "#e2a35a",
  }),
] as const;
