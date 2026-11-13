import { createCreatureDefinition } from "./CreatureModel";

export const duckVariants = [
  createCreatureDefinition("mallard-duck", "Mallard Duck", "duck", {
    body: "#795638",
    belly: "#d7d1b4",
    detail: "#31392f",
    accent: "#e7aa3b",
  }),
  createCreatureDefinition("golden-duck", "Golden Duck", "duck", {
    body: "#f1c84f",
    belly: "#fff1bd",
    detail: "#57432a",
    accent: "#e8823d",
  }),
] as const;
