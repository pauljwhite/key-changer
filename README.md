# Key Changer

Key Changer writes playable chord-only modulations from a source key into a destination key. It chooses up to three musician-recognisable routes, voices them for piano, shows the exact notes on a dimensional keyboard, plays the result, and exports a Standard MIDI file.

## Features

- Explicit source and destination keys, so every result is a real modulation rather than a chord-to-chord guess
- Native dropdowns containing more than 250 supported chord spellings and qualities
- Common-chord pivots, dominant chains, direct destination cadences and chromatic bridges
- Smooth, Soulful, Jazzy and Cinematic harmony profiles
- Easy and Rich voicing modes
- Curated cadences and turnarounds: ii–V, circle progressions, backdoor cadences, gospel walk-ups, borrowed-minor and Neapolitan approaches
- Dual-key Roman-numeral analysis that shows exactly where a pivot changes harmonic meaning
- Quality filtering that returns fewer options rather than padding the set with weak paths
- Voice-led piano inversions across a practical range
- Sampled piano playback with a synthesised fallback
- MIDI file download
- Dark/light appearance, accent presets and an adjustable liquid-glass treatment whose maximum adds the strongest transparency, blur and refraction
- Responsive desktop, tablet and mobile layout
- No backend, account, analytics or uploaded musical data

## Local development

Requirements: Node.js 22 or newer.

```bash
npm install
npm run dev
```

Run the checks and production build:

```bash
npm test
npm run build
npm run preview
```

## GitHub Pages

The Vite build uses relative asset URLs, so the generated site works at either a repository path such as `https://username.github.io/key-changer/` or a custom domain.

1. Push this project to a GitHub repository using `main` as its default branch.
2. Open **Settings → Pages** in the repository.
3. Set **Source** to **GitHub Actions**.
4. Push to `main`, or run the deployment manually from the Actions tab.

The workflow runs the test suite, builds the static `dist` directory and publishes it to GitHub Pages.

## Piano sample licence

The piano samples in `public/audio/piano/` are drawn from the [tonejs-instruments](https://github.com/nbrosowsky/tonejs-instruments) sample library and are licensed under CC BY 3.0. The library credits its source samples in its own `sample-source-info.txt`.

Application code is private project code unless and until the repository owner adds an explicit software licence.
