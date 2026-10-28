import FoxModel, { createFoxModel, type FoxPalette } from "./FoxModel";
import type { AnimalDefinition, AnimalModelProps } from "./types";

const palette: FoxPalette = {
  fur: "#eaf4f8",
  cream: "#ffffff",
  cocoa: "#392b2b",
  earPink: "#a9d8e6",
  gold: "#8ed9eb",
  magicTeal: "#55c7e8",
};

function PolarFoxModel(props: AnimalModelProps) {
  return <FoxModel {...props} palette={palette} />;
}

export const polarFox: AnimalDefinition = {
  id: "polar-fox",
  name: "Polar Fox",
  WebXRModel: PolarFoxModel,
  createWorldModel: () => createFoxModel(palette),
};
