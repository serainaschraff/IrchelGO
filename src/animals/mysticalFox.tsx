import FoxModel, { createFoxModel, type FoxPalette } from "./FoxModel";
import type { AnimalDefinition, AnimalModelProps } from "./types";

const palette: FoxPalette = {
  fur: "#c96d32",
  cream: "#f5e5ca",
  cocoa: "#392b2b",
  earPink: "#db8190",
  gold: "#ffc04c",
  magicTeal: "#46d5cf",
};

function MysticalFoxModel(props: AnimalModelProps) {
  return <FoxModel {...props} palette={palette} />;
}

export const mysticalFox: AnimalDefinition = {
  id: "mystical-fox",
  name: "Mystical Fox",
  WebXRModel: MysticalFoxModel,
  createWorldModel: () => createFoxModel(palette),
};
