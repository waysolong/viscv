import { describe, it, expect } from "vitest";
import { ENHANCEMENTS, createStep, defaultParams, specFor } from "./enhancements";

describe("enhancement catalog", () => {
  it("contains the full core set of operations", () => {
    const expected = [
      "brightness", "canny", "clahe", "contrast", "denoise", "gamma",
      "gaussian_blur", "grayscale", "histogram_eq", "median_blur",
      "sharpen", "threshold",
      "saturation", "white_balance", "invert", "sepia", "posterize",
      "box_blur", "bilateral", "morphology", "adaptive_threshold",
      "laplacian", "sobel", "flip",
    ];
    expect(ENHANCEMENTS.map((e) => e.type).sort()).toEqual(expected.sort());
  });

  it("provides defaults per operation", () => {
    expect(defaultParams("brightness")).toEqual({ value: 20 });
    expect(defaultParams("grayscale")).toEqual({});
    expect(defaultParams("threshold")).toMatchObject({ value: 128, otsu: true });
  });

  it("creates an enabled step with defaults", () => {
    const s = createStep("clahe");
    expect(s.enabled).toBe(true);
    expect(s.type).toBe("clahe");
    expect(s.params).toHaveProperty("clip_limit");
    expect(specFor(s.type).label).toBeTruthy();
  });
});