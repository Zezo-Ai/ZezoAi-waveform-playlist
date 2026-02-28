# Engine Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace direct `TonePlayout` usage in `WaveformPlaylistContext` with `PlaylistEngine` + `createToneAdapter`, routing all audio through the engine's adapter pattern.

**Architecture:** `WaveformPlaylistContext` creates a `PlaylistEngine` with a `createToneAdapter` adapter. All `playoutRef.current` calls become `engineRef.current` calls. React state remains the UI source of truth — engine events are ignored.

**Tech Stack:** TypeScript, React, `@waveform-playlist/engine` (PlaylistEngine, PlayoutAdapter), `@waveform-playlist/playout` (createToneAdapter), Tone.js (wrapped by adapter)

**Design Doc:** `docs/plans/2026-02-25-engine-integration-design.md`

---

### Task 1: Add engine dependency to browser package

**Files:**
- Modify: `packages/browser/package.json`

**Step 1: Add the dependency**

In `packages/browser/package.json`, add `@waveform-playlist/engine` to `dependencies`:

```json
"dependencies": {
  "@waveform-playlist/core": "workspace:*",
  "@waveform-playlist/engine": "workspace:*",
  "@waveform-playlist/loaders": "workspace:*",
  "@waveform-playlist/media-element-playout": "workspace:*",
  "@waveform-playlist/playout": "workspace:*",
  "@waveform-playlist/ui-components": "workspace:*",
  "uuid": "^13.0.0",
  "waveform-data": "^4.5.2"
}
```

**Step 2: Install**

Run: `pnpm install`
Expected: lockfile updated, no errors

**Step 3: Verify the engine package resolves**

Run: `cd packages/browser && pnpm typecheck`
Expected: PASS (no change to source yet, just verifying resolution)

**Step 4: Commit**

```bash
git add packages/browser/package.json pnpm-lock.yaml
git commit -m "chore: add engine dependency to browser package"
```

---

### Task 2: Update useMasterVolume hook to use PlaylistEngine

**Files:**
- Modify: `packages/browser/src/hooks/useMasterVolume.ts`

The current hook accepts `RefObject<TonePlayout | null>` and calls `playoutRef.current.setMasterGain(volume)`. Change it to accept `RefObject<PlaylistEngine | null>` and call `engineRef.current.setMasterVolume(volume)`.

**Step 1: Update the hook**

Replace the entire file content of `packages/browser/src/hooks/useMasterVolume.ts`:

```typescript
import { useState, useCallback, RefObject } from 'react';
import type { PlaylistEngine } from '@waveform-playlist/engine';

export interface UseMasterVolumeProps {
  engineRef: RefObject<PlaylistEngine | null>;
  initialVolume?: number; // 0-1.0 (linear gain, consistent with Web Audio API)
  onVolumeChange?: (volume: number) => void;
}

export interface MasterVolumeControls {
  masterVolume: number;
  setMasterVolume: (volume: number) => void;
}

/**
 * Hook for managing master volume control
 *
 * @example
 * ```tsx
 * const { masterVolume, setMasterVolume } = useMasterVolume({
 *   engineRef,
 *   initialVolume: 1.0,
 * });
 *
 * <MasterVolumeControl
 *   volume={masterVolume}
 *   onChange={setMasterVolume}
 * />
 * ```
 */
export function useMasterVolume({
  engineRef,
  initialVolume = 1.0,
  onVolumeChange,
}: UseMasterVolumeProps): MasterVolumeControls {
  const [masterVolume, setMasterVolumeState] = useState(initialVolume);

  const setMasterVolume = useCallback((volume: number) => {
    setMasterVolumeState(volume);

    // Update the engine with linear gain (0-1.0 range)
    if (engineRef.current) {
      engineRef.current.setMasterVolume(volume);
    }

    // Call optional callback
    onVolumeChange?.(volume);
  }, [engineRef, onVolumeChange]);

  return {
    masterVolume,
    setMasterVolume,
  };
}
```

**Step 2: Verify it compiles in isolation**

This won't typecheck yet because `WaveformPlaylistContext.tsx` still passes `playoutRef`. That's expected — we'll fix the call site in Task 3.

**Step 3: Commit**

```bash
git add packages/browser/src/hooks/useMasterVolume.ts
git commit -m "refactor: update useMasterVolume to accept PlaylistEngine ref"
```

---

### Task 3: Swap WaveformPlaylistContext to use PlaylistEngine

**Files:**
- Modify: `packages/browser/src/WaveformPlaylistContext.tsx`

This is the main task. All changes are in one file and must be committed together since changing the ref type requires updating all call sites atomically.

**Step 1: Update imports (line 1-11)**

Replace line 3:
```typescript
// OLD
import { TonePlayout, type EffectsFunction, type TrackEffectsFunction } from '@waveform-playlist/playout';
// NEW
import { createToneAdapter, type EffectsFunction, type TrackEffectsFunction } from '@waveform-playlist/playout';
import { PlaylistEngine } from '@waveform-playlist/engine';
```

Note: `TonePlayout` is no longer imported. `EffectsFunction` and `TrackEffectsFunction` stay (used by props interface and re-exported).

**Step 2: Change the ref declaration (line 252)**

Replace:
```typescript
const playoutRef = useRef<TonePlayout | null>(null);
```
With:
```typescript
const engineRef = useRef<PlaylistEngine | null>(null);
```

**Step 3: Update useMasterVolume call (line 275)**

Replace:
```typescript
const { masterVolume, setMasterVolume } = useMasterVolume({ playoutRef, initialVolume: 1.0 });
```
With:
```typescript
const { masterVolume, setMasterVolume } = useMasterVolume({ engineRef, initialVolume: 1.0 });
```

**Step 4: Replace the loadAudio effect track setup block (lines ~370-537)**

This is the largest change. The current effect:
1. Handles empty tracks (dispose playout)
2. Captures playback state for resume
3. Collects audio buffers and calculates duration
4. Initializes track states
5. Builds TonePlayout manually (60 lines: creates Track objects, ClipInfo arrays, calls addTrack)
6. Sets playoutRef
7. Dispatches ready event

Replace the empty-tracks cleanup (lines ~381-384):
```typescript
// OLD
if (playoutRef.current) {
  playoutRef.current.dispose();
  playoutRef.current = null;
}
// NEW
if (engineRef.current) {
  engineRef.current.dispose();
  engineRef.current = null;
}
```

Replace the capture-and-stop block (lines ~393-398):
```typescript
// OLD
if (playoutRef.current && wasPlaying) {
  playoutRef.current.stop();
  stopAnimationFrameLoop();
  pendingResumeRef.current = { position: resumePosition };
}
// NEW
if (engineRef.current && wasPlaying) {
  engineRef.current.stop();
  stopAnimationFrameLoop();
  pendingResumeRef.current = { position: resumePosition };
}
```

Replace the entire playout creation block (lines ~449-511) with:
```typescript
// Dispose old engine before creating new one
if (engineRef.current) {
  engineRef.current.dispose();
}

// Create engine with Tone.js adapter
const adapter = createToneAdapter({ effects });
const engine = new PlaylistEngine({ adapter });

// Merge current UI state into tracks before passing to engine
const currentTrackStates = trackStatesRef.current;
const tracksWithState = tracks.map((track, index) => {
  const trackState = currentTrackStates[index];
  return {
    ...track,
    volume: trackState?.volume ?? track.volume,
    muted: trackState?.muted ?? track.muted,
    soloed: trackState?.soloed ?? track.soloed,
    pan: trackState?.pan ?? track.pan,
  };
});

engine.setTracks(tracksWithState);
engineRef.current = engine;
```

Replace the cleanup return (lines ~531-536):
```typescript
// OLD
return () => {
  stopAnimationFrameLoop();
  if (playoutRef.current) {
    playoutRef.current.dispose();
  }
};
// NEW
return () => {
  stopAnimationFrameLoop();
  if (engineRef.current) {
    engineRef.current.dispose();
  }
};
```

**Step 5: Update the animation loop playout calls (lines ~647-721)**

Every `playoutRef.current` in `startAnimationLoop` becomes `engineRef.current`. The method calls also change:

Replace `playoutRef.current.stop()` with `engineRef.current.stop()` — there are 4 occurrences in the animation loop (annotation stop, selection stop, loop restart, duration stop).

Replace the loop restart play call:
```typescript
// OLD
playoutRef.current?.stop();
// ... timing setup ...
playoutRef.current?.play(timeNow, loopStartRef.current);
// NEW
engineRef.current?.stop();
// ... timing setup ...
engineRef.current?.play(loopStartRef.current);
```

Note: The loop restart no longer passes `timeNow` — the engine's `play(startTime)` handles scheduling internally via the adapter.

**Step 6: Update continuousPlay reschedule effect (lines ~740-774)**

Replace:
```typescript
// OLD
if (isPlaying && animationFrameRef.current && playoutRef.current) {
  if (continuousPlay) {
    playoutRef.current.stop();
    stopAnimationLoop();
    await playoutRef.current.init();
    playoutRef.current.setOnPlaybackComplete(() => {});
    // ... timing setup ...
    playoutRef.current.play(timeNow, currentPos);
    startAnimationLoop();
  }
}
// NEW
if (isPlaying && animationFrameRef.current && engineRef.current) {
  if (continuousPlay) {
    engineRef.current.stop();
    stopAnimationLoop();
    // Engine adapter handles init internally
    // ... timing setup ...
    await engineRef.current.play(currentPos);
    startAnimationLoop();
  }
}
```

Remove the `playoutRef.current.setOnPlaybackComplete(() => {})` call — the adapter manages completion via generation counter.

**Step 7: Update pendingResume effect (lines ~777-798)**

Replace:
```typescript
// OLD
if (pendingResumeRef.current && playoutRef.current) {
  pendingResumeRef.current = null;
  await playoutRef.current.init();
  playoutRef.current.setOnPlaybackComplete(() => {});
  // ... timing setup ...
  playoutRef.current.play(timeNow, position);
}
// NEW
if (pendingResumeRef.current && engineRef.current) {
  pendingResumeRef.current = null;
  // ... timing setup ...
  await engineRef.current.play(position);
}
```

Remove `init()` and `setOnPlaybackComplete` calls.

**Step 8: Update play callback (lines ~801-838)**

Replace:
```typescript
// OLD
const play = useCallback(async (startTime?: number, playDuration?: number) => {
  if (!playoutRef.current || audioBuffers.length === 0) return;
  await playoutRef.current.init();
  // ... timing setup ...
  playoutRef.current.setOnPlaybackComplete(() => {});
  playoutRef.current.stop();
  stopAnimationLoop();
  // ... more timing setup ...
  playoutRef.current.play(startTimeNow, actualStartTime, playDuration);
  setIsPlaying(true);
  startAnimationLoop();
}, [audioBuffers.length, startAnimationLoop, stopAnimationLoop]);
// NEW
const play = useCallback(async (startTime?: number, playDuration?: number) => {
  if (!engineRef.current || audioBuffers.length === 0) return;
  const actualStartTime = startTime ?? currentTimeRef.current;
  playStartPositionRef.current = actualStartTime;
  currentTimeRef.current = actualStartTime;

  // Stop any existing playback and animation loop
  engineRef.current.stop();
  stopAnimationLoop();

  // Record timing for accurate position tracking using Tone.js context
  const context = getContext();
  const startTimeNow = context.currentTime;
  playbackStartTimeRef.current = startTimeNow;
  audioStartPositionRef.current = actualStartTime;

  // Set playback end time if playing with duration (e.g., selection playback)
  playbackEndTimeRef.current = playDuration !== undefined ? actualStartTime + playDuration : null;

  const endTime = playDuration !== undefined ? actualStartTime + playDuration : undefined;
  await engineRef.current.play(actualStartTime, endTime);
  setIsPlaying(true);
  startAnimationLoop();
}, [audioBuffers.length, startAnimationLoop, stopAnimationLoop]);
```

Key change: `playout.play(when, offset, duration)` becomes `engine.play(startTime, endTime?)`.

**Step 9: Update pause callback (lines ~840-854)**

Replace:
```typescript
// OLD
playoutRef.current.pause();
// NEW
engineRef.current.pause();
```

Also update the guard: `if (!playoutRef.current)` → `if (!engineRef.current)`.

**Step 10: Update stop callback (lines ~856-866)**

Replace:
```typescript
// OLD
if (!playoutRef.current) return;
playoutRef.current.stop();
// NEW
if (!engineRef.current) return;
engineRef.current.stop();
```

**Step 11: Update seekTo callback (lines ~869-884)**

Replace:
```typescript
// OLD
if (isPlaying && playoutRef.current) {
  playoutRef.current.stop();
  stopAnimationLoop();
  play(clampedTime);
}
// NEW
if (isPlaying && engineRef.current) {
  engineRef.current.stop();
  stopAnimationLoop();
  play(clampedTime);
}
```

**Step 12: Update track control callbacks (lines ~887-943)**

For `setTrackMute` (line ~895-897):
```typescript
// OLD
if (playoutRef.current) {
  playoutRef.current.setMute(trackId, muted);
}
// NEW
if (engineRef.current) {
  engineRef.current.setTrackMute(trackId, muted);
}
```

For `setTrackSolo` (line ~908-910):
```typescript
// OLD
if (playoutRef.current) {
  playoutRef.current.setSolo(trackId, soloed);
}
// NEW
if (engineRef.current) {
  engineRef.current.setTrackSolo(trackId, soloed);
}
```

For `setTrackVolume` (line ~921-926):
```typescript
// OLD
if (playoutRef.current) {
  const toneTrack = playoutRef.current.getTrack(trackId);
  if (toneTrack) {
    toneTrack.setVolume(volume);
  }
}
// NEW
if (engineRef.current) {
  engineRef.current.setTrackVolume(trackId, volume);
}
```

For `setTrackPan` (line ~937-942):
```typescript
// OLD
if (playoutRef.current) {
  const toneTrack = playoutRef.current.getTrack(trackId);
  if (toneTrack) {
    toneTrack.setPan(pan);
  }
}
// NEW
if (engineRef.current) {
  engineRef.current.setTrackPan(trackId, pan);
}
```

**Step 13: Update setSelection callback (lines ~946-956)**

Replace:
```typescript
// OLD
if (isPlaying && playoutRef.current) {
  playoutRef.current.stop();
  playoutRef.current.play(getContext().currentTime, start);
}
// NEW
if (isPlaying && engineRef.current) {
  engineRef.current.stop();
  engineRef.current.play(start);
}
```

Note: `setSelection` calls play without duration, so `engine.play(start)` with no endTime.

**Step 14: Typecheck**

Run: `pnpm typecheck`
Expected: PASS — all `playoutRef` references now `engineRef`, all method signatures match

**Step 15: Build**

Run: `pnpm build`
Expected: PASS — all packages build successfully

**Step 16: Lint**

Run: `pnpm lint`
Expected: PASS — no lint errors

**Step 17: Commit**

```bash
git add packages/browser/src/WaveformPlaylistContext.tsx
git commit -m "refactor: replace TonePlayout with PlaylistEngine in context provider

Route all audio calls through PlaylistEngine + createToneAdapter adapter.
React state remains UI source of truth; engine events are ignored.
60-line manual TonePlayout setup replaced by engine.setTracks().
No public API changes."
```

---

### Task 4: Run existing tests

**Step 1: Run unit tests**

Run: `cd packages/core && npx vitest run`
Expected: 8 tests PASS

Run: `cd packages/engine && npx vitest run`
Expected: 81 tests PASS

Run: `cd packages/playout && npx vitest run`
Expected: 24 tests PASS

**Step 2: Run E2E tests**

Run: `pnpm test`
Expected: 173 tests PASS (or known flaky failures unrelated to this change)

If any test fails, check if it's a pre-existing flaky test (re-run once to confirm) or a regression from this change.

**Step 3: Manual smoke test**

Run: `pnpm --filter website start`

Test on `http://localhost:3000/waveform-playlist/examples/multi-clip`:
1. Play/Pause/Stop buttons work
2. Click timeline to seek while playing
3. Mute/Solo buttons toggle during playback
4. Volume and pan sliders respond during playback
5. Zoom in/out while playing
6. Split a clip during playback (should resume)
7. Loop region playback (if enabled)

---

### Task 5: Remove unused TonePlayout import from type re-exports

**Files:**
- Verify: `packages/browser/src/index.tsx` — check if `TonePlayout` is re-exported

**Step 1: Check the browser package's public exports**

Read `packages/browser/src/index.tsx` and confirm `TonePlayout` is NOT re-exported.

The file re-exports `EffectsFunction` and `TrackEffectsFunction` from `@waveform-playlist/playout` — those types still exist and are still needed. No changes required.

If `TonePlayout` IS re-exported (unlikely), remove it.

**Step 2: Commit if any changes**

```bash
git add packages/browser/src/index.tsx
git commit -m "chore: remove unused TonePlayout re-export"
```

---

### Task 6: Update documentation

**Files:**
- Modify: `website/static/llms.txt` (if engine integration changes are user-facing — skip if no API change)
- Modify: `CLAUDE.md` (add engine integration note)

**Step 1: Update CLAUDE.md**

Add to the "Architectural Decisions" section:

```markdown
### Engine Integration in WaveformPlaylistContext (2026-02-25)

**Decision:** Route all audio calls through `PlaylistEngine` + `createToneAdapter` instead of direct `TonePlayout` usage.

**Implementation:** `WaveformPlaylistContext` creates a `PlaylistEngine` with adapter. All `playoutRef.current` calls became `engineRef.current` calls. Engine events are ignored — React state remains the UI source of truth.

**Key:** `useMasterVolume` hook accepts `RefObject<PlaylistEngine | null>` (was `TonePlayout`).

**Why:** Enables future framework-agnostic bindings (Svelte, Vue) by establishing the engine as the single audio control layer.
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add engine integration architectural decision"
```
