import { describe, expect, it } from "vitest";
import { inferKeys, parseChordSymbol } from "./chords";

describe("parseChordSymbol", () => {
  it("accepts common chord spellings and unicode accidentals", () => {
    expect(parseChordSymbol("B♭maj7")?.notes).toHaveLength(4);
    expect(parseChordSymbol("F#m7")?.tonic).toBe("F#");
    expect(parseChordSymbol("G7/B")?.bass).toBe("B");
  });

  it("rejects invalid symbols and invalid slash bass notes", () => {
    expect(parseChordSymbol("H7")).toBeNull();
    expect(parseChordSymbol("C/F#")).toBeNull();
  });
});

describe("inferKeys", () => {
  it("places a plausible home key first", () => {
    const start = parseChordSymbol("G7")!;
    const end = parseChordSymbol("C")!;
    expect(inferKeys(start, end)[0].label).toBe("C major");
  });
});
