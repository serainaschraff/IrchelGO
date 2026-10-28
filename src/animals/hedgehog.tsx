import { createCreatureDefinition } from "./CreatureModel";

export const hedgehogVariants = [
  createCreatureDefinition("bramble-hedgehog", "Bramble Hedgehog", "hedgehog", {
    body: "#94704e",
    belly: "#edd5ae",
    detail: "#44352d",
    accent: "#5b4739",
  }),
  createCreatureDefinition("moonlit-hedgehog", "Moonlit Hedgehog", "hedgehog", {
    body: "#8797a6",
    belly: "#edf0ed",
    detail: "#39444d",
    accent: "#63758d",
  }),
] as const;
