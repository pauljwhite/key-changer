import { useCallback, useEffect, useRef, useState } from "react";
import { downloadMidi } from "./audio/midi";
import { playProgression, stopPlayback } from "./audio/playback";
import { BrandMark, Icon } from "./components/Icon";
import { Piano } from "./components/Piano";
import { availableKeys, generateProgressions, prettyNote } from "./music/generator";
import { CHORD_GROUPS } from "./music/library";
import type { Difficulty, GenerateOptions, HarmonicStyle, ProgressionResult } from "./music/types";
import { glassVariables, type AppearanceTheme } from "./ui/glass";

const ACCENTS = {
  iris: [250, 72, 74],
  blue: [212, 88, 66],
  teal: [174, 62, 52],
  green: [150, 56, 56],
  amber: [38, 92, 62],
  rose: [344, 78, 68],
  graphite: [222, 12, 64],
} as const;

type AccentName = keyof typeof ACCENTS | "custom";
type Theme = AppearanceTheme;

const EXAMPLES: Array<GenerateOptions & { label: string }> = [
  { label: "C → G", sourceKey: "C major", start: "C", destinationKey: "G major", end: "G", gapLength: 2, style: "smooth", difficulty: "rich" },
  { label: "G → B♭", sourceKey: "G major", start: "G", destinationKey: "Bb major", end: "Bb", gapLength: 3, style: "soulful", difficulty: "rich" },
  { label: "F → A", sourceKey: "F major", start: "F", destinationKey: "A major", end: "A", gapLength: 3, style: "cinematic", difficulty: "rich" },
  { label: "E♭ → C min", sourceKey: "Eb major", start: "Eb", destinationKey: "C minor", end: "Cm", gapLength: 2, style: "smooth", difficulty: "easy" },
];

function ChordOptions() {
  return CHORD_GROUPS.map((group) => (
    <optgroup label={group.root} key={group.root}>
      {group.options.map((option) => <option value={option.symbol} key={option.symbol}>{option.label}</option>)}
    </optgroup>
  ));
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value == null ? fallback : (JSON.parse(value) as T);
  } catch {
    return fallback;
  }
}

function hexToHsl(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  const r = Number.parseInt(value.slice(0, 2), 16) / 255;
  const g = Number.parseInt(value.slice(2, 4), 16) / 255;
  const b = Number.parseInt(value.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;
  if (max !== min) {
    const delta = max - min;
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === r) hue = (g - b) / delta + (g < b ? 6 : 0);
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue /= 6;
  }
  return [Math.round(hue * 360), Math.round(saturation * 100), Math.round(lightness * 100)];
}

function displayChord(symbol: string): string {
  return symbol.replaceAll("b", "♭").replaceAll("#", "♯");
}

function App() {
  const [start, setStart] = useState("C");
  const [end, setEnd] = useState("G");
  const [sourceKey, setSourceKey] = useState("C major");
  const [destinationKey, setDestinationKey] = useState("G major");
  const [gapLength, setGapLength] = useState(2);
  const [style, setStyle] = useState<HarmonicStyle>("smooth");
  const [difficulty, setDifficulty] = useState<Difficulty>("rich");
  const [results, setResults] = useState<ProgressionResult[]>(() =>
    generateProgressions({ sourceKey: "C major", start: "C", destinationKey: "G major", end: "G", gapLength: 2, style: "smooth", difficulty: "rich" }),
  );
  const [selectedId, setSelectedId] = useState(results[0]?.id || "");
  const [activeChord, setActiveChord] = useState(0);
  const [tempo, setTempo] = useState(74);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(false);
  const [error, setError] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => readStorage("key-changer-theme", "dark"));
  const [accent, setAccent] = useState<AccentName>(() => readStorage("key-changer-accent", "iris"));
  const [customAccent, setCustomAccent] = useState(() => readStorage("key-changer-custom-accent", "#9b87f5"));
  const [glass, setGlass] = useState(() => readStorage("key-changer-glass", 88));
  const loopRef = useRef(loop);
  const selected = results.find((result) => result.id === selectedId) || results[0];

  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  useEffect(() => {
    const raw = accent === "custom" ? hexToHsl(customAccent) : [...ACCENTS[accent]];
    const [h, s, l] = raw;
    const adjustedS = theme === "light" ? Math.min(96, s + 8) : s;
    const adjustedL = theme === "light" ? Math.max(38, l - 18) : l;
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.setProperty("--accent-h", String(h));
    root.style.setProperty("--accent-s", `${adjustedS}%`);
    root.style.setProperty("--accent-l", `${adjustedL}%`);
    const glassStyle = glassVariables(theme, glass);
    root.style.setProperty("--glass-a", glassStyle.alpha.toFixed(3));
    root.style.setProperty("--glass-blur", `${glassStyle.blur}px`);
    root.style.setProperty("--glass-saturation", `${glassStyle.saturation}%`);
    root.style.setProperty("--glass-shine-a", glassStyle.shine.toFixed(3));
    root.style.setProperty("--glass-edge", glassStyle.edge);
    localStorage.setItem("key-changer-theme", JSON.stringify(theme));
    localStorage.setItem("key-changer-accent", JSON.stringify(accent));
    localStorage.setItem("key-changer-custom-accent", JSON.stringify(customAccent));
    localStorage.setItem("key-changer-glass", JSON.stringify(glass));
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#101119" : "#eef0f6");
  }, [theme, accent, customAccent, glass]);

  useEffect(() => () => stopPlayback(), []);

  const runGeneration = useCallback(
    (overrides: Partial<GenerateOptions> = {}) => {
      stopPlayback();
      setPlaying(false);
      setActiveChord(0);
      try {
        const generated = generateProgressions({
          sourceKey: overrides.sourceKey ?? sourceKey,
          start: overrides.start ?? start,
          destinationKey: overrides.destinationKey ?? destinationKey,
          end: overrides.end ?? end,
          gapLength: overrides.gapLength ?? gapLength,
          style: overrides.style ?? style,
          difficulty: overrides.difficulty ?? difficulty,
        });
        setResults(generated);
        setSelectedId(generated[0]?.id || "");
        setError("");
      } catch (generationError) {
        setResults([]);
        setSelectedId("");
        setError(generationError instanceof Error ? generationError.message : "I couldn't build that progression.");
      }
    },
    [sourceKey, start, destinationKey, end, gapLength, style, difficulty],
  );

  const startPlayback = useCallback(async (result: ProgressionResult) => {
    setSelectedId(result.id);
    setPlaying(true);
    setActiveChord(0);
    await playProgression(
      result.voicings,
      tempo,
      (index) => setActiveChord(index),
      () => {
        if (loopRef.current) {
          window.setTimeout(() => void startPlayback(result), 260);
        } else {
          setPlaying(false);
          setActiveChord(result.voicings.length - 1);
        }
      },
    );
  }, [tempo]);

  const togglePlayback = () => {
    if (!selected) return;
    if (playing) {
      stopPlayback();
      setPlaying(false);
    } else {
      void startPlayback(selected);
    }
  };

  const chooseExample = (example: GenerateOptions) => {
    setSourceKey(example.sourceKey);
    setStart(example.start);
    setDestinationKey(example.destinationKey);
    setEnd(example.end);
    setGapLength(example.gapLength);
    setStyle(example.style);
    setDifficulty(example.difficulty);
    window.setTimeout(() => runGeneration(example), 0);
  };

  const activeVoicing = selected?.voicings[activeChord];

  return (
    <div className="app">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="site-header glass-panel">
        <a className="brand" href="./" aria-label="Key Changer home">
          <BrandMark />
          <span className="brand-copy">
            <strong>Key Changer</strong>
            <span>Harmonic paths for piano</span>
          </span>
        </a>
        <nav className="header-actions" aria-label="Application settings">
          <button
            className="icon-button"
            type="button"
            aria-label={`Use ${theme === "dark" ? "light" : "dark"} appearance`}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} />
          </button>
          <button className="icon-button" type="button" aria-label="Open appearance settings" onClick={() => setSettingsOpen(true)}>
            <Icon name="settings" />
          </button>
        </nav>
      </header>

      <main>
        <section className="hero" aria-labelledby="page-title">
          <div className="hero-copy">
            <div className="eyebrow"><Icon name="sparkle" /> Piano modulation studio</div>
            <h1 id="page-title">Make the key change <span>land.</span></h1>
            <p>Choose the key you are leaving and the key you need to reach. Key Changer writes playable modulations that make the new home feel earned.</p>
          </div>

          <div className="composer glass-panel glass-strong">
            <div className="modulation-route">
              <div className="key-station">
                <span className="station-label">Leaving</span>
                <label className="select-control key-route-select">
                  <span>Starting key</span>
                  <select aria-label="Starting key" value={sourceKey} onChange={(event) => setSourceKey(event.target.value)}>
                    {availableKeys().map((key) => <option value={key} key={key}>{displayChord(key)}</option>)}
                  </select>
                  <Icon name="chevron" />
                </label>
                <label className="select-control chord-select">
                  <span>Current chord</span>
                  <select aria-label="Current chord" value={start} onChange={(event) => setStart(event.target.value)}>
                    <ChordOptions />
                  </select>
                  <Icon name="chevron" />
                </label>
              </div>
              <div className="between-arrow" aria-hidden="true"><Icon name="arrow" /></div>
              <div className="key-station destination-station">
                <span className="station-label">Arriving</span>
                <label className="select-control key-route-select">
                  <span>Destination key</span>
                  <select aria-label="Destination key" value={destinationKey} onChange={(event) => setDestinationKey(event.target.value)}>
                    {availableKeys().map((key) => <option value={key} key={key}>{displayChord(key)}</option>)}
                  </select>
                  <Icon name="chevron" />
                </label>
                <label className="select-control chord-select">
                  <span>Landing chord</span>
                  <select aria-label="Landing chord" value={end} onChange={(event) => setEnd(event.target.value)}>
                    <ChordOptions />
                  </select>
                  <Icon name="chevron" />
                </label>
              </div>
            </div>

            <div className="composer-options">
              <label className="select-control">
                <span>Chords between</span>
                <select value={gapLength} onChange={(event) => setGapLength(Number(event.target.value))}>
                  {[1, 2, 3, 4].map((value) => <option value={value} key={value}>{value}</option>)}
                </select>
                <Icon name="chevron" />
              </label>
              <label className="select-control">
                <span>Character</span>
                <select value={style} onChange={(event) => setStyle(event.target.value as HarmonicStyle)}>
                  <option value="smooth">Smooth</option>
                  <option value="soulful">Soulful</option>
                  <option value="jazzy">Jazzy</option>
                  <option value="cinematic">Cinematic</option>
                </select>
                <Icon name="chevron" />
              </label>
              <label className="select-control">
                <span>Voicing</span>
                <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty)}>
                  <option value="easy">Easy</option>
                  <option value="rich">Rich</option>
                </select>
                <Icon name="chevron" />
              </label>
              <button className="generate-button" type="button" onClick={() => runGeneration()}>
                <Icon name="sparkle" /> Build modulations
              </button>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="examples" aria-label="Example chord pairs">
              <span>Try</span>
              {EXAMPLES.map((example) => (
                <button type="button" onClick={() => chooseExample(example)} key={example.label}>
                  {example.label.split(" → ")[0]} <Icon name="arrow" /> {example.label.split(" → ")[1]}
                </button>
              ))}
            </div>
          </div>
        </section>

        {selected && (
          <section className="workspace" aria-label="Generated chord paths">
            <div className="section-heading">
              <div>
                <span className="section-kicker">
                  {results.length === 1 ? "One strong modulation" : results.length === 2 ? "Two strong modulations" : "Three strong modulations"}
                </span>
                <h2>Choose the route</h2>
              </div>
              <p><strong>{displayChord(selected.sourceKey.label)}</strong> becomes <strong>{displayChord(selected.destinationKey.label)}</strong>; the final cadence establishes the new key.</p>
            </div>

            <div className="result-grid">
              {results.map((result) => {
                const isSelected = result.id === selected.id;
                return (
                  <article
                    className={`result-card glass-panel ${isSelected ? "is-selected" : ""}`}
                    key={result.id}
                    onClick={() => { setSelectedId(result.id); setActiveChord(0); }}
                  >
                    <div className="result-topline">
                      <span className="result-number">0{results.indexOf(result) + 1}</span>
                      <span className={`result-label label-${result.label.toLowerCase()}`}>{result.label}</span>
                      <span className="method-name">{result.method}</span>
                      {isSelected && <span className="selected-check"><Icon name="check" /></span>}
                    </div>
                    <h3 className="pattern-name">{result.patternName}</h3>
                    <div className="mini-progression" aria-label={result.chords.map((chord) => chord.symbol).join(" to ")}>
                      {result.chords.map((chord, index) => (
                        <span className="mini-chord-wrap" key={`${chord.symbol}-${index}`}>
                          <strong>{displayChord(chord.symbol)}</strong>
                          {index < result.chords.length - 1 && <Icon name="arrow" />}
                        </span>
                      ))}
                    </div>
                    <div className="roman-line" aria-label={`Harmonic pattern ${result.romanNumerals.join(" to ")}`}>
                      {result.romanNumerals.join("  ·  ")}
                    </div>
                    <p>{result.explanation}</p>
                    <button
                      className="card-play"
                      type="button"
                      onClick={(event) => { event.stopPropagation(); void startPlayback(result); }}
                    >
                      <Icon name="play" /> Hear this path
                    </button>
                  </article>
                );
              })}
            </div>

            <div className="piano-stage glass-panel glass-strong">
              <div className="player-heading">
                <div className="now-playing">
                  <span className="live-dot" />
                  <div>
                    <span>{playing ? "Now playing" : "Ready to play"}</span>
                    <strong>{displayChord(activeVoicing?.chord.symbol || selected.chords[0].symbol)}</strong>
                  </div>
                </div>
                <div className="player-actions">
                  <button className={`loop-button ${loop ? "is-active" : ""}`} type="button" onClick={() => setLoop(!loop)} aria-pressed={loop}>
                    <Icon name="refresh" /> Loop
                  </button>
                  <button className="midi-button" type="button" onClick={() => downloadMidi(selected, tempo)}>
                    <Icon name="download" /> MIDI
                  </button>
                </div>
              </div>

              <Piano activeMidi={activeVoicing?.midi || []} chordLabel={activeVoicing?.chord.symbol} />

              <div className="transport">
                <button className="transport-play" type="button" onClick={togglePlayback} aria-label={playing ? "Pause progression" : "Play progression"}>
                  <Icon name={playing ? "pause" : "play"} />
                </button>
                <div className="chord-timeline">
                  {selected.voicings.map((voicing, index) => (
                    <button
                      type="button"
                      className={activeChord === index ? "is-current" : ""}
                      onClick={() => { stopPlayback(); setPlaying(false); setActiveChord(index); }}
                      key={`${voicing.chord.symbol}-${index}`}
                    >
                      <span>{displayChord(voicing.chord.symbol)}</span>
                      <small>{voicing.chord.notes.map(prettyNote).join(" · ")}</small>
                    </button>
                  ))}
                </div>
                <label className="tempo-control">
                  <span>{tempo} BPM</span>
                  <input type="range" min="48" max="132" value={tempo} onChange={(event) => setTempo(Number(event.target.value))} />
                </label>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer>
        <BrandMark />
        <p>Built to make the key change land.</p>
      </footer>

      {settingsOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setSettingsOpen(false)}>
          <section className="settings-modal glass-panel glass-strong" role="dialog" aria-modal="true" aria-labelledby="settings-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-heading">
              <div>
                <span className="section-kicker">Appearance</span>
                <h2 id="settings-title">Make it yours</h2>
              </div>
              <button className="icon-button" type="button" aria-label="Close settings" onClick={() => setSettingsOpen(false)}><Icon name="x" /></button>
            </div>
            <div className="setting-group">
              <span>Theme</span>
              <div className="segmented">
                <button type="button" className={theme === "dark" ? "is-active" : ""} onClick={() => setTheme("dark")}><Icon name="moon" /> Dark</button>
                <button type="button" className={theme === "light" ? "is-active" : ""} onClick={() => setTheme("light")}><Icon name="sun" /> Light</button>
              </div>
            </div>
            <div className="setting-group">
              <span>Accent colour</span>
              <div className="accent-grid">
                {Object.entries(ACCENTS).map(([name, [h, s, l]]) => (
                  <button
                    type="button"
                    className={`accent-swatch ${accent === name ? "is-active" : ""}`}
                    style={{ "--swatch": `hsl(${h} ${s}% ${l}%)` } as React.CSSProperties}
                    onClick={() => setAccent(name as AccentName)}
                    aria-label={`${name} accent`}
                    aria-pressed={accent === name}
                    key={name}
                  />
                ))}
                <label className={`accent-swatch custom-swatch ${accent === "custom" ? "is-active" : ""}`} aria-label="Custom accent colour">
                  <input type="color" value={customAccent} onChange={(event) => { setCustomAccent(event.target.value); setAccent("custom"); }} />
                </label>
              </div>
            </div>
            <label className="setting-group range-setting">
              <span><span>Glass effect</span><strong>{glass}%</strong></span>
              <input type="range" min="0" max="100" value={glass} onChange={(event) => setGlass(Number(event.target.value))} />
              <small>Solid surface</small><small>Maximum glass</small>
            </label>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
