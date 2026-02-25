# Engine Integration Design

## Goal

Replace direct `TonePlayout` usage in `WaveformPlaylistContext` with `PlaylistEngine` + `createToneAdapter`, routing all audio calls through the engine's adapter pattern.

## Design Decisions

1. **Playback-only delegation** — Replace `playoutRef.current` calls with `engineRef.current` calls. React state remains the source of truth for all UI.
2. **Engine as pass-through** — Ignore engine's internal state tracking and events. React owns `isPlaying`, `currentTime`, `trackStates`, etc.
3. **Engine created internally** — `PlaylistEngine` instantiated inside `WaveformPlaylistContext`. No API change for consumers.

## Architecture Overview

```
WaveformPlaylistContext
  └─ engineRef = useRef<PlaylistEngine>
       └─ PlaylistEngine (pass-through)
            └─ createToneAdapter({ effects })
                 └─ TonePlayout (actual audio)
```

- `playoutRef = useRef<TonePlayout>` becomes `engineRef = useRef<PlaylistEngine>`
- All `playoutRef.current.method()` calls become `engineRef.current.method()` calls
- The 60-line manual TonePlayout setup block is replaced by `engine.setTracks(tracksWithState)`
- `@waveform-playlist/engine` added as browser package dependency

## Method Mappings

### Playback

| Current (TonePlayout) | New (PlaylistEngine) | Notes |
|---|---|---|
| `playout.play(when, offset, duration)` | `engine.play(startTime, endTime?)` | Adapter translates internally |
| `playout.pause()` | `engine.pause()` | Context still calculates pause time itself |
| `playout.stop()` | `engine.stop()` | Engine resets own `_currentTime` to 0 (ignored) |
| `playout.init()` | *(not needed)* | Adapter's `play()` calls `init()` internally |

**play() conversion:** `playout.play(timeNow, start, duration)` becomes `engine.play(start, duration ? start + duration : undefined)`.

### Track Controls

| Current | New |
|---|---|
| `playout.setMute(trackId, muted)` | `engine.setTrackMute(trackId, muted)` |
| `playout.setSolo(trackId, soloed)` | `engine.setTrackSolo(trackId, soloed)` |
| `playout.getTrack(trackId)?.setVolume(v)` | `engine.setTrackVolume(trackId, v)` |
| `playout.getTrack(trackId)?.setPan(p)` | `engine.setTrackPan(trackId, p)` |
| `playout.setMasterGain(v)` | `engine.setMasterVolume(v)` |

### Track Setup

```typescript
const tracksWithState = tracks.map((track, i) => ({
  ...track,
  volume: trackStatesRef.current[i]?.volume ?? track.volume,
  muted: trackStatesRef.current[i]?.muted ?? track.muted,
  soloed: trackStatesRef.current[i]?.soloed ?? track.soloed,
  pan: trackStatesRef.current[i]?.pan ?? track.pan,
}));
engineRef.current.setTracks(tracksWithState);
```

### Effects

- Master effects: `createToneAdapter({ effects })` at engine creation
- Per-track effects: Already on `ClipTrack.effects`, handled by adapter's `setTracks()`

### Completion Callbacks

`setOnPlaybackComplete()` calls removed. Adapter manages completion via generation counter. Context's animation loop handles all stop conditions (duration, annotations, selections, loops).

## What Changes

1. **Imports** — `TonePlayout` to `PlaylistEngine` + `createToneAdapter`
2. **Ref** — `playoutRef` type changes
3. **Creation** — 60-line setup to ~10-line `engine.setTracks()`
4. **Play/Pause/Stop** — Signature changes per mapping above
5. **Track controls** — 4 callbacks use engine methods
6. **Master volume** — `useMasterVolume` hook calls `engine.setMasterVolume()`
7. **Dispose** — `playout.dispose()` to `engine.dispose()`
8. **Dependencies** — `@waveform-playlist/engine` added to browser package

## What Stays the Same

- All React state and refs
- Animation loop (annotations, auto-scroll, selections, loops)
- Peaks generation, waveform data cache, zoom controls
- 4-context split architecture and memoization
- All downstream consumers and public API
- Zero breaking changes

## Dual Animation Loops

Engine starts its own RAF loop during play. Context keeps its own. Both run simultaneously. Engine's loop is lightweight (polls adapter time, emits `timeupdate`). Harmless overhead; context ignores all engine events.

## Testing

- Existing unit tests (24 adapter + 81 engine + 8 core) — no changes
- Existing 173 E2E tests — should pass without modification
- Manual validation: play/pause/stop, track controls during playback, seek, selection playback, loops, annotations, split-during-playback resume, zoom while playing
