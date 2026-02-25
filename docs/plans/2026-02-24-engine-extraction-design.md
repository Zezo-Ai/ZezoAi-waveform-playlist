# Engine Extraction Design

**Date:** 2026-02-24
**Status:** Approved
**Goal:** Extract framework-agnostic business logic from React hooks into a new `@waveform-playlist/engine` package, enabling Svelte (and other framework) bindings.

## Motivation

The waveform-playlist codebase has ~60% framework-agnostic code (audio engine, peak generation, loaders, workers) but the remaining ~40% — clip editing, drag constraints, viewport math, state management — is embedded in React hooks. Extracting this logic enables:

1. **Framework portability** — Svelte, Vue, vanilla JS bindings become thin wrappers
2. **Testability** — Pure functions and a stateful engine class are independently testable without React
3. **Code clarity** — Separates "what happens" (operations) from "when it happens" (framework lifecycle)

## Architecture: Layered Engine

Two layers, consumed independently or together:

```
@waveform-playlist/engine
├── operations/          ← Pure functions (no state, no side effects)
│   ├── clipOperations.ts
│   ├── viewportOperations.ts
│   └── timelineOperations.ts
├── PlaylistEngine.ts    ← Stateful class (uses operations/, adapter interface)
├── types.ts             ← Engine-specific types
└── index.ts             ← Public API
```

**Dependencies:**
- `@waveform-playlist/core` — peerDependency + devDependency (types only)
- No React, no Tone.js, no styled-components

## Package Structure

```
packages/engine/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── PlaylistEngine.ts
│   └── operations/
│       ├── index.ts
│       ├── clipOperations.ts
│       ├── viewportOperations.ts
│       └── timelineOperations.ts
```

Build follows existing pattern: `pnpm typecheck && vite build`, outputs ESM + CJS + `.d.ts`.

## Layer 1: Operations Module

Pure functions extracted from existing React hooks. No state, no side effects, fully testable.

### clipOperations.ts

Extracted from `useClipDragHandlers` (collision detection, constraint math) and `useClipSplitting` (split logic).

```typescript
/** Calculate constrained drag delta to prevent clip overlaps */
constrainClipDrag(
  clip: AudioClip,
  deltaSamples: number,
  sortedClips: AudioClip[],
  clipIndex: number
): number

/** Calculate constrained trim delta for left/right boundaries */
constrainBoundaryTrim(
  clip: AudioClip,
  deltaSamples: number,
  boundary: 'left' | 'right',
  sortedClips: AudioClip[],
  clipIndex: number,
  minDurationSamples: number
): number

/** Calculate split point snapped to pixel boundary */
calculateSplitPoint(
  splitTimeSamples: number,
  samplesPerPixel: number
): number

/** Create two new clips from splitting an existing clip */
splitClip(
  clip: AudioClip,
  splitSample: number
): { left: AudioClip; right: AudioClip }

/** Check if a clip can be split at the given position */
canSplitAt(
  clip: AudioClip,
  sample: number,
  minDurationSamples: number
): boolean
```

### viewportOperations.ts

Extracted from `ScrollViewport.tsx` (chunk visibility, viewport math).

```typescript
/** Calculate visible region with buffer */
calculateViewportBounds(
  scrollLeft: number,
  containerWidth: number,
  bufferRatio?: number  // default 1.5
): { visibleStart: number; visibleEnd: number }

/** Get array of chunk indices visible in viewport */
getVisibleChunkIndices(
  totalWidth: number,
  chunkWidth: number,
  visibleStart: number,
  visibleEnd: number
): number[]

/** Check if viewport changed enough to warrant re-render */
shouldUpdateViewport(
  oldScrollLeft: number,
  newScrollLeft: number,
  threshold?: number  // default 100px
): boolean
```

### timelineOperations.ts

Extracted from `WaveformPlaylistContext.tsx` (duration calc, zoom math).

```typescript
/** Calculate total timeline duration from all tracks/clips */
calculateDuration(
  tracks: ClipTrack[],
  sampleRate: number
): number

/** Calculate scroll position to keep viewport centered during zoom */
calculateZoomScrollPosition(
  oldSamplesPerPixel: number,
  newSamplesPerPixel: number,
  scrollLeft: number,
  containerWidth: number
): number

/** Find nearest zoom level index */
findClosestZoomIndex(
  targetSamplesPerPixel: number,
  zoomLevels: number[]
): number

/** Clamp seek position to valid range */
clampSeekPosition(time: number, duration: number): number
```

## Layer 2: PlaylistEngine Class

Stateful orchestrator that ties operations + adapter together. Uses an event emitter so any framework can subscribe.

```typescript
class PlaylistEngine {
  constructor(options: {
    adapter?: PlayoutAdapter;
    sampleRate?: number;         // default 44100
    samplesPerPixel?: number;    // default 1000
    zoomLevels?: number[];
  })

  // --- State (read-only properties) ---
  readonly tracks: ClipTrack[];
  readonly duration: number;
  readonly currentTime: number;
  readonly isPlaying: boolean;
  readonly samplesPerPixel: number;
  readonly sampleRate: number;
  readonly selectedTrackId: string | null;

  // --- Track Management ---
  setTracks(tracks: ClipTrack[]): void;
  addTrack(track: ClipTrack): void;
  removeTrack(trackId: string): void;
  selectTrack(trackId: string | null): void;

  // --- Clip Editing (delegates to operations/) ---
  splitClip(trackId: string, clipId: string, atSample: number): void;
  moveClip(trackId: string, clipId: string, deltaSamples: number): void;
  trimClip(trackId: string, clipId: string, boundary: 'left' | 'right', deltaSamples: number): void;

  // --- Playback (delegates to adapter) ---
  play(startTime?: number, endTime?: number): Promise<void>;
  pause(): void;
  stop(): void;
  seek(time: number): void;
  setMasterVolume(volume: number): void;

  // --- Per-Track Audio ---
  setTrackVolume(trackId: string, volume: number): void;
  setTrackMute(trackId: string, muted: boolean): void;
  setTrackSolo(trackId: string, soloed: boolean): void;
  setTrackPan(trackId: string, pan: number): void;

  // --- Zoom ---
  zoomIn(): void;
  zoomOut(): void;
  setZoomLevel(samplesPerPixel: number): void;

  // --- Events ---
  on(event: 'statechange', listener: (state: EngineState) => void): void;
  on(event: 'timeupdate', listener: (time: number) => void): void;
  on(event: 'play' | 'pause' | 'stop', listener: () => void): void;
  off(event: string, listener: Function): void;

  // --- Lifecycle ---
  dispose(): void;
}
```

### Event Model

- **`statechange`** — Fires on any track/clip/zoom mutation. Primary integration point for framework bindings.
- **`timeupdate`** — Fires from an internal RAF loop during playback (reads `adapter.getCurrentTime()`). Used for 60fps playhead animation.
- **`play` / `pause` / `stop`** — Lifecycle events for UI state sync.

### No Adapter = State-Only Mode

When constructed without an adapter, playback methods become no-ops. Useful for testing or server-side state management.

## PlayoutAdapter Interface

The engine defines a minimal interface for audio playback. Each adapter is a separate package.

```typescript
interface PlayoutAdapter {
  /** Initialize the audio context (call on user interaction) */
  init(): Promise<void>;

  /** Provide tracks with AudioBuffers for playback scheduling */
  setTracks(tracks: ClipTrack[]): void;

  /** Start playback from a position */
  play(startTime: number, endTime?: number): Promise<void>;

  /** Pause playback */
  pause(): void;

  /** Stop and reset */
  stop(): void;

  /** Seek to position (seconds) */
  seek(time: number): void;

  /** Get current playback time (seconds) — called in RAF loop */
  getCurrentTime(): number;

  /** Whether audio is currently playing */
  isPlaying(): boolean;

  /** Set master volume (0.0 - 1.0) */
  setMasterVolume(volume: number): void;

  /** Set per-track volume */
  setTrackVolume(trackId: string, volume: number): void;

  /** Set per-track mute */
  setTrackMute(trackId: string, muted: boolean): void;

  /** Set per-track solo */
  setTrackSolo(trackId: string, soloed: boolean): void;

  /** Set per-track pan (-1.0 to 1.0) */
  setTrackPan(trackId: string, pan: number): void;

  /** Dispose all audio resources */
  dispose(): void;

  /** Optional effects support (future) */
  effects?: {
    addEffect(trackId: string | 'master', effect: unknown): void;
    removeEffect(trackId: string | 'master', effectId: string): void;
    setParameter(effectId: string, param: string, value: number): void;
  };
}
```

**Audio loading is NOT part of the adapter.** The engine (or consumer) handles fetch+decode via `@waveform-playlist/loaders` or their own loading strategy. The adapter receives clips with AudioBuffers already attached.

### Planned Adapter Packages

- `@waveform-playlist/playout-adapter-tone` — Wraps existing `TonePlayout`/`ToneTrack` (ships first)
- `@waveform-playlist/playout-adapter-opendaw` — Future openDAW integration
- Third parties can implement the interface for any audio backend

## Framework Binding Examples

### React (thin hook wrapper)

```typescript
function usePlaylistEngine(options) {
  const engineRef = useRef(new PlaylistEngine(options));
  const [state, setState] = useState(engineRef.current.getState());

  useEffect(() => {
    const handler = (s) => setState(s);
    engineRef.current.on('statechange', handler);
    return () => engineRef.current.off('statechange', handler);
  }, []);

  return engineRef.current;
}
```

### Svelte (store wrapper)

```typescript
function createPlaylistStore(options) {
  const engine = new PlaylistEngine(options);
  const { subscribe, set } = writable(engine.getState());
  engine.on('statechange', set);
  return { subscribe, engine };
}
```

## Scope

### Phase 1 (this design)
- Operations module: clip, viewport, timeline
- PlaylistEngine class with event emitter
- PlayoutAdapter interface
- Unit tests for all operations

### Future Phases
- Effects operations + adapter effects interface
- Recording operations
- Waveform data / worker management
- Keyboard shortcut engine
- Annotation operations
- Tone.js adapter package (`playout-adapter-tone`)
- openDAW adapter package

## Decision Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Goal | Framework portability + testability | User wants Svelte support eventually |
| API style | Stateful engine class | Simpler for consumers than pure functions alone |
| Audio coupling | Pluggable adapter interface | Support Tone.js now, openDAW later |
| Audio loading | Outside the adapter | Loading is orthogonal to playback |
| Phase 1 scope | Core timeline only | Smallest useful extraction, expand later |
| Package location | New `@waveform-playlist/engine` | Keep `core` as pure types |
| Architecture | Layered (operations + stateful shell) | Max flexibility — use either layer |
