import { createCreatureDefinition } from "./CreatureModel";

export const lionVariants = [
  createCreatureDefinition("suncrest-lion", "Suncrest Lion", "lion", {
    body: "#c99143",
    belly: "#f0d7a4",
    detail: "#60402a",
    accent: "#a85d32",
  }),
  createCreatureDefinition("embermane-lion", "Embermane Lion", "lion", {
    body: "#a94e37",
    belly: "#f0bb78",
    detail: "#442b2b",
    accent: "#e18b3b",
  }),
] as const;
