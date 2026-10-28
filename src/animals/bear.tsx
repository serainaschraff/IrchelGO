import { createCreatureDefinition } from "./CreatureModel";

export const bearVariants = [
  createCreatureDefinition("chestnut-bear", "Chestnut Bear", "bear", {
    body: "#81543d",
    belly: "#d6b895",
    detail: "#372b26",
    accent: "#a8744c",
  }),
  createCreatureDefinition("glacier-bear", "Glacier Bear", "bear", {
    body: "#d6e1e4",
    belly: "#ffffff",
    detail: "#475a68",
    accent: "#8bc4d8",
  }),
] as const;
