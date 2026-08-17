export type HarmonicStyle = "smooth" | "soulful" | "jazzy" | "cinematic";
export type Difficulty = "easy" | "rich";
export type ModulationMethod = "Pivot chord" | "Dominant chain" | "Chromatic bridge" | "Direct cadence";

export interface ParsedChord {
  input: string;
  symbol: string;
  tonic: string;
  suffix: string;
  notes: string[];
  intervals: string[];
  quality: string;
  bass?: string;
}

export interface KeyContext {
  tonic: string;
  mode: "major" | "minor";
  label: string;
  notes: string[];
  score: number;
}

export interface ChordCandidate {
  chord: ParsedChord;
  roles: string[];
  keyFit: number;
  colour: number;
}

export interface VoicedChord {
  chord: ParsedChord;
  midi: number[];
  noteNames: string[];
}

export interface ProgressionResult {
  id: string;
  label: "Gentle" | "Colourful" | "Bold";
  patternName: string;
  romanNumerals: string[];
  chords: ParsedChord[];
  voicings: VoicedChord[];
  score: number;
  colour: number;
  confidence: "high" | "good";
  method: ModulationMethod;
  explanation: string;
  sourceKey: KeyContext;
  destinationKey: KeyContext;
  key: KeyContext;
}

export interface GenerateOptions {
  start: string;
  end: string;
  gapLength: number;
  style: HarmonicStyle;
  difficulty: Difficulty;
  sourceKey: string;
  destinationKey: string;
}
