import { createCreatureDefinition } from "./CreatureModel";

export const minkVariants = [
  createCreatureDefinition("river-mink", "River Mink", "mink", {
    body: "#423a34",
    belly: "#8c7968",
    detail: "#201a17",
    accent: "#6d5947",
  }),
  createCreatureDefinition("shadow-mink", "Shadow Mink", "mink", {
    body: "#272a31",
    belly: "#727984",
    detail: "#111318",
    accent: "#4b5360",
  }),
] as const;
