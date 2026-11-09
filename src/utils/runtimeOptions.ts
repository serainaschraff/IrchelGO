export type ARStartMode = "webxr" | "eightwall";

export function getARStartMode(
  forceEightWall: boolean,
  webXRSupported: boolean | null,
): ARStartMode | null {
  if (forceEightWall) return "eightwall";
  if (webXRSupported === null) return null;
  return webXRSupported ? "webxr" : "eightwall";
}
