// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LocationNotFound from "../../src/components/LocationNotFound";

describe("LocationNotFound", () => {
  it("shows the location warning and an accessible crossed-out location icon", () => {
    render(<LocationNotFound />);

    expect(
      screen.getByRole("region", { name: "Location access is unavailable" }),
    ).toBeTruthy();
    expect(screen.getByText("Location not found!")).toBeTruthy();
    expect(
      screen.getByText("Allow location access for the full experience."),
    ).toBeTruthy();
    expect(screen.getByRole("img", { name: "Location disabled" })).toBeTruthy();
  });
});
