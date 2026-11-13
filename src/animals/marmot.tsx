import { createCreatureDefinition } from "./CreatureModel";

export const marmotVariants = [
  createCreatureDefinition("alpine-marmot", "Alpine Marmot", "marmot", {
    body: "#9b7354",
    belly: "#e7d0ac",
    detail: "#45352d",
    accent: "#bc946a",
  }),
  createCreatureDefinition("golden-marmot", "Golden Marmot", "marmot", {
    body: "#c99a45",
    belly: "#fff0c8",
    detail: "#5b4227",
    accent: "#f0c767",
  }),
] as const;
