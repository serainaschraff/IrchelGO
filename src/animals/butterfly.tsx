import { createCreatureDefinition } from "./CreatureModel";

export const butterflyVariants = [
  createCreatureDefinition("alpine-blue-butterfly", "Alpine Blue", "butterfly", {
    body: "#294b70",
    belly: "#e9f2f5",
    detail: "#f6f7fa",
    accent: "#56a8df",
  }),
  createCreatureDefinition("golden-apollo-butterfly", "Golden Apollo", "butterfly", {
    body: "#754c3a",
    belly: "#fff0ce",
    detail: "#3d302a",
    accent: "#f2ae3d",
  }),
] as const;
