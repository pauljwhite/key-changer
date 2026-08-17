import { describe, expect, it } from "vitest";
import { generateProgressions } from "./generator";
import { pitchClass } from "./chords";

describe("generateProgressions", () => {
  it("returns three distinct paths with exact endpoints and gap count", () => {
    const results = generateProgressions({
      start: "C",
      end: "Am",
      gapLength: 2,
      style: "smooth",
      difficulty: "rich",
    });

    expect(results).toHaveLength(3);
    expect(new Set(results.map((result) => result.chords.map((chord) => chord.symbol).join("|"))).size).toBe(3);
    for (const result of results) {
      expect(result.chords).toHaveLength(4);
      expect(result.chords[0].symbol).toBe("C");
      expect(result.chords.at(-1)?.symbol).toBe("Am");
      expect(result.voicings).toHaveLength(result.chords.length);
    }
  });

  it("supports altered and seventh-chord destinations", () => {
    const results = generateProgressions({
      start: "Dbmaj7",
      end: "F#m7",
      gapLength: 3,
      style: "jazzy",
      difficulty: "rich",
    });
    expect(results).toHaveLength(3);
    expect(results[0].chords.at(-1)?.symbol).toBe("F#m7");
  });

  it("keeps every voiced note in range and inside the written chord", () => {
    const [result] = generateProgressions({
      start: "Fmaj7",
      end: "Dm7",
      gapLength: 2,
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

  it("throws a useful error for an unknown chord", () => {
    expect(() =>
      generateProgressions({ start: "Nope", end: "C", gapLength: 1, style: "smooth", difficulty: "easy" }),
    ).toThrow(/not a chord/i);
  });

  it("covers a matrix of common chord families, styles and path lengths", () => {
    const pairs = [
      ["C", "G"],
      ["Cm", "Ab"],
      ["Bbmaj7", "Gm7"],
      ["F#m7", "B7"],
      ["Eb", "C7"],
      ["A7", "Dm"],
    ] as const;
    const styles = ["smooth", "soulful", "jazzy", "cinematic"] as const;
    pairs.forEach(([start, end], pairIndex) => {
      const gapLength = (pairIndex % 4) + 1;
      const results = generateProgressions({
        start,
        end,
        gapLength,
        style: styles[pairIndex % styles.length],
        difficulty: pairIndex % 2 ? "rich" : "easy",
      });
      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.chords).toHaveLength(gapLength + 2);
        expect(result.voicings.every((voicing) => voicing.midi.length >= 3)).toBe(true);
      });
    });
  });
});
