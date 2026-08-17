import type { ProgressionResult } from "../music/types";

const TICKS_PER_BEAT = 480;

function uint32(value: number): number[] {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

function uint16(value: number): number[] {
  return [(value >>> 8) & 0xff, value & 0xff];
}

function variableLength(value: number): number[] {
  let buffer = value & 0x7f;
  const bytes: number[] = [];
  while ((value >>= 7)) {
    buffer <<= 8;
    buffer |= (value & 0x7f) | 0x80;
  }
  while (true) {
    bytes.push(buffer & 0xff);
    if (buffer & 0x80) buffer >>= 8;
    else break;
  }
  return bytes;
}

function ascii(value: string): number[] {
  return [...value].map((character) => character.charCodeAt(0));
}

export function progressionToMidi(result: ProgressionResult, tempo: number): Uint8Array {
  const track: number[] = [];
  const safeTempo = Math.max(40, Math.min(200, tempo));
  const micros = Math.round(60_000_000 / safeTempo);

  track.push(0x00, 0xff, 0x51, 0x03, (micros >>> 16) & 0xff, (micros >>> 8) & 0xff, micros & 0xff);
  track.push(0x00, 0xff, 0x03, 0x0b, ...ascii("Key Changer"));
  track.push(0x00, 0xc0, 0x00); // Acoustic grand piano.

  result.voicings.forEach((voicing) => {
    voicing.midi.forEach((note) => track.push(0x00, 0x90, note, 0x58));
    voicing.midi.forEach((note, noteIndex) => {
      track.push(...variableLength(noteIndex === 0 ? TICKS_PER_BEAT * 2 : 0), 0x80, note, 0x30);
    });
  });

  track.push(0x00, 0xff, 0x2f, 0x00);
  const header = [...ascii("MThd"), ...uint32(6), ...uint16(0), ...uint16(1), ...uint16(TICKS_PER_BEAT)];
  return new Uint8Array([...header, ...ascii("MTrk"), ...uint32(track.length), ...track]);
}

export function downloadMidi(result: ProgressionResult, tempo: number) {
  const bytes = progressionToMidi(result, tempo);
  const blob = new Blob([bytes.slice().buffer as ArrayBuffer], { type: "audio/midi" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${result.chords.map((chord) => chord.symbol.replaceAll("/", "-")).join("_")}.mid`;
  anchor.click();
  URL.revokeObjectURL(url);
}
