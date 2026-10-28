import { createCreatureDefinition } from "./CreatureModel";

export const wolfVariants = [
  createCreatureDefinition("moon-wolf", "Moon Wolf", "wolf", {
    body: "#65758b",
    belly: "#d9dce6",
    detail: "#303747",
    accent: "#8fc7df",
  }),
  createCreatureDefinition("timber-wolf", "Timber Wolf", "wolf", {
    body: "#82624a",
    belly: "#dfc8a9",
    detail: "#40342c",
    accent: "#b58b63",
  }),
] as const;
