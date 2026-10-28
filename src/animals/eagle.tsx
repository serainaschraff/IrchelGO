import { createCreatureDefinition } from "./CreatureModel";

export const eagleVariants = [
  createCreatureDefinition("golden-eagle", "Golden Eagle", "eagle", {
    body: "#75523b",
    belly: "#d5bb94",
    detail: "#302a27",
    accent: "#e0ad3f",
  }),
  createCreatureDefinition("snowpeak-eagle", "Snowpeak Eagle", "eagle", {
    body: "#647c91",
    belly: "#ecf2f5",
    detail: "#303e4d",
    accent: "#8bc9df",
  }),
] as const;
