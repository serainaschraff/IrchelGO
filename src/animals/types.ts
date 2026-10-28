import type { ComponentType } from "react";
import type { Group } from "three";

export type AnimalId = string;

export type AnimalModelProps = {
  position: [number, number, number];
  rotation: [number, number, number];
};

export type AnimalDefinition = {
  id: AnimalId;
  name: string;
  WebXRModel: ComponentType<AnimalModelProps>;
  createWorldModel: () => Group;
};
