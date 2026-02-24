# Engine Extraction Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create `@waveform-playlist/engine` — a framework-agnostic package that extracts pure business logic from React hooks into testable operations and a stateful engine class.

**Architecture:** Two layers: (1) pure operations functions for clip editing, viewport math, and timeline calculations, (2) a stateful `PlaylistEngine` class that wraps operations with event-driven state management and a pluggable `PlayoutAdapter` interface.

**Tech Stack:** TypeScript, tsup (build), vitest (unit tests), `@waveform-playlist/core` (types)

---

### Task 1: Scaffold the engine package

**Files:**
- Create: `packages/engine/package.json`
- Create: `packages/engine/tsconfig.json`
- Create: `packages/engine/tsup.config.ts`
- Create: `packages/engine/src/index.ts`

**Step 1: Create package.json**

```json
{
  "name": "@waveform-playlist/engine",
  "version": "7.1.2",
  "description": "Framework-agnostic engine for waveform-playlist — pure operations and stateful timeline management",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    }
  },
  "sideEffects": false,
  "scripts": {
    "build": "pnpm typecheck && tsup",
    "dev": "tsup --watch",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "keywords": [
    "waveform",
    "audio",
    "webaudio",
    "waveform-playlist",
    "engine"
  ],
  "author": "Naomi Aro",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/naomiaro/waveform-playlist.git",
    "directory": "packages/engine"
  },
  "homepage": "https://naomiaro.github.io/waveform-playlist",
  "bugs": {
    "url": "https://github.com/naomiaro/waveform-playlist/issues"
  },
  "files": [
    "dist",
    "README.md"
  ],
  "devDependencies": {
    "@waveform-playlist/core": "workspace:*",
    "tsup": "^8.0.1",
    "typescript": "^5.3.3",
    "vitest": "^3.0.0"
  },
  "peerDependencies": {
    "@waveform-playlist/core": ">=7.0.0"
  },
  "dependencies": {}
}
```

**Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": false
  },
  "include": ["src/**/*"]
}
```

**Step 3: Create tsup.config.ts**

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
});
```

**Step 4: Create placeholder src/index.ts**

```typescript
// Operations (pure functions)
export * from './operations';

// Engine types
export * from './types';
```

**Step 5: Create placeholder src/types.ts**

```typescript
import type { ClipTrack } from '@waveform-playlist/core';

/**
 * Interface for pluggable audio playback adapters.
 * Implement this to connect PlaylistEngine to any audio backend
 * (Tone.js, openDAW, HTMLAudioElement, etc.)
 */
export interface PlayoutAdapter {
  init(): Promise<void>;
  setTracks(tracks: ClipTrack[]): void;
  play(startTime: number, endTime?: number): Promise<void>;
  pause(): void;
  stop(): void;
  seek(time: number): void;
  getCurrentTime(): number;
  isPlaying(): boolean;
  setMasterVolume(volume: number): void;
  setTrackVolume(trackId: string, volume: number): void;
  setTrackMute(trackId: string, muted: boolean): void;
  setTrackSolo(trackId: string, soloed: boolean): void;
  setTrackPan(trackId: string, pan: number): void;
  dispose(): void;
}

/**
 * Snapshot of playlist engine state, emitted on every state change.
 */
export interface EngineState {
  tracks: ClipTrack[];
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  samplesPerPixel: number;
  sampleRate: number;
  selectedTrackId: string | null;
  zoomIndex: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
}

/**
 * Configuration options for PlaylistEngine constructor.
 */
export interface PlaylistEngineOptions {
  adapter?: PlayoutAdapter;
  sampleRate?: number;
  samplesPerPixel?: number;
  zoomLevels?: number[];
}

/**
 * Events emitted by PlaylistEngine.
 */
export interface EngineEvents {
  statechange: (state: EngineState) => void;
  timeupdate: (time: number) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
}
```

**Step 6: Create placeholder src/operations/index.ts**

```typescript
export * from './clipOperations';
export * from './viewportOperations';
export * from './timelineOperations';
```

**Step 7: Install dependencies and verify build**

Run: `cd /Users/naomiaro/Code/waveform-playlist && pnpm install`
Run: `pnpm --filter @waveform-playlist/engine build`
Expected: Build succeeds (will fail until operation files exist — that's fine for now)

**Step 8: Commit**

```bash
git add packages/engine/
git commit -m "chore: scaffold @waveform-playlist/engine package"
```

---

### Task 2: Implement timelineOperations with tests

**Files:**
- Create: `packages/engine/src/operations/timelineOperations.ts`
- Create: `packages/engine/src/__tests__/timelineOperations.test.ts`

**Step 1: Write the failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import {
  calculateDuration,
  calculateZoomScrollPosition,
  findClosestZoomIndex,
  clampSeekPosition,
} from '../operations/timelineOperations';

describe('calculateDuration', () => {
  it('returns 0 for empty tracks', () => {
    expect(calculateDuration([], 44100)).toBe(0);
  });

  it('returns 0 for tracks with no clips', () => {
    const tracks = [{ id: '1', name: 'Track 1', clips: [], muted: false, soloed: false, volume: 1, pan: 0 }];
    expect(calculateDuration(tracks, 44100)).toBe(0);
  });

  it('calculates duration from the furthest clip end', () => {
    const tracks = [{
      id: '1', name: 'Track 1', muted: false, soloed: false, volume: 1, pan: 0,
      clips: [
        { id: 'c1', startSample: 0, durationSamples: 44100, offsetSamples: 0, sampleRate: 44100, sourceDurationSamples: 44100, gain: 1 },
        { id: 'c2', startSample: 44100, durationSamples: 22050, offsetSamples: 0, sampleRate: 44100, sourceDurationSamples: 22050, gain: 1 },
      ],
    }];
    expect(calculateDuration(tracks, 44100)).toBe(1.5);
  });

  it('considers clips across multiple tracks', () => {
    const tracks = [
      {
        id: '1', name: 'Track 1', muted: false, soloed: false, volume: 1, pan: 0,
        clips: [{ id: 'c1', startSample: 0, durationSamples: 44100, offsetSamples: 0, sampleRate: 44100, sourceDurationSamples: 44100, gain: 1 }],
      },
      {
        id: '2', name: 'Track 2', muted: false, soloed: false, volume: 1, pan: 0,
        clips: [{ id: 'c2', startSample: 88200, durationSamples: 44100, offsetSamples: 0, sampleRate: 44100, sourceDurationSamples: 44100, gain: 1 }],
      },
    ];
    expect(calculateDuration(tracks, 44100)).toBe(3);
  });
});

describe('findClosestZoomIndex', () => {
  const levels = [256, 512, 1024, 2048, 4096, 8192];

  it('returns exact match index', () => {
    expect(findClosestZoomIndex(1024, levels)).toBe(2);
  });

  it('returns middle index when no match found', () => {
    expect(findClosestZoomIndex(999, levels)).toBe(3);
  });

  it('returns 0 for first level match', () => {
    expect(findClosestZoomIndex(256, levels)).toBe(0);
  });
});

describe('calculateZoomScrollPosition', () => {
  it('keeps viewport centered when zooming in', () => {
    // Viewport: scrollLeft=500, width=1000, center at pixel 1000
    // At 1024 spp, center time = (1000 * 1024) / 44100
    // At 512 spp, new center pixel = centerTime * 44100 / 512
    const result = calculateZoomScrollPosition(1024, 512, 500, 1000, 44100);
    expect(result).toBeGreaterThan(500); // Should scroll further right at higher zoom
  });

  it('returns 0 when result would be negative', () => {
    const result = calculateZoomScrollPosition(1024, 512, 0, 1000, 44100);
    expect(result).toBe(0);
  });
});

describe('clampSeekPosition', () => {
  it('clamps negative values to 0', () => {
    expect(clampSeekPosition(-1, 10)).toBe(0);
  });

  it('clamps values beyond duration', () => {
    expect(clampSeekPosition(15, 10)).toBe(10);
  });

  it('passes through valid values', () => {
    expect(clampSeekPosition(5, 10)).toBe(5);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm --filter @waveform-playlist/engine test`
Expected: FAIL — module not found

**Step 3: Implement timelineOperations.ts**

Extract logic from `WaveformPlaylistContext.tsx` (lines 410-423, 338-362) and `useZoomControls.ts` (lines 22-25).

```typescript
import type { ClipTrack } from '@waveform-playlist/core';

/**
 * Calculate total timeline duration from all tracks/clips.
 * Returns duration in seconds.
 *
 * Extracted from WaveformPlaylistContext.tsx duration calculation.
 */
export function calculateDuration(tracks: ClipTrack[], sampleRate: number): number {
  let maxDuration = 0;
  for (const track of tracks) {
    for (const clip of track.clips) {
      const clipEndSample = clip.startSample + clip.durationSamples;
      const clipEnd = clipEndSample / clip.sampleRate;
      maxDuration = Math.max(maxDuration, clipEnd);
    }
  }
  return maxDuration;
}

/**
 * Find the zoom level index matching a given samplesPerPixel value.
 * Falls back to middle of array if no exact match.
 *
 * Extracted from useZoomControls.ts (lines 22-25).
 */
export function findClosestZoomIndex(
  targetSamplesPerPixel: number,
  zoomLevels: number[],
): number {
  const index = zoomLevels.indexOf(targetSamplesPerPixel);
  return index !== -1 ? index : Math.floor(zoomLevels.length / 2);
}

/**
 * Calculate new scroll position to keep viewport centered when zoom level changes.
 * Returns the new scrollLeft value in pixels.
 *
 * Extracted from WaveformPlaylistContext.tsx (lines 338-362).
 *
 * @param oldSamplesPerPixel - Previous zoom level
 * @param newSamplesPerPixel - New zoom level
 * @param scrollLeft - Current scroll position in pixels
 * @param containerWidth - Visible container width in pixels
 * @param sampleRate - Audio sample rate
 * @param controlWidth - Width of side control panel in pixels (default 0)
 */
export function calculateZoomScrollPosition(
  oldSamplesPerPixel: number,
  newSamplesPerPixel: number,
  scrollLeft: number,
  containerWidth: number,
  sampleRate: number,
  controlWidth: number = 0,
): number {
  const centerPixel = scrollLeft + containerWidth / 2 - controlWidth;
  const centerTime = (centerPixel * oldSamplesPerPixel) / sampleRate;
  const newCenterPixel = (centerTime * sampleRate) / newSamplesPerPixel;
  const newScrollLeft = newCenterPixel + controlWidth - containerWidth / 2;
  return Math.max(0, newScrollLeft);
}

/**
 * Clamp a seek position to be within valid range [0, duration].
 */
export function clampSeekPosition(time: number, duration: number): number {
  return Math.max(0, Math.min(time, duration));
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm --filter @waveform-playlist/engine test`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add packages/engine/src/operations/timelineOperations.ts packages/engine/src/__tests__/timelineOperations.test.ts
git commit -m "feat(engine): add timelineOperations — duration, zoom, and seek math"
```

---

### Task 3: Implement clipOperations with tests

**Files:**
- Create: `packages/engine/src/operations/clipOperations.ts`
- Create: `packages/engine/src/__tests__/clipOperations.test.ts`

**Step 1: Write the failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import type { AudioClip } from '@waveform-playlist/core';
import {
  constrainClipDrag,
  constrainBoundaryTrim,
  calculateSplitPoint,
  splitClip,
  canSplitAt,
} from '../operations/clipOperations';

function makeClip(overrides: Partial<AudioClip> & { id: string; startSample: number; durationSamples: number }): AudioClip {
  return {
    offsetSamples: 0,
    sampleRate: 44100,
    sourceDurationSamples: 441000,
    gain: 1,
    ...overrides,
  };
}

describe('constrainClipDrag', () => {
  it('prevents clip from going before sample 0', () => {
    const clip = makeClip({ id: 'c1', startSample: 1000, durationSamples: 5000 });
    const result = constrainClipDrag(clip, -2000, [clip], 0);
    expect(result).toBe(-1000);
  });

  it('allows valid movement', () => {
    const clip = makeClip({ id: 'c1', startSample: 1000, durationSamples: 5000 });
    const result = constrainClipDrag(clip, 500, [clip], 0);
    expect(result).toBe(500);
  });

  it('prevents overlap with previous clip', () => {
    const prev = makeClip({ id: 'c1', startSample: 0, durationSamples: 5000 });
    const clip = makeClip({ id: 'c2', startSample: 10000, durationSamples: 5000 });
    const sorted = [prev, clip];
    const result = constrainClipDrag(clip, -8000, sorted, 1);
    expect(result).toBe(-5000); // Can only move back to end of previous clip
  });

  it('prevents overlap with next clip', () => {
    const clip = makeClip({ id: 'c1', startSample: 0, durationSamples: 5000 });
    const next = makeClip({ id: 'c2', startSample: 10000, durationSamples: 5000 });
    const sorted = [clip, next];
    const result = constrainClipDrag(clip, 8000, sorted, 0);
    expect(result).toBe(5000); // Can only move to be adjacent to next clip
  });
});

describe('constrainBoundaryTrim', () => {
  it('prevents left trim from going below startSample 0', () => {
    const clip = makeClip({ id: 'c1', startSample: 500, durationSamples: 5000 });
    const result = constrainBoundaryTrim(clip, -1000, 'left', [clip], 0, 4410);
    expect(result).toBe(-500);
  });

  it('prevents left trim from going below offsetSamples 0', () => {
    const clip = makeClip({ id: 'c1', startSample: 5000, durationSamples: 5000, offsetSamples: 200 });
    const result = constrainBoundaryTrim(clip, -1000, 'left', [clip], 0, 4410);
    expect(result).toBe(-200);
  });

  it('enforces minimum duration on left trim', () => {
    const clip = makeClip({ id: 'c1', startSample: 0, durationSamples: 10000 });
    const minDuration = 4410;
    const result = constrainBoundaryTrim(clip, 8000, 'left', [clip], 0, minDuration);
    expect(result).toBe(10000 - minDuration);
  });

  it('enforces minimum duration on right trim', () => {
    const clip = makeClip({ id: 'c1', startSample: 0, durationSamples: 10000 });
    const minDuration = 4410;
    const result = constrainBoundaryTrim(clip, -8000, 'right', [clip], 0, minDuration);
    expect(result).toBe(minDuration - 10000);
  });

  it('prevents right trim from exceeding source audio length', () => {
    const clip = makeClip({ id: 'c1', startSample: 0, durationSamples: 10000, sourceDurationSamples: 12000, offsetSamples: 1000 });
    // Max expansion: sourceDuration - offset = 12000 - 1000 = 11000
    const result = constrainBoundaryTrim(clip, 5000, 'right', [clip], 0, 4410);
    expect(result).toBe(1000); // Can only grow by 1000 more samples
  });

  it('prevents right trim overlap with next clip', () => {
    const clip = makeClip({ id: 'c1', startSample: 0, durationSamples: 5000 });
    const next = makeClip({ id: 'c2', startSample: 6000, durationSamples: 5000 });
    const sorted = [clip, next];
    const result = constrainBoundaryTrim(clip, 3000, 'right', sorted, 0, 4410);
    expect(result).toBe(1000); // Can only grow by 1000 before hitting next clip
  });
});

describe('calculateSplitPoint', () => {
  it('snaps to pixel boundary', () => {
    // 50000 samples / 1024 spp = pixel 48 → snapped sample = 49152
    const result = calculateSplitPoint(50000, 1024);
    expect(result).toBe(48 * 1024);
  });

  it('handles exact pixel boundary', () => {
    const result = calculateSplitPoint(2048, 1024);
    expect(result).toBe(2048);
  });
});

describe('splitClip', () => {
  it('creates two clips that cover the original range', () => {
    const clip = makeClip({ id: 'c1', startSample: 0, durationSamples: 10000, offsetSamples: 0, name: 'Test' });
    const { left, right } = splitClip(clip, 5000);

    expect(left.startSample).toBe(0);
    expect(left.durationSamples).toBe(5000);
    expect(left.offsetSamples).toBe(0);

    expect(right.startSample).toBe(5000);
    expect(right.durationSamples).toBe(5000);
    expect(right.offsetSamples).toBe(5000);
  });

  it('preserves fadeIn on left clip and fadeOut on right clip', () => {
    const clip = makeClip({
      id: 'c1', startSample: 0, durationSamples: 10000,
      fadeIn: { duration: 0.5 },
      fadeOut: { duration: 0.3 },
    });
    const { left, right } = splitClip(clip, 5000);

    expect(left.fadeIn).toEqual({ duration: 0.5 });
    expect(left.fadeOut).toBeUndefined();
    expect(right.fadeIn).toBeUndefined();
    expect(right.fadeOut).toEqual({ duration: 0.3 });
  });

  it('names split clips with (1) and (2) suffixes', () => {
    const clip = makeClip({ id: 'c1', startSample: 0, durationSamples: 10000, name: 'Vocal' });
    const { left, right } = splitClip(clip, 5000);
    expect(left.name).toBe('Vocal (1)');
    expect(right.name).toBe('Vocal (2)');
  });

  it('handles clip with non-zero offset', () => {
    const clip = makeClip({ id: 'c1', startSample: 1000, durationSamples: 8000, offsetSamples: 2000 });
    const { left, right } = splitClip(clip, 5000);

    expect(left.startSample).toBe(1000);
    expect(left.durationSamples).toBe(4000); // 5000 - 1000
    expect(left.offsetSamples).toBe(2000);

    expect(right.startSample).toBe(5000);
    expect(right.durationSamples).toBe(4000); // 9000 - 5000
    expect(right.offsetSamples).toBe(6000); // 2000 + (5000 - 1000)
  });
});

describe('canSplitAt', () => {
  it('returns true for valid split point', () => {
    const clip = makeClip({ id: 'c1', startSample: 0, durationSamples: 44100 });
    expect(canSplitAt(clip, 22050, 4410)).toBe(true);
  });

  it('returns false at clip start', () => {
    const clip = makeClip({ id: 'c1', startSample: 0, durationSamples: 44100 });
    expect(canSplitAt(clip, 0, 4410)).toBe(false);
  });

  it('returns false at clip end', () => {
    const clip = makeClip({ id: 'c1', startSample: 0, durationSamples: 44100 });
    expect(canSplitAt(clip, 44100, 4410)).toBe(false);
  });

  it('returns false if either resulting clip would be too short', () => {
    const clip = makeClip({ id: 'c1', startSample: 0, durationSamples: 44100 });
    // Splitting at sample 100 would make left clip only 100 samples (< 4410 min)
    expect(canSplitAt(clip, 100, 4410)).toBe(false);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm --filter @waveform-playlist/engine test`
Expected: FAIL — module not found

**Step 3: Implement clipOperations.ts**

Extract logic from `useClipDragHandlers.ts` (lines 85-113, 210-286) and `useClipSplitting.ts` (lines 52-127).

```typescript
import { type AudioClip, createClip } from '@waveform-playlist/core';

/**
 * Calculate constrained drag delta for clip movement to prevent overlaps.
 * Returns the constrained delta in samples.
 *
 * Extracted from useClipDragHandlers.ts collision detection (lines 85-113, 337-356).
 *
 * @param clip - The clip being dragged
 * @param deltaSamples - Desired movement delta in samples
 * @param sortedClips - All clips on the track, sorted by startSample
 * @param clipIndex - Index of the dragged clip in sortedClips
 * @returns Constrained delta in samples
 */
export function constrainClipDrag(
  clip: AudioClip,
  deltaSamples: number,
  sortedClips: AudioClip[],
  clipIndex: number,
): number {
  let newStartSample = Math.floor(clip.startSample + deltaSamples);

  // Constraint 1: Cannot go before sample 0
  newStartSample = Math.max(0, newStartSample);

  // Constraint 2: Cannot overlap with previous clip
  const previousClip = clipIndex > 0 ? sortedClips[clipIndex - 1] : null;
  if (previousClip) {
    const previousEndSample = previousClip.startSample + previousClip.durationSamples;
    newStartSample = Math.max(newStartSample, previousEndSample);
  }

  // Constraint 3: Cannot overlap with next clip
  const nextClip = clipIndex < sortedClips.length - 1 ? sortedClips[clipIndex + 1] : null;
  if (nextClip) {
    const newEndSample = newStartSample + clip.durationSamples;
    if (newEndSample > nextClip.startSample) {
      newStartSample = nextClip.startSample - clip.durationSamples;
    }
  }

  return newStartSample - clip.startSample;
}

/**
 * Calculate constrained trim delta for left or right boundary trimming.
 * Returns the constrained delta in samples.
 *
 * Extracted from useClipDragHandlers.ts boundary trim logic (lines 196-286).
 *
 * For left boundary: positive delta shrinks clip (moves left edge right),
 * negative delta expands clip (moves left edge left).
 *
 * For right boundary: positive delta expands clip (moves right edge right),
 * negative delta shrinks clip (moves right edge left).
 *
 * @param clip - The clip being trimmed (original state before drag started)
 * @param deltaSamples - Cumulative drag delta in samples
 * @param boundary - Which boundary is being trimmed
 * @param sortedClips - All clips on the track, sorted by startSample
 * @param clipIndex - Index of the trimmed clip in sortedClips
 * @param minDurationSamples - Minimum clip duration in samples
 * @returns Constrained delta in samples
 */
export function constrainBoundaryTrim(
  clip: AudioClip,
  deltaSamples: number,
  boundary: 'left' | 'right',
  sortedClips: AudioClip[],
  clipIndex: number,
  minDurationSamples: number,
): number {
  if (boundary === 'left') {
    let constrainedDelta = Math.floor(deltaSamples);

    // Constraint 1: startSample cannot go below 0
    const minDeltaForStart = -clip.startSample;
    if (constrainedDelta < minDeltaForStart) {
      constrainedDelta = minDeltaForStart;
    }

    // Constraint 2: offsetSamples cannot go below 0
    const minDeltaForOffset = -clip.offsetSamples;
    if (constrainedDelta < minDeltaForOffset) {
      constrainedDelta = minDeltaForOffset;
    }

    // Constraint 3: Cannot overlap with previous clip
    const previousClip = clipIndex > 0 ? sortedClips[clipIndex - 1] : null;
    if (previousClip) {
      const previousEndSample = previousClip.startSample + previousClip.durationSamples;
      const minDeltaForPrevious = previousEndSample - clip.startSample;
      if (constrainedDelta < minDeltaForPrevious) {
        constrainedDelta = minDeltaForPrevious;
      }
    }

    // Constraint 4: Minimum duration
    const maxDeltaForMinDuration = clip.durationSamples - minDurationSamples;
    if (constrainedDelta > maxDeltaForMinDuration) {
      constrainedDelta = maxDeltaForMinDuration;
    }

    return constrainedDelta;
  } else {
    // Right boundary: delta is applied to durationSamples
    let newDurationSamples = Math.floor(clip.durationSamples + deltaSamples);

    // Constraint 1: Minimum duration
    newDurationSamples = Math.max(minDurationSamples, newDurationSamples);

    // Constraint 2: Cannot exceed source audio length
    const maxDuration = clip.sourceDurationSamples - clip.offsetSamples;
    if (newDurationSamples > maxDuration) {
      newDurationSamples = maxDuration;
    }

    // Constraint 3: Cannot overlap with next clip
    const nextClip = clipIndex < sortedClips.length - 1 ? sortedClips[clipIndex + 1] : null;
    if (nextClip) {
      const newEndSample = clip.startSample + newDurationSamples;
      if (newEndSample > nextClip.startSample) {
        newDurationSamples = nextClip.startSample - clip.startSample;
        newDurationSamples = Math.max(minDurationSamples, newDurationSamples);
      }
    }

    return newDurationSamples - clip.durationSamples;
  }
}

/**
 * Calculate split point snapped to pixel boundary.
 * Returns the snapped sample position.
 *
 * Extracted from useClipSplitting.ts (lines 79-84).
 */
export function calculateSplitPoint(
  splitSample: number,
  samplesPerPixel: number,
): number {
  const splitPixel = Math.floor(splitSample / samplesPerPixel);
  return splitPixel * samplesPerPixel;
}

/**
 * Split a clip into two clips at the given sample position.
 * Returns the two new clips. The split sample must be within the clip's range.
 *
 * Extracted from useClipSplitting.ts (lines 86-127).
 *
 * @param clip - The clip to split
 * @param splitSample - The absolute sample position to split at (on the timeline)
 * @returns { left, right } — two new clips covering the original range
 */
export function splitClip(
  clip: AudioClip,
  splitSample: number,
): { left: AudioClip; right: AudioClip } {
  const clipEndSample = clip.startSample + clip.durationSamples;
  const offsetIncrement = splitSample - clip.startSample;

  const left = createClip({
    audioBuffer: clip.audioBuffer,
    startSample: clip.startSample,
    durationSamples: splitSample - clip.startSample,
    offsetSamples: clip.offsetSamples,
    sampleRate: clip.sampleRate,
    sourceDurationSamples: clip.sourceDurationSamples,
    gain: clip.gain,
    name: clip.name ? `${clip.name} (1)` : undefined,
    color: clip.color,
    fadeIn: clip.fadeIn,
    waveformData: clip.waveformData,
  });

  const right = createClip({
    audioBuffer: clip.audioBuffer,
    startSample: splitSample,
    durationSamples: clipEndSample - splitSample,
    offsetSamples: clip.offsetSamples + offsetIncrement,
    sampleRate: clip.sampleRate,
    sourceDurationSamples: clip.sourceDurationSamples,
    gain: clip.gain,
    name: clip.name ? `${clip.name} (2)` : undefined,
    color: clip.color,
    waveformData: clip.waveformData,
    fadeOut: clip.fadeOut,
  });

  return { left, right };
}

/**
 * Check if a clip can be split at the given sample position.
 *
 * Extracted from useClipSplitting.ts (lines 63-73).
 *
 * @param clip - The clip to check
 * @param sample - The absolute sample position to split at
 * @param minDurationSamples - Minimum clip duration in samples
 * @returns true if the split would produce two valid clips
 */
export function canSplitAt(
  clip: AudioClip,
  sample: number,
  minDurationSamples: number,
): boolean {
  const clipEnd = clip.startSample + clip.durationSamples;

  // Must be strictly within clip bounds
  if (sample <= clip.startSample || sample >= clipEnd) {
    return false;
  }

  // Both resulting clips must meet minimum duration
  const leftDuration = sample - clip.startSample;
  const rightDuration = clipEnd - sample;
  return leftDuration >= minDurationSamples && rightDuration >= minDurationSamples;
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm --filter @waveform-playlist/engine test`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add packages/engine/src/operations/clipOperations.ts packages/engine/src/__tests__/clipOperations.test.ts
git commit -m "feat(engine): add clipOperations — drag constraints, trim, and split"
```

---

### Task 4: Implement viewportOperations with tests

**Files:**
- Create: `packages/engine/src/operations/viewportOperations.ts`
- Create: `packages/engine/src/__tests__/viewportOperations.test.ts`

**Step 1: Write the failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import {
  calculateViewportBounds,
  getVisibleChunkIndices,
  shouldUpdateViewport,
} from '../operations/viewportOperations';

describe('calculateViewportBounds', () => {
  it('includes buffer on both sides', () => {
    const result = calculateViewportBounds(500, 1000);
    // Default buffer = 1.5x container width = 1500
    expect(result.visibleStart).toBe(0); // max(0, 500 - 1500)
    expect(result.visibleEnd).toBe(3000); // 500 + 1000 + 1500
  });

  it('clamps visibleStart to 0', () => {
    const result = calculateViewportBounds(100, 1000);
    expect(result.visibleStart).toBe(0);
  });

  it('respects custom buffer ratio', () => {
    const result = calculateViewportBounds(5000, 1000, 2.0);
    // Buffer = 2.0 * 1000 = 2000
    expect(result.visibleStart).toBe(3000);
    expect(result.visibleEnd).toBe(8000);
  });
});

describe('getVisibleChunkIndices', () => {
  it('returns all chunks when no viewport constraint', () => {
    const result = getVisibleChunkIndices(3000, 1000, 0, 5000);
    expect(result).toEqual([0, 1, 2]);
  });

  it('filters out chunks outside viewport', () => {
    // Viewport: 1500-3500 visible
    const result = getVisibleChunkIndices(5000, 1000, 1500, 3500);
    // Chunk 0: 0-1000 (end 1000 <= 1500 start → hidden)
    // Chunk 1: 1000-2000 (visible)
    // Chunk 2: 2000-3000 (visible)
    // Chunk 3: 3000-4000 (visible, starts before 3500)
    // Chunk 4: 4000-5000 (start 4000 >= 3500 end → hidden)
    expect(result).toEqual([1, 2, 3]);
  });

  it('handles partial last chunk', () => {
    const result = getVisibleChunkIndices(2500, 1000, 0, 5000);
    // Chunk 0: 0-1000, Chunk 1: 1000-2000, Chunk 2: 2000-2500 (partial)
    expect(result).toEqual([0, 1, 2]);
  });

  it('returns empty array for zero width', () => {
    const result = getVisibleChunkIndices(0, 1000, 0, 5000);
    expect(result).toEqual([]);
  });
});

describe('shouldUpdateViewport', () => {
  it('returns false for small scroll changes', () => {
    expect(shouldUpdateViewport(100, 150)).toBe(false);
  });

  it('returns true for scroll changes above threshold', () => {
    expect(shouldUpdateViewport(100, 250)).toBe(true);
  });

  it('respects custom threshold', () => {
    expect(shouldUpdateViewport(100, 140, 50)).toBe(false);
    expect(shouldUpdateViewport(100, 160, 50)).toBe(true);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm --filter @waveform-playlist/engine test`
Expected: FAIL — module not found

**Step 3: Implement viewportOperations.ts**

Extract logic from `ScrollViewport.tsx` (lines 42-54, 171-190).

```typescript
/**
 * Calculate visible region with overscan buffer for virtual scrolling.
 *
 * Extracted from ScrollViewport.tsx ViewportStore.update() (lines 42-45).
 *
 * @param scrollLeft - Current scroll position in pixels
 * @param containerWidth - Visible container width in pixels
 * @param bufferRatio - Overscan buffer as ratio of container width (default 1.5)
 * @returns Bounds of the rendering window in pixels
 */
export function calculateViewportBounds(
  scrollLeft: number,
  containerWidth: number,
  bufferRatio: number = 1.5,
): { visibleStart: number; visibleEnd: number } {
  const buffer = containerWidth * bufferRatio;
  return {
    visibleStart: Math.max(0, scrollLeft - buffer),
    visibleEnd: scrollLeft + containerWidth + buffer,
  };
}

/**
 * Get array of chunk indices that fall within the visible viewport.
 *
 * Extracted from ScrollViewport.tsx useVisibleChunkIndices() (lines 173-188).
 *
 * @param totalWidth - Total width of content in CSS pixels
 * @param chunkWidth - Width of each chunk in CSS pixels (typically 1000)
 * @param visibleStart - Left edge of visible region (from calculateViewportBounds)
 * @param visibleEnd - Right edge of visible region (from calculateViewportBounds)
 * @returns Array of chunk indices within the viewport
 */
export function getVisibleChunkIndices(
  totalWidth: number,
  chunkWidth: number,
  visibleStart: number,
  visibleEnd: number,
): number[] {
  const totalChunks = Math.ceil(totalWidth / chunkWidth);
  const indices: number[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const chunkLeft = i * chunkWidth;
    const thisChunkWidth = Math.min(totalWidth - chunkLeft, chunkWidth);
    const chunkEnd = chunkLeft + thisChunkWidth;

    if (chunkEnd <= visibleStart || chunkLeft >= visibleEnd) {
      continue;
    }

    indices.push(i);
  }

  return indices;
}

/**
 * Check if a scroll change is large enough to warrant a viewport update.
 *
 * Extracted from ScrollViewport.tsx ViewportStore.update() (lines 48-54).
 *
 * @param oldScrollLeft - Previous scroll position
 * @param newScrollLeft - New scroll position
 * @param threshold - Minimum pixel change to trigger update (default 100)
 * @returns true if the viewport should be recalculated
 */
export function shouldUpdateViewport(
  oldScrollLeft: number,
  newScrollLeft: number,
  threshold: number = 100,
): boolean {
  return Math.abs(oldScrollLeft - newScrollLeft) >= threshold;
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm --filter @waveform-playlist/engine test`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add packages/engine/src/operations/viewportOperations.ts packages/engine/src/__tests__/viewportOperations.test.ts
git commit -m "feat(engine): add viewportOperations — bounds, chunk visibility, scroll threshold"
```

---

### Task 5: Implement PlaylistEngine class with tests

**Files:**
- Create: `packages/engine/src/PlaylistEngine.ts`
- Create: `packages/engine/src/__tests__/PlaylistEngine.test.ts`
- Modify: `packages/engine/src/index.ts`

**Step 1: Write the failing tests**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ClipTrack, AudioClip } from '@waveform-playlist/core';
import { PlaylistEngine } from '../PlaylistEngine';
import type { PlayoutAdapter, EngineState } from '../types';

function makeClip(overrides: Partial<AudioClip> & { id: string; startSample: number; durationSamples: number }): AudioClip {
  return {
    offsetSamples: 0,
    sampleRate: 44100,
    sourceDurationSamples: 441000,
    gain: 1,
    ...overrides,
  };
}

function makeTrack(id: string, clips: AudioClip[]): ClipTrack {
  return { id, name: `Track ${id}`, clips, muted: false, soloed: false, volume: 1, pan: 0 };
}

function createMockAdapter(): PlayoutAdapter {
  return {
    init: vi.fn().mockResolvedValue(undefined),
    setTracks: vi.fn(),
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    stop: vi.fn(),
    seek: vi.fn(),
    getCurrentTime: vi.fn().mockReturnValue(0),
    isPlaying: vi.fn().mockReturnValue(false),
    setMasterVolume: vi.fn(),
    setTrackVolume: vi.fn(),
    setTrackMute: vi.fn(),
    setTrackSolo: vi.fn(),
    setTrackPan: vi.fn(),
    dispose: vi.fn(),
  };
}

describe('PlaylistEngine', () => {
  describe('construction', () => {
    it('initializes with defaults', () => {
      const engine = new PlaylistEngine();
      const state = engine.getState();
      expect(state.tracks).toEqual([]);
      expect(state.sampleRate).toBe(44100);
      expect(state.samplesPerPixel).toBe(1000);
      expect(state.isPlaying).toBe(false);
      expect(state.currentTime).toBe(0);
      expect(state.selectedTrackId).toBeNull();
      engine.dispose();
    });

    it('accepts custom options', () => {
      const engine = new PlaylistEngine({
        sampleRate: 48000,
        samplesPerPixel: 512,
        zoomLevels: [256, 512, 1024],
      });
      const state = engine.getState();
      expect(state.sampleRate).toBe(48000);
      expect(state.samplesPerPixel).toBe(512);
      engine.dispose();
    });
  });

  describe('track management', () => {
    let engine: PlaylistEngine;

    beforeEach(() => {
      engine = new PlaylistEngine();
    });

    it('sets tracks and emits statechange', () => {
      const listener = vi.fn();
      engine.on('statechange', listener);

      const tracks = [makeTrack('t1', [makeClip({ id: 'c1', startSample: 0, durationSamples: 44100 })])];
      engine.setTracks(tracks);

      expect(engine.getState().tracks).toEqual(tracks);
      expect(engine.getState().duration).toBe(1);
      expect(listener).toHaveBeenCalledTimes(1);
      engine.dispose();
    });

    it('adds a track', () => {
      const track = makeTrack('t1', []);
      engine.addTrack(track);
      expect(engine.getState().tracks).toHaveLength(1);
      engine.dispose();
    });

    it('removes a track', () => {
      const track = makeTrack('t1', []);
      engine.setTracks([track]);
      engine.removeTrack('t1');
      expect(engine.getState().tracks).toHaveLength(0);
      engine.dispose();
    });

    it('selects a track', () => {
      engine.selectTrack('t1');
      expect(engine.getState().selectedTrackId).toBe('t1');
      engine.selectTrack(null);
      expect(engine.getState().selectedTrackId).toBeNull();
      engine.dispose();
    });
  });

  describe('clip editing', () => {
    let engine: PlaylistEngine;

    beforeEach(() => {
      const clip1 = makeClip({ id: 'c1', startSample: 0, durationSamples: 44100, name: 'Clip 1' });
      const clip2 = makeClip({ id: 'c2', startSample: 88200, durationSamples: 44100 });
      engine = new PlaylistEngine();
      engine.setTracks([makeTrack('t1', [clip1, clip2])]);
    });

    it('moves a clip with collision constraints', () => {
      engine.moveClip('t1', 'c1', 22050);
      const clip = engine.getState().tracks[0].clips[0];
      expect(clip.startSample).toBe(22050);
      engine.dispose();
    });

    it('prevents clip overlap on move', () => {
      // Try to move c1 past c2
      engine.moveClip('t1', 'c1', 100000);
      const clip = engine.getState().tracks[0].clips[0];
      // Should stop at c2's start minus c1's duration
      expect(clip.startSample).toBe(88200 - 44100);
      engine.dispose();
    });

    it('splits a clip', () => {
      engine.splitClip('t1', 'c1', 22050);
      const track = engine.getState().tracks[0];
      expect(track.clips).toHaveLength(3); // c1 split into 2 + c2
      expect(track.clips[0].name).toBe('Clip 1 (1)');
      expect(track.clips[1].name).toBe('Clip 1 (2)');
      engine.dispose();
    });

    it('trims a clip boundary', () => {
      engine.trimClip('t1', 'c1', 'right', -22050);
      const clip = engine.getState().tracks[0].clips[0];
      expect(clip.durationSamples).toBe(22050);
      engine.dispose();
    });
  });

  describe('zoom', () => {
    it('zooms in and out', () => {
      const levels = [256, 512, 1024, 2048];
      const engine = new PlaylistEngine({ samplesPerPixel: 1024, zoomLevels: levels });

      engine.zoomIn();
      expect(engine.getState().samplesPerPixel).toBe(512);
      expect(engine.getState().canZoomIn).toBe(true);

      engine.zoomIn();
      expect(engine.getState().samplesPerPixel).toBe(256);
      expect(engine.getState().canZoomIn).toBe(false);

      engine.zoomOut();
      expect(engine.getState().samplesPerPixel).toBe(512);
      engine.dispose();
    });
  });

  describe('playback delegation', () => {
    it('delegates play/pause/stop to adapter', async () => {
      const adapter = createMockAdapter();
      const engine = new PlaylistEngine({ adapter });

      await engine.play(1.5);
      expect(adapter.play).toHaveBeenCalledWith(1.5, undefined);

      engine.pause();
      expect(adapter.pause).toHaveBeenCalled();

      engine.stop();
      expect(adapter.stop).toHaveBeenCalled();
      engine.dispose();
    });

    it('delegates track audio controls to adapter', () => {
      const adapter = createMockAdapter();
      const engine = new PlaylistEngine({ adapter });

      engine.setTrackVolume('t1', 0.5);
      expect(adapter.setTrackVolume).toHaveBeenCalledWith('t1', 0.5);

      engine.setTrackMute('t1', true);
      expect(adapter.setTrackMute).toHaveBeenCalledWith('t1', true);

      engine.setTrackSolo('t1', true);
      expect(adapter.setTrackSolo).toHaveBeenCalledWith('t1', true);

      engine.setTrackPan('t1', -0.5);
      expect(adapter.setTrackPan).toHaveBeenCalledWith('t1', -0.5);
      engine.dispose();
    });

    it('works without adapter (state-only mode)', async () => {
      const engine = new PlaylistEngine();
      // Should not throw
      await engine.play();
      engine.pause();
      engine.stop();
      engine.dispose();
    });
  });

  describe('events', () => {
    it('supports on/off for statechange', () => {
      const engine = new PlaylistEngine();
      const listener = vi.fn();

      engine.on('statechange', listener);
      engine.setTracks([]);
      expect(listener).toHaveBeenCalledTimes(1);

      engine.off('statechange', listener);
      engine.setTracks([]);
      expect(listener).toHaveBeenCalledTimes(1); // Not called again
      engine.dispose();
    });

    it('emits play/pause/stop events', async () => {
      const adapter = createMockAdapter();
      const engine = new PlaylistEngine({ adapter });
      const playListener = vi.fn();
      const pauseListener = vi.fn();
      const stopListener = vi.fn();

      engine.on('play', playListener);
      engine.on('pause', pauseListener);
      engine.on('stop', stopListener);

      await engine.play();
      expect(playListener).toHaveBeenCalled();

      engine.pause();
      expect(pauseListener).toHaveBeenCalled();

      engine.stop();
      expect(stopListener).toHaveBeenCalled();
      engine.dispose();
    });
  });

  describe('dispose', () => {
    it('disposes adapter and clears listeners', () => {
      const adapter = createMockAdapter();
      const engine = new PlaylistEngine({ adapter });
      const listener = vi.fn();
      engine.on('statechange', listener);

      engine.dispose();
      expect(adapter.dispose).toHaveBeenCalled();
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm --filter @waveform-playlist/engine test`
Expected: FAIL — PlaylistEngine not found

**Step 3: Implement PlaylistEngine.ts**

```typescript
import type { AudioClip, ClipTrack } from '@waveform-playlist/core';
import { sortClipsByTime } from '@waveform-playlist/core';
import {
  constrainClipDrag,
  constrainBoundaryTrim,
  splitClip as splitClipOp,
} from './operations/clipOperations';
import { calculateDuration, findClosestZoomIndex } from './operations/timelineOperations';
import type { PlayoutAdapter, EngineState, EngineEvents, PlaylistEngineOptions } from './types';

const DEFAULT_SAMPLE_RATE = 44100;
const DEFAULT_SAMPLES_PER_PIXEL = 1000;
const DEFAULT_ZOOM_LEVELS = [256, 512, 1024, 2048, 4096, 8192];
const DEFAULT_MIN_DURATION_SECONDS = 0.1;

type EventName = keyof EngineEvents;

export class PlaylistEngine {
  private _tracks: ClipTrack[] = [];
  private _currentTime = 0;
  private _isPlaying = false;
  private _selectedTrackId: string | null = null;
  private _sampleRate: number;
  private _zoomLevels: number[];
  private _zoomIndex: number;
  private _adapter: PlayoutAdapter | null;
  private _animFrameId: number | null = null;
  private _disposed = false;

  private _listeners: Map<string, Set<Function>> = new Map();

  constructor(options: PlaylistEngineOptions = {}) {
    this._sampleRate = options.sampleRate ?? DEFAULT_SAMPLE_RATE;
    this._zoomLevels = options.zoomLevels ?? DEFAULT_ZOOM_LEVELS;
    this._adapter = options.adapter ?? null;

    const initialSpp = options.samplesPerPixel ?? DEFAULT_SAMPLES_PER_PIXEL;
    this._zoomIndex = findClosestZoomIndex(initialSpp, this._zoomLevels);
  }

  // --- State ---

  getState(): EngineState {
    return {
      tracks: this._tracks,
      duration: calculateDuration(this._tracks, this._sampleRate),
      currentTime: this._currentTime,
      isPlaying: this._isPlaying,
      samplesPerPixel: this._zoomLevels[this._zoomIndex],
      sampleRate: this._sampleRate,
      selectedTrackId: this._selectedTrackId,
      zoomIndex: this._zoomIndex,
      canZoomIn: this._zoomIndex > 0,
      canZoomOut: this._zoomIndex < this._zoomLevels.length - 1,
    };
  }

  // --- Track Management ---

  setTracks(tracks: ClipTrack[]): void {
    this._tracks = tracks;
    this._adapter?.setTracks(tracks);
    this._emitStateChange();
  }

  addTrack(track: ClipTrack): void {
    this._tracks = [...this._tracks, track];
    this._adapter?.setTracks(this._tracks);
    this._emitStateChange();
  }

  removeTrack(trackId: string): void {
    this._tracks = this._tracks.filter((t) => t.id !== trackId);
    if (this._selectedTrackId === trackId) {
      this._selectedTrackId = null;
    }
    this._adapter?.setTracks(this._tracks);
    this._emitStateChange();
  }

  selectTrack(trackId: string | null): void {
    this._selectedTrackId = trackId;
    this._emitStateChange();
  }

  // --- Clip Editing ---

  moveClip(trackId: string, clipId: string, deltaSamples: number): void {
    this._tracks = this._tracks.map((track) => {
      if (track.id !== trackId) return track;

      const clipIndex = track.clips.findIndex((c) => c.id === clipId);
      if (clipIndex === -1) return track;

      const clip = track.clips[clipIndex];
      const sortedClips = sortClipsByTime(track.clips);
      const sortedIndex = sortedClips.findIndex((c) => c.id === clipId);

      const constrainedDelta = constrainClipDrag(clip, deltaSamples, sortedClips, sortedIndex);

      const newClips = track.clips.map((c, i) =>
        i === clipIndex ? { ...c, startSample: Math.floor(c.startSample + constrainedDelta) } : c,
      );

      return { ...track, clips: newClips };
    });

    this._emitStateChange();
  }

  splitClip(trackId: string, clipId: string, atSample: number): void {
    this._tracks = this._tracks.map((track) => {
      if (track.id !== trackId) return track;

      const clipIndex = track.clips.findIndex((c) => c.id === clipId);
      if (clipIndex === -1) return track;

      const clip = track.clips[clipIndex];
      const minDuration = Math.floor(DEFAULT_MIN_DURATION_SECONDS * this._sampleRate);

      const clipEnd = clip.startSample + clip.durationSamples;
      if (atSample <= clip.startSample || atSample >= clipEnd) return track;

      const leftDuration = atSample - clip.startSample;
      const rightDuration = clipEnd - atSample;
      if (leftDuration < minDuration || rightDuration < minDuration) return track;

      const { left, right } = splitClipOp(clip, atSample);

      const newClips = [...track.clips];
      newClips.splice(clipIndex, 1, left, right);

      return { ...track, clips: newClips };
    });

    this._emitStateChange();
  }

  trimClip(
    trackId: string,
    clipId: string,
    boundary: 'left' | 'right',
    deltaSamples: number,
  ): void {
    this._tracks = this._tracks.map((track) => {
      if (track.id !== trackId) return track;

      const clipIndex = track.clips.findIndex((c) => c.id === clipId);
      if (clipIndex === -1) return track;

      const clip = track.clips[clipIndex];
      const sortedClips = sortClipsByTime(track.clips);
      const sortedIndex = sortedClips.findIndex((c) => c.id === clipId);
      const minDuration = Math.floor(DEFAULT_MIN_DURATION_SECONDS * this._sampleRate);

      const constrained = constrainBoundaryTrim(
        clip,
        deltaSamples,
        boundary,
        sortedClips,
        sortedIndex,
        minDuration,
      );

      const newClips = track.clips.map((c, i) => {
        if (i !== clipIndex) return c;

        if (boundary === 'left') {
          return {
            ...c,
            startSample: c.startSample + constrained,
            offsetSamples: c.offsetSamples + constrained,
            durationSamples: c.durationSamples - constrained,
          };
        } else {
          return {
            ...c,
            durationSamples: c.durationSamples + constrained,
          };
        }
      });

      return { ...track, clips: newClips };
    });

    this._emitStateChange();
  }

  // --- Playback ---

  async play(startTime?: number, endTime?: number): Promise<void> {
    if (startTime !== undefined) {
      this._currentTime = startTime;
    }
    this._isPlaying = true;

    if (this._adapter) {
      await this._adapter.play(this._currentTime, endTime);
      this._startTimeUpdateLoop();
    }

    this._emit('play');
    this._emitStateChange();
  }

  pause(): void {
    this._isPlaying = false;
    this._stopTimeUpdateLoop();
    this._adapter?.pause();

    if (this._adapter) {
      this._currentTime = this._adapter.getCurrentTime();
    }

    this._emit('pause');
    this._emitStateChange();
  }

  stop(): void {
    this._isPlaying = false;
    this._currentTime = 0;
    this._stopTimeUpdateLoop();
    this._adapter?.stop();

    this._emit('stop');
    this._emitStateChange();
  }

  seek(time: number): void {
    const duration = calculateDuration(this._tracks, this._sampleRate);
    this._currentTime = Math.max(0, Math.min(time, duration));
    this._adapter?.seek(this._currentTime);
    this._emitStateChange();
  }

  setMasterVolume(volume: number): void {
    this._adapter?.setMasterVolume(volume);
  }

  // --- Per-Track Audio ---

  setTrackVolume(trackId: string, volume: number): void {
    this._adapter?.setTrackVolume(trackId, volume);
  }

  setTrackMute(trackId: string, muted: boolean): void {
    this._adapter?.setTrackMute(trackId, muted);
  }

  setTrackSolo(trackId: string, soloed: boolean): void {
    this._adapter?.setTrackSolo(trackId, soloed);
  }

  setTrackPan(trackId: string, pan: number): void {
    this._adapter?.setTrackPan(trackId, pan);
  }

  // --- Zoom ---

  zoomIn(): void {
    if (this._zoomIndex > 0) {
      this._zoomIndex--;
      this._emitStateChange();
    }
  }

  zoomOut(): void {
    if (this._zoomIndex < this._zoomLevels.length - 1) {
      this._zoomIndex++;
      this._emitStateChange();
    }
  }

  setZoomLevel(samplesPerPixel: number): void {
    this._zoomIndex = findClosestZoomIndex(samplesPerPixel, this._zoomLevels);
    this._emitStateChange();
  }

  // --- Events ---

  on<K extends EventName>(event: K, listener: EngineEvents[K]): void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event)!.add(listener);
  }

  off<K extends EventName>(event: K, listener: EngineEvents[K]): void {
    this._listeners.get(event)?.delete(listener);
  }

  // --- Lifecycle ---

  dispose(): void {
    this._disposed = true;
    this._stopTimeUpdateLoop();
    this._adapter?.dispose();
    this._listeners.clear();
  }

  // --- Private ---

  private _emit(event: string, ...args: unknown[]): void {
    const listeners = this._listeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        (listener as Function)(...args);
      }
    }
  }

  private _emitStateChange(): void {
    this._emit('statechange', this.getState());
  }

  private _startTimeUpdateLoop(): void {
    this._stopTimeUpdateLoop();

    const tick = () => {
      if (this._disposed || !this._isPlaying) return;

      if (this._adapter) {
        this._currentTime = this._adapter.getCurrentTime();
        this._emit('timeupdate', this._currentTime);
      }

      this._animFrameId = requestAnimationFrame(tick);
    };

    this._animFrameId = requestAnimationFrame(tick);
  }

  private _stopTimeUpdateLoop(): void {
    if (this._animFrameId !== null) {
      cancelAnimationFrame(this._animFrameId);
      this._animFrameId = null;
    }
  }
}
```

**Step 4: Update src/index.ts to export PlaylistEngine**

```typescript
// Operations (pure functions)
export * from './operations';

// Engine class
export { PlaylistEngine } from './PlaylistEngine';

// Engine types
export * from './types';
```

**Step 5: Run tests to verify they pass**

Run: `pnpm --filter @waveform-playlist/engine test`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add packages/engine/src/PlaylistEngine.ts packages/engine/src/__tests__/PlaylistEngine.test.ts packages/engine/src/index.ts
git commit -m "feat(engine): add PlaylistEngine class with event-driven state management"
```

---

### Task 6: Build verification and lint

**Step 1: Build the engine package**

Run: `pnpm --filter @waveform-playlist/engine build`
Expected: Build succeeds, `packages/engine/dist/` contains `index.js`, `index.mjs`, `index.d.ts`

**Step 2: Build all packages (verify nothing broken)**

Run: `pnpm build`
Expected: All packages build successfully

**Step 3: Run lint**

Run: `pnpm lint`
Expected: No new lint errors from engine package

**Step 4: Run all tests**

Run: `pnpm --filter @waveform-playlist/engine test`
Expected: All engine tests pass

**Step 5: Commit any fixes needed**

```bash
git add -A
git commit -m "chore(engine): fix lint and build issues"
```

---

### Task 7: Final review and cleanup

**Step 1: Verify package exports**

Check that `@waveform-playlist/engine` exports the right public API:
- `PlaylistEngine` class
- `PlayoutAdapter` interface
- `EngineState`, `EngineEvents`, `PlaylistEngineOptions` types
- `constrainClipDrag`, `constrainBoundaryTrim`, `calculateSplitPoint`, `splitClip`, `canSplitAt`
- `calculateViewportBounds`, `getVisibleChunkIndices`, `shouldUpdateViewport`
- `calculateDuration`, `calculateZoomScrollPosition`, `findClosestZoomIndex`, `clampSeekPosition`

**Step 2: Verify no React or Tone.js imports**

Run: `grep -r "from 'react'" packages/engine/src/`
Run: `grep -r "from 'tone'" packages/engine/src/`
Expected: No matches — the engine must be framework-agnostic

**Step 3: Run full test suite one final time**

Run: `pnpm --filter @waveform-playlist/engine test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add -A
git commit -m "chore(engine): finalize package exports and verify framework independence"
```
