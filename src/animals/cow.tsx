import { createCreatureDefinition } from "./CreatureModel";

export const cowVariants = [
  createCreatureDefinition("edelweiss-cow", "Edelweiss Cow", "cow", {
    body: "#f5f0e2",
    belly: "#ffffff",
    detail: "#48413a",
    accent: "#d5b16b",
  }),
  createCreatureDefinition("midnight-cow", "Midnight Cow", "cow", {
    body: "#38475e",
    belly: "#bac7d0",
    detail: "#242c38",
    accent: "#8fc4cf",
  }),
] as const;
