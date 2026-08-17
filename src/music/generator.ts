import { Note } from "@tonaljs/tonal";
import {
  chordKeyFit,
  parseChordSymbol,
  pitchClass,
  resolveKey,
  samePitch,
  transposePitch,
} from "./chords";
import type {
  ChordCandidate,
  Difficulty,
  GenerateOptions,
  HarmonicStyle,
  KeyContext,
  ParsedChord,
  ProgressionResult,
} from "./types";
import { voiceProgression } from "./voicing";

const MAJOR_TRIADS = ["", "m", "m", "", "", "m", "dim"];
const MAJOR_SEVENTHS = ["maj7", "m7", "m7", "maj7", "7", "m7", "m7b5"];
const MINOR_TRIADS = ["m", "dim", "", "m", "m", "", ""];
const MINOR_SEVENTHS = ["m7", "m7b5", "maj7", "m7", "m7", "maj7", "7"];

interface ScoredPath {
  chords: ParsedChord[];
  score: number;
  colour: number;
  roles: string[];
}

const STYLE = {
  smooth: { voice: 1.35, function: 1.1, key: 1.25, colour: 0.35 },
  soulful: { voice: 1.05, function: 1.1, key: 0.8, colour: 1.05 },
  jazzy: { voice: 1.05, function: 1.35, key: 0.65, colour: 1.35 },
  cinematic: { voice: 0.9, function: 0.75, key: 0.7, colour: 1.55 },
} satisfies Record<HarmonicStyle, Record<string, number>>;

function addCandidate(
  map: Map<string, ChordCandidate>,
  symbol: string,
  roles: string[],
  key: KeyContext,
  colour: number,
) {
  const chord = parseChordSymbol(symbol);
  if (!chord) return;
  const id = chord.symbol;
  const existing = map.get(id);
  if (existing) {
    existing.roles = [...new Set([...existing.roles, ...roles])];
    existing.colour = Math.max(existing.colour, colour);
    return;
  }
  map.set(id, { chord, roles, keyFit: chordKeyFit(chord, key), colour });
}

function buildVocabulary(key: KeyContext, end: ParsedChord, difficulty: Difficulty): ChordCandidate[] {
  const map = new Map<string, ChordCandidate>();
  const scaleNotes = key.notes;
  const triads = key.mode === "major" ? MAJOR_TRIADS : MINOR_TRIADS;
  const sevenths = key.mode === "major" ? MAJOR_SEVENTHS : MINOR_SEVENTHS;

  scaleNotes.forEach((root, index) => {
    addCandidate(map, `${root}${triads[index]}`, ["diatonic"], key, 0.1);
    if (difficulty === "rich" || index === 1 || index === 4) {
      addCandidate(map, `${root}${sevenths[index]}`, ["diatonic", "seventh"], key, 0.35);
    }
  });

  // Strong approaches into the requested destination.
  const dominant = transposePitch(end.tonic, 7);
  const supertonic = transposePitch(end.tonic, 2);
  const leading = transposePitch(end.tonic, -1);
  addCandidate(map, `${dominant}7`, ["secondary-dominant", "destination-approach"], key, 0.8);
  addCandidate(map, `${supertonic}m7`, ["ii-v", "destination-approach", "seventh"], key, 0.65);
  addCandidate(map, `${leading}dim7`, ["diminished", "destination-approach"], key, 1.05);

  // Secondary dominants of diatonic chords.
  scaleNotes.forEach((target) => {
    addCandidate(map, `${transposePitch(target, 7)}7`, ["secondary-dominant"], key, 0.72);
  });

  if (key.mode === "major") {
    addCandidate(map, `${scaleNotes[3]}m`, ["borrowed", "minor-four"], key, 0.9);
    addCandidate(map, `${transposePitch(key.tonic, 3)}`, ["borrowed"], key, 0.92);
    addCandidate(map, `${transposePitch(key.tonic, 8)}maj7`, ["borrowed", "seventh"], key, 1.05);
    addCandidate(map, `${transposePitch(key.tonic, 10)}`, ["borrowed"], key, 0.85);
  } else {
    addCandidate(map, `${scaleNotes[3]}`, ["borrowed", "bright-four"], key, 0.75);
    addCandidate(map, `${transposePitch(key.tonic, 1)}maj7`, ["borrowed", "neapolitan"], key, 1.12);
  }

  // A chromatic diminished chord can join roots a semitone apart.
  scaleNotes.forEach((root) => {
    addCandidate(map, `${transposePitch(root, 1)}dim7`, ["diminished", "passing"], key, 1.0);
  });

  return [...map.values()];
}

function circularDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 12;
  return Math.min(d, 12 - d);
}

function voiceLeading(a: ParsedChord, b: ParsedChord): number {
  const from = a.notes.map(pitchClass);
  const to = b.notes.map(pitchClass);
  const forward = to.reduce((sum, pc) => sum + Math.min(...from.map((source) => circularDistance(source, pc))), 0);
  const backward = from.reduce((sum, pc) => sum + Math.min(...to.map((target) => circularDistance(pc, target))), 0);
  return (forward / to.length + backward / from.length) / 2;
}

function commonTones(a: ParsedChord, b: ParsedChord): number {
  const from = new Set(a.notes.map(pitchClass));
  return b.notes.filter((note) => from.has(pitchClass(note))).length;
}

function functionalMotion(a: ParsedChord, b: ParsedChord): number {
  const movement = (pitchClass(b.tonic) - pitchClass(a.tonic) + 12) % 12;
  if (movement === 5) return 2.2; // descending fifth / ascending fourth
  if (movement === 7) return 1.35;
  if (movement === 1 || movement === 11) return 1.45;
  if (movement === 2 || movement === 10) return 1.0;
  if (movement === 3 || movement === 4 || movement === 8 || movement === 9) return 0.65;
  return -0.2;
}

function transitionScore(
  from: ParsedChord,
  candidate: ChordCandidate,
  style: HarmonicStyle,
  difficulty: Difficulty,
): number {
  const weights = STYLE[style];
  const voice = Math.max(0, 4.5 - voiceLeading(from, candidate.chord));
  const shared = commonTones(from, candidate.chord) * 0.45;
  const functionScore = functionalMotion(from, candidate.chord);
  const complexityPenalty = difficulty === "easy" && candidate.colour > 0.8 ? 1.25 : 0;
  return (
    voice * weights.voice +
    shared +
    functionScore * weights.function +
    candidate.keyFit * 2.2 * weights.key +
    candidate.colour * weights.colour -
    complexityPenalty
  );
}

function cadenceBonus(path: ParsedChord[], end: ParsedChord): number {
  const previous = path[path.length - 2];
  const before = path[path.length - 3];
  if (!previous) return 0;
  let score = 0;
  const dominantPc = pitchClass(transposePitch(end.tonic, 7));
  const leadingPc = pitchClass(transposePitch(end.tonic, -1));
  if (pitchClass(previous.tonic) === dominantPc && previous.suffix.includes("7")) score += 5.5;
  if (pitchClass(previous.tonic) === leadingPc && previous.suffix.includes("dim")) score += 4.4;
  if (
    before &&
    pitchClass(before.tonic) === pitchClass(transposePitch(end.tonic, 2)) &&
    pitchClass(previous.tonic) === dominantPc
  ) score += 4.8;
  return score;
}

function pathId(path: ParsedChord[]): string {
  return path.map((chord) => chord.symbol).join("|");
}

function overlap(a: ScoredPath, b: ScoredPath): number {
  const aMid = new Set(a.chords.slice(1, -1).map((chord) => chord.symbol));
  const bMid = b.chords.slice(1, -1).map((chord) => chord.symbol);
  if (!bMid.length) return 0;
  return bMid.filter((symbol) => aMid.has(symbol)).length / bMid.length;
}

function explain(path: ScoredPath, key: KeyContext): string {
  const intermediates = path.chords.slice(1, -1);
  const symbols = intermediates.map((chord) => chord.symbol).join(" then ");
  if (path.roles.includes("ii-v")) return `${symbols} creates a classic ii–V pull into the destination, with close voicings to keep it under the hands.`;
  if (path.roles.includes("destination-approach") && path.roles.includes("diminished")) return `${symbols} uses leading-note tension to point directly at the destination, resolving the moving notes by small steps.`;
  if (path.roles.includes("destination-approach") && path.roles.includes("secondary-dominant")) return `${symbols} creates a strong dominant pull into the destination before settling home.`;
  if (path.roles.includes("diminished")) return `${symbols} uses diminished tension as a passing colour, resolving the moving notes by small steps.`;
  if (path.roles.includes("secondary-dominant")) return `${symbols} briefly tonicises a passing chord, adding direction without losing the final destination.`;
  if (path.roles.includes("borrowed")) return `${symbols} borrows colour from the parallel mode while common tones hold the progression together.`;
  return `${symbols} stays close to ${key.label}, favouring familiar harmony and economical movement between the voices.`;
}

function labelsFor(paths: ScoredPath[]): Array<"Gentle" | "Colourful" | "Bold"> {
  if (paths.length < 3) return ["Gentle", "Colourful", "Bold"].slice(0, paths.length) as Array<
    "Gentle" | "Colourful" | "Bold"
  >;
  const colourOrder = paths.map((path, index) => ({ index, value: path.colour })).sort((a, b) => a.value - b.value);
  const labels: Array<"Gentle" | "Colourful" | "Bold"> = ["Colourful", "Colourful", "Colourful"];
  labels[colourOrder[0].index] = "Gentle";
  labels[colourOrder[colourOrder.length - 1].index] = "Bold";
  const middle = labels.findIndex((label, index) => label === "Colourful" && index !== colourOrder[0].index);
  if (middle >= 0) labels[middle] = "Colourful";
  return labels;
}

export function generateProgressions(options: GenerateOptions): ProgressionResult[] {
  const start = parseChordSymbol(options.start);
  const end = parseChordSymbol(options.end);
  if (!start) throw new Error(`“${options.start}” is not a chord I recognise.`);
  if (!end) throw new Error(`“${options.end}” is not a chord I recognise.`);
  const gapLength = Math.max(1, Math.min(4, Math.round(options.gapLength)));
  const key = resolveKey(options.key, start, end);
  const vocabulary = buildVocabulary(key, end, options.difficulty).filter(
    (candidate) => !samePitch(candidate.chord.tonic, start.tonic) || candidate.chord.suffix !== start.suffix,
  );

  let beam: ScoredPath[] = [{ chords: [start], score: 0, colour: 0, roles: [] }];
  for (let step = 0; step < gapLength; step += 1) {
    const expanded: ScoredPath[] = [];
    for (const state of beam) {
      const previous = state.chords[state.chords.length - 1];
      for (const candidate of vocabulary) {
        if (candidate.chord.symbol === previous.symbol) continue;
        if (state.chords.slice(-2).some((chord) => chord.symbol === candidate.chord.symbol)) continue;
        const score = transitionScore(previous, candidate, options.style, options.difficulty);
        expanded.push({
          chords: [...state.chords, candidate.chord],
          score: state.score + score,
          colour: state.colour + candidate.colour,
          roles: [...new Set([...state.roles, ...candidate.roles])],
        });
      }
    }
    beam = expanded.sort((a, b) => b.score - a.score).slice(0, 600);
  }

  const finished = beam
    .map((state) => {
      const endCandidate: ChordCandidate = { chord: end, roles: [], keyFit: chordKeyFit(end, key), colour: 0 };
      const chords = [...state.chords, end];
      return {
        ...state,
        chords,
        score:
          state.score +
          transitionScore(state.chords[state.chords.length - 1], endCandidate, options.style, options.difficulty) +
          cadenceBonus(chords, end),
      };
    })
    .sort((a, b) => b.score - a.score);

  const selected: ScoredPath[] = [];
  for (const path of finished) {
    if (selected.some((picked) => pathId(picked.chords) === pathId(path.chords))) continue;
    if (selected.length && Math.max(...selected.map((picked) => overlap(picked, path))) > 0.72) continue;
    selected.push(path);
    if (selected.length === 3) break;
  }
  while (selected.length < 3 && finished[selected.length]) selected.push(finished[selected.length]);

  const labels = labelsFor(selected);
  return selected.map((path, index) => ({
    id: `${index}-${pathId(path.chords)}`,
    label: labels[index],
    chords: path.chords,
    voicings: voiceProgression(path.chords),
    score: path.score,
    colour: path.colour,
    explanation: explain(path, key),
    key,
  }));
}

export function availableKeys(): string[] {
  const roots = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  return roots.flatMap((root) => [`${root} major`, `${root} minor`]);
}

export function prettyNote(note: string): string {
  return Note.simplify(note).replace("b", "♭").replace("#", "♯");
}
