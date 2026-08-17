import { midiToName } from "../music/voicing";

interface PianoProps {
  activeMidi: number[];
  chordLabel?: string;
}

const START = 36;
const END = 84;
const BLACK = new Set([1, 3, 6, 8, 10]);

interface KeyLayout {
  midi: number;
  black: boolean;
  whiteIndex: number;
}

function keyLayout(): KeyLayout[] {
  const keys: KeyLayout[] = [];
  let whiteIndex = -1;
  for (let midi = START; midi <= END; midi += 1) {
    const black = BLACK.has(midi % 12);
    if (!black) whiteIndex += 1;
    keys.push({ midi, black, whiteIndex: black ? whiteIndex : whiteIndex });
  }
  return keys;
}

const KEYS = keyLayout();
const WHITE_COUNT = KEYS.filter((key) => !key.black).length;

export function Piano({ activeMidi, chordLabel }: PianoProps) {
  const active = new Set(activeMidi);
  const activeNames = activeMidi.map(midiToName).join(", ");

  return (
    <div
      className="piano"
      style={{ "--white-count": WHITE_COUNT } as React.CSSProperties}
      role="img"
      aria-label={chordLabel ? `${chordLabel}: ${activeNames}` : "Piano keyboard"}
    >
      <div className="piano-keybed" aria-hidden="true">
        {KEYS.filter((key) => !key.black).map((key) => (
          <div className={`piano-key white-key ${active.has(key.midi) ? "is-active" : ""}`} key={key.midi}>
            {key.midi % 12 === 0 && <span className="key-label">C{Math.floor(key.midi / 12) - 1}</span>}
          </div>
        ))}
        {KEYS.filter((key) => key.black).map((key) => (
          <div
            className={`piano-key black-key ${active.has(key.midi) ? "is-active" : ""}`}
            key={key.midi}
            style={{ "--key-left": key.whiteIndex + 1 } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}
