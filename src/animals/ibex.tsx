import { createCreatureDefinition } from "./CreatureModel";

export const ibexVariants = [
  createCreatureDefinition("alpine-ibex", "Alpine Ibex", "ibex", {
    body: "#9b6845",
    belly: "#e5cda9",
    detail: "#49382d",
    accent: "#d1a66e",
  }),
  createCreatureDefinition("glacier-ibex", "Glacier Ibex", "ibex", {
    body: "#7895a5",
    belly: "#dce9e8",
    detail: "#354956",
    accent: "#94d5dc",
  }),
] as const;
