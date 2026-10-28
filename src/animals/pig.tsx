import { createCreatureDefinition } from "./CreatureModel";

export const pigVariants = [
  createCreatureDefinition("rosewood-pig", "Rosewood Pig", "pig", {
    body: "#c87882",
    belly: "#f5d6cd",
    detail: "#6b3d47",
    accent: "#e99b9c",
  }),
  createCreatureDefinition("meadow-pig", "Meadow Pig", "pig", {
    body: "#a77a57",
    belly: "#f1dfbd",
    detail: "#594331",
    accent: "#d8aa6d",
  }),
] as const;
