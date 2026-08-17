import { Note } from "@tonaljs/tonal";
import { chordKeyFit, parseChordSymbol, pitchClass, resolveKey } from "./chords";
import type {
  Difficulty,
  GenerateOptions,
  HarmonicStyle,
  KeyContext,
  ParsedChord,
  ProgressionResult,
} from "./types";
import { voiceProgression } from "./voicing";

type DestinationMode = "major" | "minor";
type ResultLabel = "Gentle" | "Colourful" | "Bold";

interface ChordSpec {
  interval: string;
  suffix: string;
  roman: string;
  bassInterval?: string;
}

interface HarmonicTemplate {
  id: string;
  name: string;
  mode: DestinationMode;
  gapLength: number;
  difficulty: Difficulty;
  styles: HarmonicStyle[];
  label: ResultLabel;
  colour: number;
  strength: number;
  chords: ChordSpec[];
  explanation: string;
}

interface RankedTemplate {
  template: HarmonicTemplate;
  chords: ParsedChord[];
  score: number;
  entryScore: number;
}

const chord = (roman: string, interval: string, suffix = "", bassInterval?: string): ChordSpec => ({
  interval,
  suffix,
  roman,
  bassInterval,
});

// These are complete, familiar harmonic phrases. The generator chooses among
// them; it never assembles a progression from a loose bag of plausible chords.
const TEMPLATES: HarmonicTemplate[] = [
  // One-chord approaches to a major destination.
  { id: "major-v7", name: "Perfect cadence", mode: "major", gapLength: 1, difficulty: "easy", styles: ["smooth", "soulful", "jazzy"], label: "Gentle", colour: 0.2, strength: 9.8, chords: [chord("V7", "5P", "7")], explanation: "A direct dominant cadence: the leading note rises and the seventh falls into the destination." },
  { id: "major-leading", name: "Leading-note cadence", mode: "major", gapLength: 1, difficulty: "rich", styles: ["smooth", "jazzy"], label: "Colourful", colour: 0.8, strength: 9.2, chords: [chord("vii°7", "7M", "dim7")], explanation: "A compact leading-note diminished chord puts every unstable note within a step of its resolution." },
  { id: "major-minor-plagal", name: "Minor plagal sigh", mode: "major", gapLength: 1, difficulty: "easy", styles: ["soulful", "cinematic"], label: "Colourful", colour: 0.7, strength: 8.6, chords: [chord("iv", "4P", "m")], explanation: "The borrowed minor fourth gives the familiar wistful plagal resolution heard in soul and film music." },
  { id: "major-backdoor", name: "Backdoor cadence", mode: "major", gapLength: 1, difficulty: "rich", styles: ["soulful", "jazzy"], label: "Bold", colour: 1.0, strength: 8.7, chords: [chord("♭VII7", "7m", "7")], explanation: "A classic backdoor dominant resolves by common tones and a whole-step bass move rather than a conventional V–I." },
  { id: "major-tritone", name: "Tritone cadence", mode: "major", gapLength: 1, difficulty: "rich", styles: ["jazzy"], label: "Bold", colour: 1.2, strength: 8.3, chords: [chord("♭II7", "2m", "7")], explanation: "The tritone substitute keeps the dominant guide tones while letting the bass slide down by a semitone." },

  // Two-chord approaches to a major destination.
  { id: "major-ii-v", name: "Classic ii–V", mode: "major", gapLength: 2, difficulty: "rich", styles: ["smooth", "jazzy"], label: "Gentle", colour: 0.35, strength: 10.3, chords: [chord("ii7", "2M", "m7"), chord("V7", "5P", "7")], explanation: "The standard ii–V–I cadence: a descending-fifth chain with clear voice-leading into the destination." },
  { id: "major-ii-v-easy", name: "Simple ii–V", mode: "major", gapLength: 2, difficulty: "easy", styles: ["smooth", "jazzy"], label: "Gentle", colour: 0.1, strength: 10.0, chords: [chord("ii", "2M", "m"), chord("V7", "5P", "7")], explanation: "A plain minor ii chord leads to V7 and then home: strong, recognisable harmony without extra colour tones." },
  { id: "major-iv-v", name: "Lift into the cadence", mode: "major", gapLength: 2, difficulty: "easy", styles: ["smooth", "cinematic"], label: "Gentle", colour: 0.1, strength: 9.1, chords: [chord("IV", "4P"), chord("V7", "5P", "7")], explanation: "IV lifts into V7 before resolving, giving the phrase a broad and dependable sense of arrival." },
  { id: "major-backdoor-two", name: "Soul backdoor", mode: "major", gapLength: 2, difficulty: "rich", styles: ["soulful", "jazzy"], label: "Colourful", colour: 1.0, strength: 9.4, chords: [chord("iv7", "4P", "m7"), chord("♭VII7", "7m", "7")], explanation: "Borrowed iv7 moves through the backdoor dominant, a warm soul and jazz cadence held together by common tones." },
  { id: "major-flat-six-v", name: "Cinematic fall", mode: "major", gapLength: 2, difficulty: "rich", styles: ["cinematic", "soulful"], label: "Bold", colour: 1.05, strength: 9.0, chords: [chord("♭VImaj7", "6m", "maj7"), chord("V7", "5P", "7")], explanation: "The borrowed flat-six drops by semitone into V7, creating a dramatic but purposeful approach." },
  { id: "major-first-inversion-plagal", name: "Plagal bass walk", mode: "major", gapLength: 2, difficulty: "easy", styles: ["soulful", "smooth"], label: "Colourful", colour: 0.35, strength: 8.5, chords: [chord("I/3", "1P", "", "3M"), chord("IV", "4P")], explanation: "A first-inversion tonic opens a stepwise bass path into IV and back to the destination." },

  // Three-chord approaches to a major destination.
  { id: "major-vi-ii-v", name: "Diatonic turnaround", mode: "major", gapLength: 3, difficulty: "rich", styles: ["smooth", "jazzy", "soulful"], label: "Gentle", colour: 0.4, strength: 10.4, chords: [chord("vi7", "6M", "m7"), chord("ii7", "2M", "m7"), chord("V7", "5P", "7")], explanation: "The classic vi–ii–V turnaround follows a chain of fifths, so every chord has a clear job." },
  { id: "major-vi-ii-v-easy", name: "Simple turnaround", mode: "major", gapLength: 3, difficulty: "easy", styles: ["smooth", "soulful"], label: "Gentle", colour: 0.1, strength: 10.0, chords: [chord("vi", "6M", "m"), chord("ii", "2M", "m"), chord("V7", "5P", "7")], explanation: "A familiar vi–ii–V chain in simple shapes creates momentum and a strong final resolution." },
  { id: "major-gospel-rise", name: "Gospel chromatic rise", mode: "major", gapLength: 3, difficulty: "rich", styles: ["soulful", "jazzy"], label: "Colourful", colour: 0.85, strength: 9.7, chords: [chord("IVmaj7", "4P", "maj7"), chord("♯iv°7", "4A", "dim7"), chord("V7", "5P", "7")], explanation: "IV rises through a chromatic diminished chord into V7, giving the bass a singable semitone climb." },
  { id: "major-borrowed-minor", name: "Borrowed minor cadence", mode: "major", gapLength: 3, difficulty: "rich", styles: ["cinematic", "jazzy"], label: "Bold", colour: 1.15, strength: 9.3, chords: [chord("♭VImaj7", "6m", "maj7"), chord("iiø7", "2M", "m7b5"), chord("V7", "5P", "7")], explanation: "Harmony borrowed from the parallel minor funnels into a minor-key ii–V before resolving into major." },
  { id: "major-backdoor-three", name: "Extended backdoor", mode: "major", gapLength: 3, difficulty: "rich", styles: ["soulful", "jazzy"], label: "Colourful", colour: 1.0, strength: 9.2, chords: [chord("I/3", "1P", "", "3M"), chord("iv7", "4P", "m7"), chord("♭VII7", "7m", "7")], explanation: "A bass inversion eases into borrowed iv7 and the backdoor dominant for a rounded soul cadence." },
  { id: "major-film-fifths", name: "Modal chain of fifths", mode: "major", gapLength: 3, difficulty: "rich", styles: ["cinematic"], label: "Bold", colour: 1.2, strength: 8.9, chords: [chord("♭IIImaj7", "3m", "maj7"), chord("♭VImaj7", "6m", "maj7"), chord("V7", "5P", "7")], explanation: "Two borrowed major chords move by fifth before the dominant, a spacious cinematic sequence with a firm landing." },

  // Four-chord approaches to a major destination.
  { id: "major-iii-vi-ii-v", name: "Full circle turnaround", mode: "major", gapLength: 4, difficulty: "rich", styles: ["smooth", "jazzy"], label: "Gentle", colour: 0.45, strength: 10.5, chords: [chord("iii7", "3M", "m7"), chord("vi7", "6M", "m7"), chord("ii7", "2M", "m7"), chord("V7", "5P", "7")], explanation: "A complete iii–vi–ii–V circle progression: four linked fifths with continuous forward motion." },
  { id: "major-iii-vi-ii-v-easy", name: "Simple circle turnaround", mode: "major", gapLength: 4, difficulty: "easy", styles: ["smooth", "jazzy"], label: "Gentle", colour: 0.1, strength: 10.1, chords: [chord("iii", "3M", "m"), chord("vi", "6M", "m"), chord("ii", "2M", "m"), chord("V7", "5P", "7")], explanation: "A playable triadic version of the circle turnaround, ending with the unmistakable pull of V7." },
  { id: "major-gospel-four", name: "Gospel walk-up", mode: "major", gapLength: 4, difficulty: "rich", styles: ["soulful"], label: "Colourful", colour: 0.9, strength: 9.7, chords: [chord("I/3", "1P", "", "3M"), chord("IVmaj7", "4P", "maj7"), chord("♯iv°7", "4A", "dim7"), chord("V7", "5P", "7")], explanation: "A first-inversion tonic begins a gospel bass walk through IV and a chromatic diminished approach to V7." },
  { id: "major-modal-four", name: "Parallel-minor journey", mode: "major", gapLength: 4, difficulty: "rich", styles: ["cinematic", "jazzy"], label: "Bold", colour: 1.3, strength: 9.4, chords: [chord("♭IIImaj7", "3m", "maj7"), chord("♭VImaj7", "6m", "maj7"), chord("iiø7", "2M", "m7b5"), chord("V7", "5P", "7")], explanation: "A chain borrowed from the parallel minor travels by fifths into iiø–V before the major resolution." },
  { id: "major-six-two-five", name: "Gospel dominant turnaround", mode: "major", gapLength: 4, difficulty: "rich", styles: ["soulful", "jazzy"], label: "Colourful", colour: 0.95, strength: 9.5, chords: [chord("vi7", "6M", "m7"), chord("VI7", "6M", "7"), chord("ii7", "2M", "m7"), chord("V7", "5P", "7")], explanation: "A secondary dominant adds gospel tension inside the familiar vi–ii–V turnaround." },
  { id: "major-backdoor-four", name: "Long soul cadence", mode: "major", gapLength: 4, difficulty: "rich", styles: ["soulful", "cinematic"], label: "Bold", colour: 1.1, strength: 9.1, chords: [chord("I/3", "1P", "", "3M"), chord("IVmaj7", "4P", "maj7"), chord("iv6", "4P", "m6"), chord("♭VII7", "7m", "7")], explanation: "A tonic inversion and plagal shift lead into borrowed iv and the backdoor dominant for a long, expressive release." },

  // One-chord approaches to a minor destination.
  { id: "minor-v7", name: "Minor perfect cadence", mode: "minor", gapLength: 1, difficulty: "easy", styles: ["smooth", "soulful", "jazzy"], label: "Gentle", colour: 0.25, strength: 10.0, chords: [chord("V7", "5P", "7")], explanation: "The raised leading note in V7 creates the defining pull into the minor destination." },
  { id: "minor-leading", name: "Minor leading-note cadence", mode: "minor", gapLength: 1, difficulty: "rich", styles: ["smooth", "jazzy"], label: "Colourful", colour: 0.85, strength: 9.3, chords: [chord("vii°7", "7M", "dim7")], explanation: "A fully diminished leading-note chord resolves each tense voice by semitone into minor." },
  { id: "minor-plagal", name: "Minor plagal close", mode: "minor", gapLength: 1, difficulty: "easy", styles: ["soulful", "cinematic"], label: "Gentle", colour: 0.25, strength: 8.4, chords: [chord("iv", "4P", "m")], explanation: "A soft minor iv–i plagal close avoids dominant drama while still sounding complete." },
  { id: "minor-neapolitan-one", name: "Neapolitan fall", mode: "minor", gapLength: 1, difficulty: "rich", styles: ["cinematic"], label: "Bold", colour: 1.2, strength: 8.2, chords: [chord("♭IImaj7", "2m", "maj7")], explanation: "The Neapolitan chord falls directly by semitone into the tonic for a dark film-score resolution." },

  // Two-chord approaches to a minor destination.
  { id: "minor-ii-v", name: "Minor iiø–V", mode: "minor", gapLength: 2, difficulty: "rich", styles: ["smooth", "jazzy"], label: "Gentle", colour: 0.6, strength: 10.5, chords: [chord("iiø7", "2M", "m7b5"), chord("V7", "5P", "7")], explanation: "The canonical minor iiø–V cadence uses a half-diminished ii chord before the altered dominant pull into minor." },
  { id: "minor-iv-v", name: "Simple minor cadence", mode: "minor", gapLength: 2, difficulty: "easy", styles: ["smooth", "soulful"], label: "Gentle", colour: 0.15, strength: 9.8, chords: [chord("iv", "4P", "m"), chord("V7", "5P", "7")], explanation: "Minor iv moves to V7 and home, a strong traditional cadence in comfortable piano shapes." },
  { id: "minor-iv7-v", name: "Soulful minor cadence", mode: "minor", gapLength: 2, difficulty: "rich", styles: ["soulful", "jazzy"], label: "Colourful", colour: 0.6, strength: 9.9, chords: [chord("iv7", "4P", "m7"), chord("V7", "5P", "7")], explanation: "Adding the seventh to iv gives the traditional minor cadence a warmer, more vocal inner line." },
  { id: "minor-flat-six-v", name: "Minor cinematic fall", mode: "minor", gapLength: 2, difficulty: "easy", styles: ["cinematic", "soulful"], label: "Colourful", colour: 0.55, strength: 9.3, chords: [chord("♭VI", "6m"), chord("V7", "5P", "7")], explanation: "The flat-six drops by semitone to V7, a dramatic minor-key gesture with a clear destination." },
  { id: "minor-neapolitan-v", name: "Neapolitan cadence", mode: "minor", gapLength: 2, difficulty: "rich", styles: ["cinematic", "jazzy"], label: "Bold", colour: 1.25, strength: 9.4, chords: [chord("♭IImaj7", "2m", "maj7"), chord("V7", "5P", "7")], explanation: "The Neapolitan flat-two moves into V7 before resolving, a classical cadence with cinematic weight." },

  // Three-chord approaches to a minor destination.
  { id: "minor-six-ii-v", name: "Minor circle cadence", mode: "minor", gapLength: 3, difficulty: "rich", styles: ["smooth", "jazzy"], label: "Gentle", colour: 0.65, strength: 10.5, chords: [chord("♭VImaj7", "6m", "maj7"), chord("iiø7", "2M", "m7b5"), chord("V7", "5P", "7")], explanation: "Flat-six begins a descending-fifth chain into iiø–V, giving the minor arrival both breadth and inevitability." },
  { id: "minor-six-iv-v-easy", name: "Simple minor journey", mode: "minor", gapLength: 3, difficulty: "easy", styles: ["smooth", "cinematic"], label: "Gentle", colour: 0.35, strength: 9.8, chords: [chord("♭VI", "6m"), chord("iv", "4P", "m"), chord("V7", "5P", "7")], explanation: "Flat-six moves to minor iv and V7: three familiar functions that make the landing feel earned." },
  { id: "minor-three-ii-v", name: "Minor jazz turnaround", mode: "minor", gapLength: 3, difficulty: "rich", styles: ["jazzy", "smooth"], label: "Colourful", colour: 0.75, strength: 9.8, chords: [chord("♭IIImaj7", "3m", "maj7"), chord("iiø7", "2M", "m7b5"), chord("V7", "5P", "7")], explanation: "The relative major flows into the standard minor iiø–V, a natural jazz turnaround." },
  { id: "minor-neapolitan-three", name: "Dramatic minor cadence", mode: "minor", gapLength: 3, difficulty: "rich", styles: ["cinematic"], label: "Bold", colour: 1.3, strength: 9.5, chords: [chord("iv7", "4P", "m7"), chord("♭IImaj7", "2m", "maj7"), chord("V7", "5P", "7")], explanation: "Minor iv expands into the Neapolitan before V7, building a deliberate film-score arc into the final chord." },
  { id: "minor-tonic-inversion", name: "Minor bass-line cadence", mode: "minor", gapLength: 3, difficulty: "rich", styles: ["soulful"], label: "Colourful", colour: 0.7, strength: 9.3, chords: [chord("i/3", "1P", "m", "3m"), chord("iv7", "4P", "m7"), chord("V7", "5P", "7")], explanation: "A tonic inversion starts a grounded bass line through iv7 and V7 before returning home." },

  // Four-chord approaches to a minor destination.
  { id: "minor-full-circle", name: "Full minor circle", mode: "minor", gapLength: 4, difficulty: "rich", styles: ["smooth", "jazzy"], label: "Gentle", colour: 0.75, strength: 10.6, chords: [chord("♭IIImaj7", "3m", "maj7"), chord("♭VImaj7", "6m", "maj7"), chord("iiø7", "2M", "m7b5"), chord("V7", "5P", "7")], explanation: "Relative major begins a full chain of fifths through flat-six and iiø–V into the minor tonic." },
  { id: "minor-full-circle-easy", name: "Simple minor circle", mode: "minor", gapLength: 4, difficulty: "easy", styles: ["smooth", "cinematic"], label: "Gentle", colour: 0.35, strength: 10.0, chords: [chord("♭III", "3m"), chord("♭VI", "6m"), chord("iv", "4P", "m"), chord("V7", "5P", "7")], explanation: "A simple relative-major and flat-six sequence leads through iv and V7 in a natural minor-key arc." },
  { id: "minor-neapolitan-four", name: "Minor dramatic arc", mode: "minor", gapLength: 4, difficulty: "rich", styles: ["cinematic", "soulful"], label: "Bold", colour: 1.35, strength: 9.6, chords: [chord("i/3", "1P", "m", "3m"), chord("iv7", "4P", "m7"), chord("♭IImaj7", "2m", "maj7"), chord("V7", "5P", "7")], explanation: "A tonic inversion opens into iv, the Neapolitan and V7 for a long, directed dramatic cadence." },
  { id: "minor-modal-four", name: "Minor modal detour", mode: "minor", gapLength: 4, difficulty: "rich", styles: ["jazzy", "cinematic"], label: "Colourful", colour: 1.1, strength: 9.2, chords: [chord("iv7", "4P", "m7"), chord("♭VII7", "7m", "7"), chord("♭IIImaj7", "3m", "maj7"), chord("V7", "5P", "7")], explanation: "A modal iv–flat-VII–flat-III chain delays the dominant while preserving a coherent sequence of fifths." },
  { id: "minor-six-four-ii-v", name: "Extended minor cadence", mode: "minor", gapLength: 4, difficulty: "rich", styles: ["soulful", "smooth"], label: "Colourful", colour: 0.8, strength: 9.7, chords: [chord("♭VImaj7", "6m", "maj7"), chord("iv7", "4P", "m7"), chord("iiø7", "2M", "m7b5"), chord("V7", "5P", "7")], explanation: "Flat-six and iv prepare the canonical iiø–V, creating a spacious cadence with no arbitrary detours." },
];

function destinationMode(chordValue: ParsedChord): DestinationMode {
  return chordValue.quality === "Minor" || /^m(?!aj)/.test(chordValue.suffix) ? "minor" : "major";
}

function instantiateSpec(spec: ChordSpec, destination: ParsedChord): ParsedChord | null {
  const root = Note.transpose(destination.tonic, spec.interval);
  const bass = spec.bassInterval ? Note.transpose(destination.tonic, spec.bassInterval) : undefined;
  return parseChordSymbol(`${root}${spec.suffix}${bass ? `/${bass}` : ""}`);
}

function circularDistance(a: number, b: number): number {
  const distance = Math.abs(a - b) % 12;
  return Math.min(distance, 12 - distance);
}

function voiceLeadingDistance(from: ParsedChord, to: ParsedChord): number {
  const fromNotes = from.notes.map(pitchClass);
  const toNotes = to.notes.map(pitchClass);
  return toNotes.reduce(
    (sum, note) => sum + Math.min(...fromNotes.map((source) => circularDistance(source, note))),
    0,
  ) / toNotes.length;
}

function commonToneCount(from: ParsedChord, to: ParsedChord): number {
  const source = new Set(from.notes.map(pitchClass));
  return to.notes.filter((note) => source.has(pitchClass(note))).length;
}

function rootMotionScore(from: ParsedChord, to: ParsedChord): number {
  const movement = (pitchClass(to.tonic) - pitchClass(from.tonic) + 12) % 12;
  if (movement === 5) return 2.4;
  if (movement === 7) return 1.9;
  if (movement === 1 || movement === 11) return 2.0;
  if (movement === 2 || movement === 10) return 1.45;
  if (movement === 3 || movement === 4 || movement === 8 || movement === 9) return 0.7;
  if (movement === 6) return -1.8;
  return -2.5;
}

function entryIsPlausible(from: ParsedChord, to: ParsedChord, style: HarmonicStyle): boolean {
  if (from.symbol === to.symbol) return false;
  const movement = (pitchClass(to.tonic) - pitchClass(from.tonic) + 12) % 12;
  if (commonToneCount(from, to) > 0) return true;
  if ([1, 2, 5, 7, 10, 11].includes(movement)) return true;
  if ([3, 4, 8, 9].includes(movement)) return style === "cinematic" || style === "soulful";
  return movement === 6 && style === "jazzy" && to.suffix.includes("7");
}

function scoreEntry(from: ParsedChord, to: ParsedChord): number {
  return (
    3.2 +
    rootMotionScore(from, to) +
    commonToneCount(from, to) * 0.85 +
    Math.max(0, 2.4 - voiceLeadingDistance(from, to))
  );
}

function romanForChord(value: ParsedChord, destination: ParsedChord): string {
  const relative = (pitchClass(value.tonic) - pitchClass(destination.tonic) + 12) % 12;
  const degrees = ["I", "♭II", "II", "♭III", "III", "IV", "♯IV", "V", "♭VI", "VI", "♭VII", "VII"];
  let degree = degrees[relative];
  const isMinor = value.quality === "Minor" || /^m(?!aj)/.test(value.suffix);
  if (isMinor) degree = degree.toLowerCase();
  if (value.suffix.includes("m7b5")) return `${degree.replace(/[iv]+$/i, (text) => text.toLowerCase())}ø7`;
  if (value.suffix.includes("dim")) return `${degree.toLowerCase()}°7`;
  if (value.suffix.includes("maj7")) return `${degree}maj7`;
  if (value.suffix.includes("7")) return `${degree}7`;
  if (value.suffix.includes("6")) return `${degree}6`;
  return degree;
}

function rankTemplates(
  options: GenerateOptions,
  start: ParsedChord,
  end: ParsedChord,
  key: KeyContext,
): RankedTemplate[] {
  const mode = destinationMode(end);
  return TEMPLATES.flatMap((template): RankedTemplate[] => {
    if (template.mode !== mode || template.gapLength !== options.gapLength) return [];
    if (options.difficulty === "easy" && template.difficulty !== "easy") return [];
    const middle = template.chords.map((spec) => instantiateSpec(spec, end));
    if (middle.some((value) => !value)) return [];
    const chords = middle as ParsedChord[];
    if (chords.some((value, index) => value.symbol === (index ? chords[index - 1].symbol : start.symbol))) return [];
    if (!entryIsPlausible(start, chords[0], options.style)) return [];
    const entryScore = scoreEntry(start, chords[0]);
    const styleAffinity = template.styles.includes(options.style) ? 3.3 : -0.65;
    const contextFit = chords.reduce((sum, value) => sum + chordKeyFit(value, key), 0) / chords.length;
    return [{
      template,
      chords: [start, ...chords, end],
      entryScore,
      score: template.strength + entryScore + styleAffinity + contextFit * 0.35,
    }];
  }).sort((a, b) => b.score - a.score);
}

function progressionOverlap(a: RankedTemplate, b: RankedTemplate): number {
  const aMiddle = new Set(a.chords.slice(1, -1).map((value) => value.symbol));
  const bMiddle = b.chords.slice(1, -1).map((value) => value.symbol);
  return bMiddle.filter((value) => aMiddle.has(value)).length / bMiddle.length;
}

function chooseDiverse(ranked: RankedTemplate[]): RankedTemplate[] {
  const selected: RankedTemplate[] = [];
  for (const candidate of ranked) {
    if (selected.some((picked) => progressionOverlap(picked, candidate) > 0.7)) continue;
    selected.push(candidate);
    if (selected.length === 3) break;
  }
  return selected;
}

export function generateProgressions(options: GenerateOptions): ProgressionResult[] {
  const start = parseChordSymbol(options.start);
  const end = parseChordSymbol(options.end);
  if (!start) throw new Error(`“${options.start}” is not a chord I recognise.`);
  if (!end) throw new Error(`“${options.end}” is not a chord I recognise.`);

  const gapLength = Math.max(1, Math.min(4, Math.round(options.gapLength)));
  const normalisedOptions = { ...options, gapLength };
  const key = resolveKey(options.key, start, end);
  const selected = chooseDiverse(rankTemplates(normalisedOptions, start, end, key));

  if (!selected.length) {
    throw new Error("I can’t find a convincing written path for that exact combination. Try another character, a shorter gap, or set the key manually.");
  }

  return selected.map(({ template, chords, score, entryScore }) => ({
    id: template.id,
    label: template.label,
    patternName: template.name,
    romanNumerals: [romanForChord(start, end), ...template.chords.map((value) => value.roman), romanForChord(end, end)],
    chords,
    voicings: voiceProgression(chords),
    score,
    colour: template.colour,
    confidence: entryScore >= 5.2 ? "high" : "good",
    explanation: template.explanation,
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
