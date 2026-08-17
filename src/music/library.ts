export interface ChordOption {
  symbol: string;
  label: string;
}

export interface ChordOptionGroup {
  root: string;
  options: ChordOption[];
}

const ROOTS = ["C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B"];

const CHORD_TYPES = [
  { suffix: "", name: "major" },
  { suffix: "m", name: "minor" },
  { suffix: "7", name: "dominant 7" },
  { suffix: "maj7", name: "major 7" },
  { suffix: "m7", name: "minor 7" },
  { suffix: "6", name: "major 6" },
  { suffix: "m6", name: "minor 6" },
  { suffix: "9", name: "dominant 9" },
  { suffix: "m9", name: "minor 9" },
  { suffix: "add9", name: "add 9" },
  { suffix: "dim", name: "diminished" },
  { suffix: "dim7", name: "diminished 7" },
  { suffix: "m7b5", name: "half-diminished" },
  { suffix: "sus2", name: "suspended 2" },
  { suffix: "sus4", name: "suspended 4" },
] as const;

function displaySymbol(symbol: string): string {
  return symbol.replaceAll("b", "♭").replaceAll("#", "♯");
}

export const CHORD_GROUPS: ChordOptionGroup[] = ROOTS.map((root) => ({
  root: displaySymbol(root),
  options: CHORD_TYPES.map(({ suffix, name }) => ({
    symbol: `${root}${suffix}`,
    label: `${displaySymbol(`${root}${suffix}`)} — ${name}`,
  })),
}));

export const ALL_CHORDS = CHORD_GROUPS.flatMap((group) => group.options.map((option) => option.symbol));
