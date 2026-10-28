import { createCreatureDefinition } from "./CreatureModel";

export const dwarfVariants = [
  createCreatureDefinition("mountain-dwarf", "Mountain Dwarf", "dwarf", {
    body: "#4b754b",
    belly: "#d7bd93",
    detail: "#574035",
    accent: "#9b493b",
  }),
  createCreatureDefinition("crystal-dwarf", "Crystal Dwarf", "dwarf", {
    body: "#557a9b",
    belly: "#e5ded2",
    detail: "#354252",
    accent: "#9e77c5",
  }),
] as const;
