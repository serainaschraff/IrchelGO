import { createCreatureDefinition } from "./CreatureModel";

export const foxVariants = [
  createCreatureDefinition("ember-fox", "Ember Fox", "fox", {
    body: "#c96d32",
    belly: "#f5e5ca",
    detail: "#392b2b",
    accent: "#d98648",
  }),
  createCreatureDefinition("frost-fox", "Frost Fox", "fox", {
    body: "#eaf4f8",
    belly: "#ffffff",
    detail: "#39444d",
    accent: "#a9d8e6",
  }),
] as const;
