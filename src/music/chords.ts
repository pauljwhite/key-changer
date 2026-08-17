import { Chord, Note, Scale } from "@tonaljs/tonal";
import type { KeyContext, ParsedChord } from "./types";

const PITCHES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

export const pitchClass = (note: string): number => {
  const chroma = Note.chroma(note);
  return chroma == null ? -1 : chroma;
};

export const normaliseAccidentals = (value: string) =>
  value
    .trim()
    .replaceAll("♭", "b")
    .replaceAll("♯", "#")
    .replaceAll("∆", "maj")
    .replaceAll("−", "m")
    .replaceAll("°", "dim")
    .replaceAll("ø", "m7b5")
    .replace(/\s+/g, "");

export function parseChordSymbol(value: string): ParsedChord | null {
  const input = normaliseAccidentals(value);
  if (!input) return null;

  const [body, rawBass] = input.split("/");
  const match = body.match(/^([A-Ga-g])([#b]?)(.*)$/);
  if (!match) return null;

  const tonic = `${match[1].toUpperCase()}${match[2]}`;
  let suffix = match[3] || "";
  if (suffix === "min") suffix = "m";
  if (suffix === "major") suffix = "";
  if (suffix === "minor") suffix = "m";

  const chord = Chord.get(`${tonic}${suffix}`);
  if (chord.empty || !chord.tonic || chord.notes.length < 2) return null;

  let bass: string | undefined;
  if (rawBass) {
    const parsedBass = Note.pitchClass(rawBass);
    if (!parsedBass || !chord.notes.some((note) => pitchClass(note) === pitchClass(parsedBass))) return null;
    bass = parsedBass;
  }

  const displaySuffix = suffix
    .replace(/^maj7$/, "maj7")
    .replace(/^dim7$/, "dim7");

  return {
    input: value,
    symbol: `${chord.tonic}${displaySuffix}${bass ? `/${bass}` : ""}`,
    tonic: chord.tonic,
    suffix: displaySuffix,
    notes: chord.notes,
    intervals: chord.intervals,
    quality: chord.quality || "Unknown",
    bass,
  };
}

export function transposePitch(note: string, semitones: number): string {
  const chroma = pitchClass(note);
  return PITCHES[(chroma + semitones + 120) % 12];
}

function fitScore(chord: ParsedChord, scaleNotes: string[]): number {
  const scale = new Set(scaleNotes.map(pitchClass));
  return chord.notes.filter((note) => scale.has(pitchClass(note))).length / chord.notes.length;
}

export function inferKeys(start: ParsedChord, end: ParsedChord): KeyContext[] {
  const results: KeyContext[] = [];

  for (const tonic of PITCHES) {
    for (const mode of ["major", "minor"] as const) {
      const scale = Scale.get(`${tonic} ${mode}`);
      if (scale.empty) continue;
      let score = fitScore(start, scale.notes) * 3 + fitScore(end, scale.notes) * 4;
      if (pitchClass(end.tonic) === pitchClass(tonic)) score += 2.2;
      if (pitchClass(start.tonic) === pitchClass(tonic)) score += 1.2;
      if (mode === "major" && end.quality === "Major") score += 0.25;
      if (mode === "minor" && end.quality === "Minor") score += 0.45;
      results.push({ tonic, mode, label: `${tonic} ${mode}`, notes: scale.notes, score });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

export function resolveKey(key: string | undefined, start: ParsedChord, end: ParsedChord): KeyContext {
  if (!key || key === "auto") return inferKeys(start, end)[0];
  const match = key.match(/^([A-G](?:#|b)?)\s+(major|minor)$/i);
  if (!match) return inferKeys(start, end)[0];
  const tonic = Note.pitchClass(match[1]) || match[1];
  const mode = match[2].toLowerCase() as "major" | "minor";
  const notes = Scale.get(`${tonic} ${mode}`).notes;
  return { tonic, mode, label: `${tonic} ${mode}`, notes, score: 0 };
}

export function chordKeyFit(chord: ParsedChord, key: KeyContext): number {
  return fitScore(chord, key.notes);
}

export function samePitch(a: string, b: string): boolean {
  return pitchClass(a) === pitchClass(b);
}
