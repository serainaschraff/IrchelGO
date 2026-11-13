import { createCreatureDefinition } from "./CreatureModel";

export const catVariants = [
  createCreatureDefinition("midnight-cat", "Midnight Cat", "cat", {
    body: "#34394e",
    belly: "#b9bfd2",
    detail: "#171923",
    accent: "#7f89b2",
  }),
  createCreatureDefinition("ginger-cat", "Ginger Cat", "cat", {
    body: "#d27b3d",
    belly: "#f6dfbd",
    detail: "#513126",
    accent: "#efae62",
  }),
] as const;
