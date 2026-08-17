import { describe, expect, it } from "vitest";
import { generateProgressions } from "../music/generator";
import { progressionToMidi } from "./midi";

describe("progressionToMidi", () => {
  it("writes a valid single-track Standard MIDI file", () => {
    const [result] = generateProgressions({
      start: "C",
      end: "Am",
      gapLength: 1,
      style: "smooth",
      difficulty: "easy",
    });
    const bytes = progressionToMidi(result, 72);
    const text = new TextDecoder().decode(bytes);
    expect(text.slice(0, 4)).toBe("MThd");
    expect(text.slice(14, 18)).toBe("MTrk");
    expect(bytes.at(-3)).toBe(0xff);
    expect(bytes.at(-2)).toBe(0x2f);
    expect(bytes.at(-1)).toBe(0x00);
  });
});
