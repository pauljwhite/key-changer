export type HarmonicStyle = "smooth" | "soulful" | "jazzy" | "cinematic";
export type Difficulty = "easy" | "rich";

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
  chords: ParsedChord[];
  voicings: VoicedChord[];
  score: number;
  colour: number;
  explanation: string;
  key: KeyContext;
}

export interface GenerateOptions {
  start: string;
  end: string;
  gapLength: number;
  style: HarmonicStyle;
  difficulty: Difficulty;
  key?: string;
}
