import { describe, expect, it } from "vitest";
import { summarizeDebugEvents } from "../../src/utils/debugLog";

describe("summarizeDebugEvents", () => {
  it("groups repeated no-hit samples and summarizes their timestamp range", () => {
    const events = [
      "[11:09:33] WebXR: session started.",
      "[11:09:34] WebXR hit-test: hits=0, usablePoses=0, horizontalCandidates=0, status=No plane hits yet. Slowly scan the area and point the camera toward the floor., viewer=(0.00,0.00,0.00), candidates=[]",
      "[11:09:35] WebXR hit-test: hits=0, usablePoses=0, horizontalCandidates=0, status=No plane hits yet. Slowly scan the area and point the camera toward the floor., viewer=(0.11,1.21,0.02), candidates=[]",
      "[11:09:36] WebXR hit-test: hits=0, usablePoses=0, horizontalCandidates=0, status=No plane hits yet. Slowly scan the area and point the camera toward the floor., viewer=(0.20,1.50,0.08), candidates=[]",
      "[11:09:47] WebXR hit-test: hits=1, usablePoses=1, horizontalCandidates=1, status=Animal placed on a detected horizontal surface., viewer=(0.04,1.46,-0.01), candidates=[d=1.59m upY=1.00 at=(0.20,1.09,-1.55) horizontal]",
    ];

    expect(summarizeDebugEvents(events)).toEqual([
      events[0],
      "[11:09:34–11:09:36] WebXR hit-test repeated 3×: hits=0, usablePoses=0, horizontalCandidates=0, status=No plane hits yet. Slowly scan the area and point the camera toward the floor.",
      events[4],
    ]);
  });

  it("does not merge separate runs or samples with different statuses", () => {
    const events = [
      "[10:00:00] WebXR hit-test: hits=0, usablePoses=0, horizontalCandidates=0, status=No plane hits yet., viewer=(0,0,0), candidates=[]",
      "[10:00:01] WebXR hit-test: hits=1, usablePoses=1, horizontalCandidates=0, status=A surface was tilted., viewer=(0,0,0), candidates=[]",
      "[10:00:02] WebXR hit-test: hits=0, usablePoses=0, horizontalCandidates=0, status=No plane hits yet., viewer=(0,0,0), candidates=[]",
    ];

    expect(summarizeDebugEvents(events)).toEqual(events);
  });

  it("returns an empty summary for an empty log", () => {
    expect(summarizeDebugEvents([])).toEqual([]);
  });
});
