import { createCreatureDefinition } from "./CreatureModel";

export const monkeyVariants = [
  createCreatureDefinition("canopy-monkey", "Canopy Monkey", "monkey", {
    body: "#80543d",
    belly: "#e8c99e",
    detail: "#34251f",
    accent: "#c77b54",
  }),
  createCreatureDefinition("sunset-monkey", "Sunset Monkey", "monkey", {
    body: "#bc654c",
    belly: "#f2d4b8",
    detail: "#462b2a",
    accent: "#edaa61",
  }),
] as const;
