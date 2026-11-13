import { createCreatureDefinition } from "./CreatureModel";

export const fishVariants = [
  createCreatureDefinition("river-fish", "River Fish", "fish", {
    body: "#4b9da7",
    belly: "#d8f0df",
    detail: "#183f50",
    accent: "#e18b4d",
  }),
  createCreatureDefinition("sunlit-fish", "Sunlit Fish", "fish", {
    body: "#efad45",
    belly: "#fff1bd",
    detail: "#543b2b",
    accent: "#ef6f64",
  }),
] as const;
