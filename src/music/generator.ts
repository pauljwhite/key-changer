import { Note, Scale } from "@tonaljs/tonal";
import { chordKeyFit, parseChordSymbol, pitchClass } from "./chords";
import type {
  Difficulty,
  GenerateOptions,
  HarmonicStyle,
  KeyContext,
  ModulationMethod,
  ParsedChord,
  ProgressionResult,
} from "./types";
import { voiceProgression } from "./voicing";

type ResultLabel = "Gentle" | "Colourful" | "Bold";

interface ChordStep {
  chord: ParsedChord;
  role: string;
}

interface ModulationCandidate {
  id: string;
  name: string;
  method: ModulationMethod;
  label: ResultLabel;
  colour: number;
  strength: number;
  styles: HarmonicStyle[];
  middle: ChordStep[];
  explanation: string;
}

interface RankedCandidate extends ModulationCandidate {
  chords: ParsedChord[];
  score: number;
  entryScore: number;
}

const MAJOR_TRIADS = ["", "m", "m", "", "", "m", "dim"];
const MINOR_TRIADS = ["m", "dim", "", "m", "m", "", ""];

function parseKeyLabel(value: string): KeyContext | null {
  const match = value.match(/^([A-G](?:#|b)?)\s+(major|minor)$/i);
  if (!match) return null;
  const tonic = Note.pitchClass(match[1]);
  const mode = match[2].toLowerCase() as "major" | "minor";
  if (!tonic) return null;
  const scale = Scale.get(`${tonic} ${mode}`);
  if (scale.empty) return null;
  return { tonic, mode, label: `${tonic} ${mode}`, notes: scale.notes, score: 0 };
}

function makeChord(root: string, suffix = ""): ParsedChord {
  const parsed = parseChordSymbol(`${root}${suffix}`);
  if (!parsed) throw new Error(`Could not build ${root}${suffix}.`);
  return parsed;
}

function relativeRoot(key: KeyContext, interval: string): string {
  return Note.transpose(key.tonic, interval);
}

function degreeChord(key: KeyContext, degree: "tonic" | "ii" | "iii" | "IV" | "vi", difficulty: Difficulty): ChordStep {
  const rich = difficulty === "rich";
  if (degree === "tonic") {
    return { chord: makeChord(key.tonic, key.mode === "minor" ? "m" : ""), role: `${key.mode === "minor" ? "i" : "I"} · ${shortKey(key)}` };
  }
  if (degree === "ii") {
    const suffix = key.mode === "major" ? (rich ? "m7" : "m") : (rich ? "m7b5" : "dim");
    return { chord: makeChord(relativeRoot(key, "2M"), suffix), role: `${key.mode === "major" ? "ii" : "iiø"}${rich ? "7" : ""} · ${shortKey(key)}` };
  }
  if (degree === "iii") {
    const suffix = key.mode === "major" ? (rich ? "m7" : "m") : (rich ? "maj7" : "");
    const numeral = key.mode === "major" ? `iii${rich ? "7" : ""}` : `♭III${rich ? "maj7" : ""}`;
    return { chord: makeChord(relativeRoot(key, key.mode === "major" ? "3M" : "3m"), suffix), role: `${numeral} · ${shortKey(key)}` };
  }
  if (degree === "IV") {
    const suffix = key.mode === "major" ? (rich ? "maj7" : "") : (rich ? "m7" : "m");
    const numeral = key.mode === "major" ? `IV${rich ? "maj7" : ""}` : `iv${rich ? "7" : ""}`;
    return { chord: makeChord(relativeRoot(key, "4P"), suffix), role: `${numeral} · ${shortKey(key)}` };
  }
  const suffix = key.mode === "major" ? (rich ? "m7" : "m") : (rich ? "maj7" : "");
  const numeral = key.mode === "major" ? `vi${rich ? "7" : ""}` : `♭VI${rich ? "maj7" : ""}`;
  return { chord: makeChord(relativeRoot(key, key.mode === "major" ? "6M" : "6m"), suffix), role: `${numeral} · ${shortKey(key)}` };
}

function dominantStep(key: KeyContext): ChordStep {
  return { chord: makeChord(relativeRoot(key, "5P"), "7"), role: `V7 · ${shortKey(key)}` };
}

function leadingStep(key: KeyContext, difficulty: Difficulty): ChordStep {
  return {
    chord: makeChord(relativeRoot(key, "7M"), difficulty === "rich" ? "dim7" : "dim"),
    role: `vii°${difficulty === "rich" ? "7" : ""} · ${shortKey(key)}`,
  };
}

function borrowedStep(key: KeyContext, degree: "bIII" | "bVI", difficulty: Difficulty): ChordStep {
  const interval = degree === "bIII" ? "3m" : "6m";
  return {
    chord: makeChord(relativeRoot(key, interval), difficulty === "rich" ? "maj7" : ""),
    role: `${degree === "bIII" ? "♭III" : "♭VI"}${difficulty === "rich" ? "maj7" : ""} · ${shortKey(key)}`,
  };
}

function chromaticDiminishedStep(key: KeyContext, difficulty: Difficulty): ChordStep {
  return {
    chord: makeChord(relativeRoot(key, "4A"), difficulty === "rich" ? "dim7" : "dim"),
    role: `♯iv°${difficulty === "rich" ? "7" : ""} · ${shortKey(key)}`,
  };
}

function parallelMinorTwoStep(key: KeyContext, difficulty: Difficulty): ChordStep {
  return {
    chord: makeChord(relativeRoot(key, "2M"), difficulty === "rich" ? "m7b5" : "dim"),
    role: `iiø${difficulty === "rich" ? "7" : ""} · ${shortKey(key)}`,
  };
}

function secondaryDominantStep(key: KeyContext, target: "V" | "ii" | "vi"): ChordStep {
  const intervals = { V: "2M", ii: "6M", vi: "3M" } as const;
  return {
    chord: makeChord(relativeRoot(key, intervals[target]), "7"),
    role: `V7/${target} · ${shortKey(key)}`,
  };
}

function shortKey(key: KeyContext): string {
  return `${key.tonic} ${key.mode === "major" ? "maj" : "min"}`;
}

function circularDistance(a: number, b: number): number {
  const distance = Math.abs(a - b) % 12;
  return Math.min(distance, 12 - distance);
}

function commonToneCount(from: ParsedChord, to: ParsedChord): number {
  const source = new Set(from.notes.map(pitchClass));
  return to.notes.filter((note) => source.has(pitchClass(note))).length;
}

function voiceLeadingDistance(from: ParsedChord, to: ParsedChord): number {
  const source = from.notes.map(pitchClass);
  return to.notes.reduce(
    (sum, note) => sum + Math.min(...source.map((value) => circularDistance(value, pitchClass(note)))),
    0,
  ) / to.notes.length;
}

function rootMotionScore(from: ParsedChord, to: ParsedChord): number {
  const movement = (pitchClass(to.tonic) - pitchClass(from.tonic) + 12) % 12;
  if (movement === 5) return 2.4;
  if (movement === 7) return 2.0;
  if (movement === 1 || movement === 11) return 1.9;
  if (movement === 2 || movement === 10) return 1.35;
  if ([3, 4, 8, 9].includes(movement)) return 0.65;
  if (movement === 6) return -1.4;
  return -1.8;
}

function scoreEntry(from: ParsedChord, to: ParsedChord): number {
  return 3 + rootMotionScore(from, to) + commonToneCount(from, to) * 0.9 + Math.max(0, 2.5 - voiceLeadingDistance(from, to));
}

function chordIdentity(chord: ParsedChord): string {
  return chord.notes.map(pitchClass).sort((a, b) => a - b).join("-");
}

function diatonicTriads(key: KeyContext): ParsedChord[] {
  const suffixes = key.mode === "major" ? MAJOR_TRIADS : MINOR_TRIADS;
  return key.notes.map((root, index) => makeChord(root, suffixes[index]));
}

function commonPivots(source: KeyContext, destination: KeyContext, start: ParsedChord, end: ParsedChord): ParsedChord[] {
  const destinationMap = new Map(diatonicTriads(destination).map((chord) => [chordIdentity(chord), chord]));
  const destinationDominant = dominantStep(destination).chord;
  return diatonicTriads(source)
    .filter((chord) => destinationMap.has(chordIdentity(chord)))
    .filter((chord) => chord.symbol !== start.symbol && chord.symbol !== end.symbol)
    .sort((a, b) => (scoreEntry(start, b) + rootMotionScore(b, destinationDominant) * 1.8) - (scoreEntry(start, a) + rootMotionScore(a, destinationDominant) * 1.8));
}

function romanInKey(chord: ParsedChord, key: KeyContext): string {
  const relative = (pitchClass(chord.tonic) - pitchClass(key.tonic) + 12) % 12;
  const degrees = ["I", "♭II", "II", "♭III", "III", "IV", "♯IV", "V", "♭VI", "VI", "♭VII", "VII"];
  let degree = degrees[relative];
  if (chord.quality === "Minor" || /^m(?!aj)/.test(chord.suffix)) degree = degree.toLowerCase();
  if (chord.suffix.includes("m7b5")) return `${degree.toLowerCase()}ø7`;
  if (chord.suffix.includes("dim")) return `${degree.toLowerCase()}°${chord.suffix.includes("7") ? "7" : ""}`;
  if (chord.suffix.includes("maj7")) return `${degree}maj7`;
  if (chord.suffix.includes("7")) return `${degree}7`;
  return degree;
}

function pivotStep(chord: ParsedChord, source: KeyContext, destination: KeyContext): ChordStep {
  return {
    chord,
    role: `${romanInKey(chord, source)} · ${shortKey(source)} ⇢ ${romanInKey(chord, destination)} · ${shortKey(destination)}`,
  };
}

function appliedDominantStep(chord: ParsedChord, source: KeyContext): ChordStep {
  return {
    chord: makeChord(Note.transpose(chord.tonic, "5P"), "7"),
    role: `V7/${romanInKey(chord, source)} · ${shortKey(source)}`,
  };
}

function candidate(
  id: string,
  name: string,
  method: ModulationMethod,
  label: ResultLabel,
  colour: number,
  strength: number,
  styles: HarmonicStyle[],
  middle: ChordStep[],
  explanation: string,
): ModulationCandidate {
  return { id, name, method, label, colour, strength, styles, middle, explanation };
}

function destinationPrefixes(key: KeyContext, count: number, difficulty: Difficulty): ModulationCandidate[] {
  const ii = degreeChord(key, "ii", difficulty);
  const iii = degreeChord(key, "iii", difficulty);
  const four = degreeChord(key, "IV", difficulty);
  const six = degreeChord(key, "vi", difficulty);
  if (count === 0) {
    return [candidate("direct", "Direct destination cadence", "Direct cadence", "Gentle", 0.15, 8.8, ["smooth", "soulful"], [], `The harmony moves directly into a cadence in ${key.label}, making the new key explicit rather than implying it.`)];
  }
  if (count === 1) {
    return [
      candidate("direct-ii", "Destination-key ii–V", "Direct cadence", "Gentle", 0.25, 9.7, ["smooth", "jazzy"], [ii], `${ii.chord.symbol} begins a textbook cadence entirely inside ${key.label}, so the modulation lands decisively.`),
      candidate("dominant-v", "Dominant of the dominant", "Dominant chain", "Colourful", 0.75, 9.5, ["soulful", "jazzy"], [secondaryDominantStep(key, "V")], `A secondary dominant starts a circle-of-fifths chain that points unambiguously into ${key.label}.`),
      candidate("borrowed-six", "Borrowed flat-six approach", "Chromatic bridge", "Bold", 1.1, 9.0, ["cinematic", "soulful"], [borrowedStep(key, "bVI", difficulty)], `The borrowed flat-six drops chromatically into the destination dominant for a dramatic but functional key change.`),
      candidate("direct-four", "Plagal preparation", "Direct cadence", "Gentle", 0.3, 8.9, ["smooth", "soulful"], [four], `${four.chord.symbol} places the ear inside ${key.label} before the dominant confirms the arrival.`),
    ];
  }
  if (count === 2) {
    return [
      candidate("circle-six-two", "Destination circle cadence", "Direct cadence", "Gentle", 0.35, 10.0, ["smooth", "jazzy"], [six, ii], `A diatonic chain of fifths enters ${key.label} and carries the harmony through ii–V to the landing chord.`),
      candidate("dominant-six-two", "Secondary-dominant chain", "Dominant chain", "Colourful", 0.9, 9.8, ["soulful", "jazzy"], [secondaryDominantStep(key, "ii"), ii], `The applied dominant of ii begins a controlled dominant chain into ${key.label}.`),
      candidate("chromatic-four", "Chromatic gospel rise", "Chromatic bridge", "Colourful", 0.95, 9.5, ["soulful", "jazzy"], [four, chromaticDiminishedStep(key, difficulty)], `A semitone bass rise through the diminished chord leads cleanly into the new key's dominant.`),
      candidate("cinematic-six-two", "Parallel-minor bridge", "Chromatic bridge", "Bold", 1.2, 9.3, ["cinematic"], [borrowedStep(key, "bVI", difficulty), parallelMinorTwoStep(key, difficulty)], `Borrowed colour from the parallel minor resolves through iiø–V, keeping the modulation directional.`),
    ];
  }
  return [
    candidate("full-circle", "Full destination turnaround", "Direct cadence", "Gentle", 0.45, 10.2, ["smooth", "jazzy"], [iii, six, ii], `A complete circle progression establishes ${key.label} across several chords before the final cadence.`),
    candidate("full-dominants", "Circle of dominants", "Dominant chain", "Colourful", 1.0, 10.0, ["soulful", "jazzy"], [secondaryDominantStep(key, "vi"), secondaryDominantStep(key, "ii"), ii], `Successive applied dominants move by fifths into ii–V, a strong musician's route into ${key.label}.`),
    candidate("full-cinematic", "Cinematic borrowed chain", "Chromatic bridge", "Bold", 1.35, 9.6, ["cinematic"], [borrowedStep(key, "bIII", difficulty), borrowedStep(key, "bVI", difficulty), ii], `A borrowed chain of fifths opens the colour palette before resolving into the destination cadence.`),
  ];
}

function pivotCandidates(
  source: KeyContext,
  destination: KeyContext,
  start: ParsedChord,
  end: ParsedChord,
  prefixCount: number,
  difficulty: Difficulty,
): ModulationCandidate[] {
  if (prefixCount < 1) return [];
  const ii = degreeChord(destination, "ii", difficulty);
  const six = degreeChord(destination, "vi", difficulty);
  return commonPivots(source, destination, start, end).slice(0, 5).flatMap((pivot, index) => {
    const pivotChord = pivotStep(pivot, source, destination);
    const explanation = `${pivot.symbol} belongs naturally to both keys. It is heard first as ${romanInKey(pivot, source)} in ${source.label}, then reinterpreted as ${romanInKey(pivot, destination)} in ${destination.label} before the new-key cadence.`;
    if (prefixCount === 1) {
      return [candidate(`pivot-${index}`, `${pivot.symbol} common-chord pivot`, "Pivot chord", "Gentle", 0.3, 10.8, ["smooth", "soulful", "jazzy"], [pivotChord], explanation)];
    }
    if (prefixCount === 2) {
      return [
        candidate(`pivot-cadence-${index}`, `${pivot.symbol} pivot into ii–V`, "Pivot chord", "Gentle", 0.45, 11.0, ["smooth", "jazzy"], [pivotChord, ii], explanation),
        candidate(`prepared-pivot-${index}`, `Prepared ${pivot.symbol} pivot`, "Pivot chord", "Colourful", 0.7, 10.5, ["soulful", "jazzy"], [appliedDominantStep(pivot, source), pivotChord], explanation),
      ];
    }
    return [
      candidate(`full-pivot-${index}`, `Prepared ${pivot.symbol} pivot cadence`, "Pivot chord", "Gentle", 0.55, 11.2, ["smooth", "jazzy", "soulful"], [appliedDominantStep(pivot, source), pivotChord, ii], explanation),
      candidate(`pivot-circle-${index}`, `${pivot.symbol} pivot turnaround`, "Pivot chord", "Colourful", 0.65, 10.7, ["soulful", "smooth"], [pivotChord, six, ii], explanation),
    ];
  });
}

function overlap(a: RankedCandidate, b: RankedCandidate): number {
  const left = new Set(a.middle.map((step) => step.chord.symbol));
  return b.middle.filter((step) => left.has(step.chord.symbol)).length / Math.max(1, b.middle.length);
}

function chooseDiverse(ranked: RankedCandidate[]): RankedCandidate[] {
  const selected: RankedCandidate[] = [];
  for (const item of ranked) {
    if (selected.some((value) => value.method === item.method || overlap(value, item) > 0.72)) continue;
    selected.push(item);
    if (selected.length === 3) return selected;
  }
  for (const item of ranked) {
    if (selected.includes(item) || selected.some((value) => overlap(value, item) > 0.72)) continue;
    selected.push(item);
    if (selected.length === 3) break;
  }
  return selected;
}

export function generateProgressions(options: GenerateOptions): ProgressionResult[] {
  const start = parseChordSymbol(options.start);
  const end = parseChordSymbol(options.end);
  const sourceKey = parseKeyLabel(options.sourceKey);
  const destinationKey = parseKeyLabel(options.destinationKey);
  if (!start) throw new Error(`“${options.start}” is not a chord I recognise.`);
  if (!end) throw new Error(`“${options.end}” is not a chord I recognise.`);
  if (!sourceKey) throw new Error(`“${options.sourceKey}” is not a key I recognise.`);
  if (!destinationKey) throw new Error(`“${options.destinationKey}” is not a key I recognise.`);
  if (pitchClass(sourceKey.tonic) === pitchClass(destinationKey.tonic) && sourceKey.mode === destinationKey.mode) {
    throw new Error("Choose a different destination key to build a modulation.");
  }
  if (chordKeyFit(start, sourceKey) < 0.66) {
    throw new Error(`${start.symbol} does not belong clearly to ${sourceKey.label}. Choose its actual starting key.`);
  }
  if (chordKeyFit(end, destinationKey) < 0.66) {
    throw new Error(`${end.symbol} does not belong clearly to ${destinationKey.label}. Choose its actual destination key.`);
  }

  const gapLength = Math.max(1, Math.min(4, Math.round(options.gapLength)));
  const tonicLanding = pitchClass(end.tonic) === pitchClass(destinationKey.tonic);
  if (!tonicLanding && gapLength < 2) {
    throw new Error("Use at least two bridge chords when the landing chord is not the destination tonic.");
  }

  const cadence: ChordStep[] = tonicLanding
    ? [dominantStep(destinationKey)]
    : [dominantStep(destinationKey), degreeChord(destinationKey, "tonic", options.difficulty)];
  const prefixCount = gapLength - cadence.length;
  const candidates = [
    ...pivotCandidates(sourceKey, destinationKey, start, end, prefixCount, options.difficulty).map((value) => ({ ...value, middle: [...value.middle, ...cadence] })),
    ...destinationPrefixes(destinationKey, prefixCount, options.difficulty).map((value) => ({ ...value, middle: [...value.middle, ...cadence] })),
  ];

  const ranked = candidates.flatMap((value): RankedCandidate[] => {
    if (value.middle.length !== gapLength) return [];
    const chords = [start, ...value.middle.map((step) => step.chord), end];
    if (chords.some((chord, index) => index > 0 && chord.symbol === chords[index - 1].symbol)) return [];
    if (pitchClass(value.middle[0].chord.tonic) === pitchClass(start.tonic) && value.method !== "Dominant chain") return [];
    const entryScore = scoreEntry(start, value.middle[0].chord);
    const styleScore = value.styles.includes(options.style) ? 3.4 : -0.5;
    const voiceScore = value.middle.reduce((sum, step, index) => {
      const previous = index ? value.middle[index - 1].chord : start;
      return sum + Math.max(0, 2.5 - voiceLeadingDistance(previous, step.chord));
    }, 0) / value.middle.length;
    const functionScore = value.middle.reduce((sum, step, index) => {
      const previous = index ? value.middle[index - 1].chord : start;
      return sum + rootMotionScore(previous, step.chord);
    }, 0) / value.middle.length;
    const pivotBonus = value.method === "Pivot chord" ? 1.4 : 0;
    return [{ ...value, chords, entryScore, score: value.strength + entryScore + styleScore + voiceScore + functionScore * 1.4 + pivotBonus }];
  }).sort((a, b) => b.score - a.score);

  const selected = chooseDiverse(ranked);
  if (!selected.length) {
    throw new Error("I can’t find a convincing modulation for that exact route. Try one more bridge chord or another character.");
  }

  return selected.map((value) => ({
    id: value.id,
    label: value.label,
    patternName: value.name,
    romanNumerals: [
      `${romanInKey(start, sourceKey)} · ${shortKey(sourceKey)}`,
      ...value.middle.map((step) => step.role),
      `${romanInKey(end, destinationKey)} · ${shortKey(destinationKey)}`,
    ],
    chords: value.chords,
    voicings: voiceProgression(value.chords),
    score: value.score,
    colour: value.colour,
    confidence: value.entryScore >= 5 || value.method === "Pivot chord" ? "high" : "good",
    method: value.method,
    explanation: value.explanation,
    sourceKey,
    destinationKey,
    key: destinationKey,
  }));
}

export function availableKeys(): string[] {
  const roots = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  return roots.flatMap((root) => [`${root} major`, `${root} minor`]);
}

export function prettyNote(note: string): string {
  return Note.simplify(note).replace("b", "♭").replace("#", "♯");
}
