import * as Tone from "tone";
import type { VoicedChord } from "../music/types";

let instrument: Tone.Sampler | Tone.PolySynth | null = null;
let playbackToken = 0;
let timers: number[] = [];

const SAMPLE_URLS = {
  C1: "C1.mp3",
  "D#1": "Ds1.mp3",
  "F#1": "Fs1.mp3",
  A1: "A1.mp3",
  C2: "C2.mp3",
  "D#2": "Ds2.mp3",
  "F#2": "Fs2.mp3",
  A2: "A2.mp3",
  C3: "C3.mp3",
  "D#3": "Ds3.mp3",
  "F#3": "Fs3.mp3",
  A3: "A3.mp3",
  C4: "C4.mp3",
  "D#4": "Ds4.mp3",
  "F#4": "Fs4.mp3",
  A4: "A4.mp3",
  C5: "C5.mp3",
} as const;

async function createInstrument(): Promise<Tone.Sampler | Tone.PolySynth> {
  await Tone.start();
  if (instrument) return instrument;

  const sampler = new Tone.Sampler({
    urls: SAMPLE_URLS,
    baseUrl: `${import.meta.env.BASE_URL}audio/piano/`,
    attack: 0.015,
    release: 1.35,
    volume: -6,
  }).toDestination();

  try {
    await Promise.race([
      Tone.loaded(),
      new Promise((_, reject) => window.setTimeout(() => reject(new Error("Sample timeout")), 5000)),
    ]);
    instrument = sampler;
  } catch {
    sampler.dispose();
    instrument = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle8" },
      envelope: { attack: 0.008, decay: 1.2, sustain: 0.06, release: 1.4 },
      volume: -13,
    }).toDestination();
  }
  return instrument;
}

export function stopPlayback() {
  playbackToken += 1;
  timers.forEach((timer) => window.clearTimeout(timer));
  timers = [];
  if (instrument instanceof Tone.Sampler || instrument instanceof Tone.PolySynth) instrument.releaseAll();
}

export async function playProgression(
  voicings: VoicedChord[],
  tempo: number,
  onChord: (index: number) => void,
  onFinish: () => void,
) {
  stopPlayback();
  const token = playbackToken;
  const piano = await createInstrument();
  if (token !== playbackToken) return;

  const secondsPerChord = (60 / Math.max(40, Math.min(200, tempo))) * 2;
  const start = Tone.now() + 0.08;
  voicings.forEach((voicing, index) => {
    piano.triggerAttackRelease(voicing.noteNames, secondsPerChord * 0.84, start + index * secondsPerChord, 0.72);
    timers.push(
      window.setTimeout(() => {
        if (token === playbackToken) onChord(index);
      }, (index * secondsPerChord + 0.08) * 1000),
    );
  });
  timers.push(
    window.setTimeout(() => {
      if (token === playbackToken) onFinish();
    }, (voicings.length * secondsPerChord + 0.12) * 1000),
  );
}
