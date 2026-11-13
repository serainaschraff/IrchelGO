import { createCreatureDefinition } from "./CreatureModel";

export const mouseVariants = [
  createCreatureDefinition("field-mouse", "Field Mouse", "mouse", {
    body: "#8d8580",
    belly: "#e2d9d0",
    detail: "#403b3b",
    accent: "#c77f8e",
  }),
  createCreatureDefinition("moon-mouse", "Moon Mouse", "mouse", {
    body: "#b9c9d7",
    belly: "#f4f6f7",
    detail: "#46505d",
    accent: "#e3a8c8",
  }),
] as const;
