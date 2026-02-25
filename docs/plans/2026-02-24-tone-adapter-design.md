# Tone.js Adapter Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a `PlayoutAdapter` for Tone.js, add shared clip time helpers to core, and fix the `track-${index}` bug.

**Architecture:** Thin adapter wrapping existing `TonePlayout`/`ToneTrack` behind the engine's `PlayoutAdapter` interface. Rebuild-on-`setTracks()` strategy matching current browser behavior.

---

## Scope

Three deliverables in one PR:

1. **`@waveform-playlist/core` — clip time helpers** — Pure functions for sample-to-seconds conversion, DRYing up 5+ files.
2. **`@waveform-playlist/playout` — Tone.js adapter** — `createToneAdapter(options?): PlayoutAdapter` factory exported from existing playout package.
3. **`@waveform-playlist/browser` — track ID fix** — Replace `track-${index}` with real `ClipTrack.id` in `WaveformPlaylistContext.tsx`.

---

## 1. Core Clip Time Helpers

**File:** `packages/core/src/clipTimeHelpers.ts`
**Exported from:** `packages/core/src/index.ts`

```typescript
import type { AudioClip } from './types';

/** Clip start position in seconds */
export function clipStartTime(clip: AudioClip): number {
  return clip.startSample / clip.sampleRate;
}

/** Clip end position in seconds (start + duration) */
export function clipEndTime(clip: AudioClip): number {
  return (clip.startSample + clip.durationSamples) / clip.sampleRate;
}

/** Clip offset into source audio in seconds */
export function clipOffsetTime(clip: AudioClip): number {
  return clip.offsetSamples / clip.sampleRate;
}

/** Clip duration in seconds */
export function clipDurationTime(clip: AudioClip): number {
  return clip.durationSamples / clip.sampleRate;
}
```

All four use `clip.sampleRate`, matching the existing inline pattern across the codebase. These replace scattered `startSample / sampleRate` expressions in:
- `WaveformPlaylistContext.tsx`
- `useClipDragHandlers.ts`
- `useClipSplitting.ts`
- `useExportWav.ts`
- `PlaylistVisualization.tsx`

---

## 2. Tone.js Adapter

**File:** `packages/playout/src/TonePlayoutAdapter.ts`
**Exported from:** `packages/playout/src/index.ts`

### Factory

```typescript
export interface ToneAdapterOptions {
  effects?: ToneEffectsOptions;
}

export function createToneAdapter(options?: ToneAdapterOptions): PlayoutAdapter
```

### Method Mapping

| PlayoutAdapter | Adapter Implementation |
|---|---|
| `init()` | `playout.init()` (resumes AudioContext) |
| `setTracks(tracks)` | Dispose old TonePlayout, create new one, iterate tracks: convert `AudioClip[]` to `ClipInfo[]` using core helpers, `addTrack()` with real `track.id`, `applyInitialSoloState()` |
| `play(startTime, endTime?)` | `await init()`, compute `when=now()`, `offset=startTime`, `duration=endTime-startTime`, call `playout.play(when, offset, duration)` |
| `pause()` | `playout.pause()` |
| `stop()` | `playout.stop()` |
| `seek(time)` | `playout.seekTo(time)` |
| `getCurrentTime()` | `playout.getCurrentTime()` |
| `isPlaying()` | Internal `_isPlaying` boolean (set on play/pause/stop) |
| `setMasterVolume(v)` | `playout.setMasterGain(v)` |
| `setTrackVolume(id, v)` | `playout.getTrack(id)?.setVolume(v)` |
| `setTrackMute(id, m)` | `playout.setMute(id, m)` |
| `setTrackSolo(id, s)` | `playout.setSolo(id, s)` |
| `setTrackPan(id, p)` | `playout.getTrack(id)?.setPan(p)` |
| `dispose()` | `playout.dispose()`, null out reference |

### Key Details

- **Rebuild strategy:** `setTracks()` disposes the entire `TonePlayout` instance and rebuilds from scratch. Matches current browser behavior.
- **State preservation:** Before rebuild, adapter stores per-track mute/solo/volume/pan state and re-applies it after `addTrack()`.
- **ClipTrack → ToneTrackOptions conversion:** Uses core helpers (`clipStartTime`, `clipEndTime`, `clipOffsetTime`, `clipDurationTime`) to convert sample-based `AudioClip[]` to time-based `ClipInfo[]`.
- **Track IDs:** Uses real `ClipTrack.id` as `Track.id` in ToneTrack (not `track-${index}`).
- **`play()` async:** Calls `await init()` first (resumes AudioContext), then `playout.play()` synchronously.
- **`isPlaying()`:** Tracked internally — TonePlayout has no `isPlaying()` method.

### Dependencies

Add to `packages/playout/package.json`:
- `@waveform-playlist/engine` as `peerDependency` (for `PlayoutAdapter` type)
- `@waveform-playlist/engine` as `devDependency` (types at build time)

---

## 3. Track ID Fix

**File:** `packages/browser/src/WaveformPlaylistContext.tsx`

Replace all `track-${index}` with real `track.id` when calling TonePlayout:
- `addTrack()` calls — pass `track.id` as Track ID
- `setMute()` / `setSolo()` calls — use `track.id`
- `getTrack()` calls for volume/pan — use `track.id`

No component changes needed. React components already use real `track.id` everywhere.

---

## Testing

**Core helpers:** Unit tests in `packages/core/src/__tests__/clipTimeHelpers.test.ts` — basic conversions, edge cases (zero values, different sample rates). ~8 tests.

**Tone.js adapter:** Unit tests in `packages/playout/src/__tests__/TonePlayoutAdapter.test.ts` with mocked `TonePlayout`:
- `setTracks()` rebuilds with correct IDs and converted times
- `play(startTime, endTime)` delegates with correct arg transformation
- `pause()`/`stop()` delegate and track `isPlaying` state
- Track controls delegate to correct methods
- `dispose()` cleans up
- State survives `setTracks()` rebuild

**Track ID fix:** Covered by existing E2E tests.

---

## What This Does NOT Include

- Wiring the browser package to use `PlaylistEngine` + adapter (separate PR)
- Effects adapter interface (future phase)
- Updating the 5 browser files to use core helpers (can be done incrementally, not required for adapter to work)

---

## Decision Log

| Decision | Choice | Rationale |
|---|---|---|
| Conversion helpers location | `@waveform-playlist/core` | Closest to `AudioClip` type, available to all packages |
| `setTracks()` strategy | Full rebuild | Matches proven browser behavior, simple, optimize later |
| Adapter location | Existing `playout` package | Thin wrapper next to code it wraps, avoids new package overhead |
| Browser wiring | Separate PR | Adapter + helpers + ID fix is a clean unit; engine wiring is larger |
| Track IDs | Fix `track-${index}` to real IDs | Aligns with Pattern #13 in CLAUDE.md, required for adapter anyway |
