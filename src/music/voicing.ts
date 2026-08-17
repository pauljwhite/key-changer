import { Note } from "@tonaljs/tonal";
import { pitchClass } from "./chords";
import type { ParsedChord, VoicedChord } from "./types";

const MIN_MIDI = 36;
const MAX_MIDI = 84;

export function midiToName(midi: number): string {
  return Note.fromMidi(midi) || `MIDI ${midi}`;
}

function nearestMidi(pc: number, target: number): number {
  let candidate = target + ((pc - (target % 12) + 12) % 12);
  if (candidate - target > 6) candidate -= 12;
  while (candidate < MIN_MIDI) candidate += 12;
  while (candidate > MAX_MIDI) candidate -= 12;
  return candidate;
}

function candidates(chord: ParsedChord): number[][] {
  const pcs = chord.notes.map(pitchClass);
  const bassPc = pitchClass(chord.bass || chord.tonic);
  const output: number[][] = [];

  for (let inversion = 0; inversion < pcs.length; inversion += 1) {
    for (const centre of [58, 62, 66]) {
      const ordered = [...pcs.slice(inversion), ...pcs.slice(0, inversion)];
      const right: number[] = [];
      let cursor = centre;
      for (const pc of ordered) {
        let note = cursor + ((pc - (cursor % 12) + 12) % 12);
        if (right.length && note <= right[right.length - 1]) note += 12;
        right.push(note);
        cursor = note + 1;
      }
      while (right[right.length - 1] > 81) right.forEach((_, i) => (right[i] -= 12));

      let bass = nearestMidi(bassPc, 45);
      while (bass >= right[0] - 5) bass -= 12;
      if (bass < MIN_MIDI) bass += 12;
      const voiced = [...new Set([bass, ...right])].sort((a, b) => a - b);
      if (voiced[0] >= MIN_MIDI && voiced[voiced.length - 1] <= MAX_MIDI) output.push(voiced);
    }
  }

  return output;
}

function distance(a: number[], b: number[]): number {
  const upperA = a.slice(1);
  const upperB = b.slice(1);
  const upperCost = upperB.reduce((sum, note, index) => {
    const source = upperA[Math.min(index, upperA.length - 1)] ?? a[0];
    return sum + Math.abs(note - source);
  }, 0);
  return Math.abs(a[0] - b[0]) * 0.45 + upperCost;
}

function staticScore(notes: number[]): number {
  const centre = notes.slice(1).reduce((sum, note) => sum + note, 0) / Math.max(1, notes.length - 1);
  const span = notes[notes.length - 1] - notes[1];
  return Math.abs(centre - 65) + Math.max(0, span - 19) * 0.8;
}

export function voiceProgression(chords: ParsedChord[]): VoicedChord[] {
  const voiced: VoicedChord[] = [];
  let previous: number[] | null = null;

  for (const chord of chords) {
    const options = candidates(chord);
    const selected = options.sort((a, b) => {
      const scoreA = previous ? distance(previous, a) : staticScore(a);
      const scoreB = previous ? distance(previous, b) : staticScore(b);
      return scoreA - scoreB;
    })[0];
    previous = selected;
    voiced.push({ chord, midi: selected, noteNames: selected.map(midiToName) });
  }
  return voiced;
}
