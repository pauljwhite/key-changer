import { describe, expect, it } from "vitest";
import { parseChordSymbol, pitchClass } from "./chords";
import { generateProgressions } from "./generator";
import { ALL_CHORDS } from "./library";

describe("generateProgressions", () => {
  it("builds a real C-major to G-major modulation with an establishing cadence", () => {
    const results = generateProgressions({
      sourceKey: "C major",
      start: "C",
      destinationKey: "G major",
      end: "G",
      gapLength: 2,
      style: "smooth",
      difficulty: "rich",
    });

    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.length).toBeLessThanOrEqual(3);
    expect(results.some((result) => result.method === "Pivot chord")).toBe(true);
    expect(new Set(results.map((result) => result.chords.map((chord) => chord.symbol).join("|"))).size).toBe(results.length);
    results.forEach((result) => {
      expect(result.sourceKey.label).toBe("C major");
      expect(result.destinationKey.label).toBe("G major");
      expect(result.chords).toHaveLength(4);
      expect(result.chords[0].symbol).toBe("C");
      expect(result.chords.at(-2)?.symbol).toBe("D7");
      expect(result.chords.at(-1)?.symbol).toBe("G");
      expect(result.romanNumerals).toHaveLength(result.chords.length);
    });
  });

  it("cadences into the new tonic before a non-tonic landing chord", () => {
    const results = generateProgressions({
      sourceKey: "C major",
      start: "C",
      destinationKey: "G major",
      end: "Em",
      gapLength: 3,
      style: "smooth",
      difficulty: "rich",
    });
    results.forEach((result) => {
      expect(result.chords.slice(-3).map((chord) => chord.symbol)).toEqual(["D7", "G", "Em"]);
    });
  });

  it("rejects routes whose selected chords do not belong to their keys", () => {
    expect(() => generateProgressions({
      sourceKey: "C major",
      start: "F#",
      destinationKey: "G major",
      end: "G",
      gapLength: 2,
      style: "smooth",
      difficulty: "easy",
    })).toThrow(/does not belong clearly/i);
  });

  it("requires an actual change of key", () => {
    expect(() => generateProgressions({
      sourceKey: "C major",
      start: "C",
      destinationKey: "C major",
      end: "C",
      gapLength: 2,
      style: "smooth",
      difficulty: "easy",
    })).toThrow(/different destination key/i);
  });

  it("keeps easy bridges free of extended and fully diminished shapes", () => {
    const results = generateProgressions({
      sourceKey: "C major",
      start: "C",
      destinationKey: "G major",
      end: "G",
      gapLength: 4,
      style: "cinematic",
      difficulty: "easy",
    });
    results.forEach((result) => {
      result.chords.slice(1, -1).forEach((value) => {
        expect(value.suffix).not.toMatch(/maj7|m7b5|dim7|m9/);
      });
    });
  });

  it("keeps every voiced note in range and inside the written chord", () => {
    const [result] = generateProgressions({
      sourceKey: "F major",
      start: "Fmaj7",
      destinationKey: "A major",
      end: "A",
      gapLength: 3,
      style: "soulful",
      difficulty: "rich",
    });
    for (const voicing of result.voicings) {
      const allowed = new Set(voicing.chord.notes.map(pitchClass));
      expect(Math.min(...voicing.midi)).toBeGreaterThanOrEqual(36);
      expect(Math.max(...voicing.midi)).toBeLessThanOrEqual(84);
      expect(voicing.midi.every((midi) => allowed.has(midi % 12))).toBe(true);
    }
  });

  it("covers common major and minor modulation routes", () => {
    const routes = [
      ["C major", "C", "G major", "G"],
      ["G major", "G", "Bb major", "Bb"],
      ["F major", "F", "A major", "A"],
      ["Eb major", "Eb", "C minor", "Cm"],
      ["A minor", "Am", "E major", "E"],
      ["D major", "A7", "F major", "F"],
    ] as const;
    const styles = ["smooth", "soulful", "jazzy", "cinematic"] as const;
    routes.forEach(([sourceKey, start, destinationKey, end], index) => {
      const gapLength = (index % 4) + 1;
      const results = generateProgressions({
        sourceKey,
        start,
        destinationKey,
        end,
        gapLength,
        style: styles[index % styles.length],
        difficulty: index % 2 ? "rich" : "easy",
      });
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.length).toBeLessThanOrEqual(3);
      results.forEach((result) => expect(result.chords).toHaveLength(gapLength + 2));
    });
  });
});

describe("chord picker vocabulary", () => {
  it("offers a large, parseable native-select vocabulary", () => {
    expect(ALL_CHORDS.length).toBeGreaterThan(200);
    expect(new Set(ALL_CHORDS).size).toBe(ALL_CHORDS.length);
    expect(ALL_CHORDS.every((symbol) => parseChordSymbol(symbol))).toBe(true);
  });
});
