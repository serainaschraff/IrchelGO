import { createCreatureDefinition } from "./CreatureModel";

export const crowVariants = [
  createCreatureDefinition("raven-crow", "Raven Crow", "crow", {
    body: "#222a36",
    belly: "#596477",
    detail: "#121820",
    accent: "#303947",
  }),
  createCreatureDefinition("silver-crow", "Silver Crow", "crow", {
    body: "#8996a6",
    belly: "#e5e9ec",
    detail: "#384655",
    accent: "#64758b",
  }),
] as const;
