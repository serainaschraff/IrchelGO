export type ARStartMode = "webxr" | "eightwall";

export type AppFlags = {
  debug: boolean;
  forceEightWall: boolean;
  game: boolean;
  swissMap: boolean;
  outside: boolean;
  animalGallery: boolean;
};

export function getAppFlags(search: string): AppFlags {
  const parameters = new URLSearchParams(search);
  return {
    debug: parameters.get("debug") === "1",
    forceEightWall: parameters.get("force8thwall") === "1",
    game: parameters.get("game") === "1",
    swissMap: parameters.get("ch") === "1",
    outside: parameters.get("outside") === "1",
    animalGallery: parameters.get("animal") === "1",
  };
}

export function getAnimalAreaMapFile(swissMap: boolean): string {
  return swissMap ? "animal-areas.geojson" : "irchel.geojson";
}

export function getARStartMode(
  forceEightWall: boolean,
  webXRSupported: boolean | null,
): ARStartMode | null {
  if (forceEightWall) return "eightwall";
  if (webXRSupported === null) return null;
  return webXRSupported ? "webxr" : "eightwall";
}
