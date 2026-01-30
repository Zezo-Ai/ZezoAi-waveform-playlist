---
sidebar_position: 4
title: LLM API Reference
description: Machine-readable API reference for LLMs and coding agents. All TypeScript interfaces from source.
---

# LLM API Reference

This page contains all TypeScript interfaces extracted from source code. Designed for LLMs and coding agents — no prose, just types.

**Source of truth:** `packages/browser/src/WaveformPlaylistContext.tsx`

---

## Provider Props

```typescript
interface WaveformPlaylistProviderProps {
  tracks: ClipTrack[];
  children: ReactNode;
  timescale?: boolean;
  mono?: boolean;
  waveHeight?: number;                    // Default: 80
  samplesPerPixel?: number;               // Default: 1024
  zoomLevels?: number[];
  automaticScroll?: boolean;              // Default: false
  theme?: Partial<WaveformPlaylistTheme>;
  controls?: { show: boolean; width: number }; // Default: { show: false, width: 0 }
  annotationList?: {
    annotations?: any[];
    editable?: boolean;
    isContinuousPlay?: boolean;
    linkEndpoints?: boolean;
    controls?: any[];
  };
  effects?: EffectsFunction;
  onReady?: () => void;
  onAnnotationsChange?: (annotations: AnnotationData[]) => void;
  barWidth?: number;                      // Default: 1
  barGap?: number;                        // Default: 0
  progressBarWidth?: number;              // Default: barWidth + barGap
}
```

---

## Context Hooks

### usePlaybackAnimation()

```typescript
interface PlaybackAnimationContextValue {
  isPlaying: boolean;
  currentTime: number;
  currentTimeRef: RefObject<number>;
  playbackStartTimeRef: RefObject<number>;
  audioStartPositionRef: RefObject<number>;
}
```

### usePlaylistState()

```typescript
interface PlaylistStateContextValue {
  continuousPlay: boolean;
  linkEndpoints: boolean;
  annotationsEditable: boolean;
  isAutomaticScroll: boolean;
  isLoopEnabled: boolean;
  annotations: AnnotationData[];
  activeAnnotationId: string | null;
  selectionStart: number;
  selectionEnd: number;
  selectedTrackId: string | null;
  loopStart: number;
  loopEnd: number;
}
```

### usePlaylistControls()

```typescript
interface PlaylistControlsContextValue {
  // Playback
  play: (startTime?: number, playDuration?: number) => Promise<void>;
  pause: () => void;
  stop: () => void;
  seekTo: (time: number) => void;
  setCurrentTime: (time: number) => void;

  // Track controls
  setTrackMute: (trackIndex: number, muted: boolean) => void;
  setTrackSolo: (trackIndex: number, soloed: boolean) => void;
  setTrackVolume: (trackIndex: number, volume: number) => void;
  setTrackPan: (trackIndex: number, pan: number) => void;

  // Selection
  setSelection: (start: number, end: number) => void;
  setSelectedTrackId: (trackId: string | null) => void;

  // Time format
  setTimeFormat: (format: TimeFormat) => void;
  formatTime: (seconds: number) => string;

  // Zoom
  zoomIn: () => void;
  zoomOut: () => void;

  // Master volume
  setMasterVolume: (volume: number) => void;

  // Scroll
  setAutomaticScroll: (enabled: boolean) => void;
  setScrollContainer: (element: HTMLDivElement | null) => void;
  scrollContainerRef: RefObject<HTMLDivElement | null>;

  // Annotation controls
  setContinuousPlay: (enabled: boolean) => void;
  setLinkEndpoints: (enabled: boolean) => void;
  setAnnotationsEditable: (enabled: boolean) => void;
  setAnnotations: Dispatch<SetStateAction<AnnotationData[]>>;
  setActiveAnnotationId: (id: string | null) => void;

  // Loop controls
  setLoopEnabled: (enabled: boolean) => void;
  setLoopRegion: (start: number, end: number) => void;
  setLoopRegionFromSelection: () => void;
  clearLoopRegion: () => void;
}
```

### usePlaylistData()

```typescript
interface PlaylistDataContextValue {
  duration: number;
  audioBuffers: AudioBuffer[];
  peaksDataArray: TrackClipPeaks[];
  trackStates: TrackState[];
  tracks: ClipTrack[];
  sampleRate: number;
  waveHeight: number;
  timeScaleHeight: number;
  minimumPlaylistHeight: number;
  controls: { show: boolean; width: number };
  playoutRef: RefObject<TonePlayout | null>;
  samplesPerPixel: number;
  timeFormat: string;
  masterVolume: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
  barWidth: number;
  barGap: number;
  progressBarWidth: number;
  isReady: boolean;
}
```

---

## Data Types

```typescript
interface TrackState {
  name: string;
  muted: boolean;
  soloed: boolean;
  volume: number;
  pan: number;
}

interface ClipPeaks {
  clipId: string;
  trackName: string;
  peaks: PeakData;
  startSample: number;
  durationSamples: number;
  fadeIn?: Fade;
  fadeOut?: Fade;
}

type TrackClipPeaks = ClipPeaks[];
```

---

## useAudioTracks

```typescript
function useAudioTracks(
  configs: AudioTrackConfig[],
  options?: UseAudioTracksOptions
): {
  tracks: ClipTrack[];
  loading: boolean;
  error: string | null;
  progress: number;
};

interface AudioTrackConfig {
  src?: string;
  audioBuffer?: AudioBuffer;
  name?: string;
  muted?: boolean;
  soloed?: boolean;
  volume?: number;
  pan?: number;
  color?: string;
  effects?: TrackEffectsFunction;
  startTime?: number;
  duration?: number;
  offset?: number;
  fadeIn?: Fade;
  fadeOut?: Fade;
  waveformData?: WaveformDataObject;
}

interface UseAudioTracksOptions {
  progressive?: boolean;  // Default: false
}
```

---

## Effects Hooks

### useDynamicEffects

```typescript
function useDynamicEffects(fftSize?: number): UseDynamicEffectsReturn;

interface UseDynamicEffectsReturn {
  activeEffects: ActiveEffect[];
  availableEffects: EffectDefinition[];
  addEffect: (effectId: string) => void;
  removeEffect: (instanceId: string) => void;
  updateParameter: (instanceId: string, paramName: string, value: number | string | boolean) => void;
  toggleBypass: (instanceId: string) => void;
  reorderEffects: (fromIndex: number, toIndex: number) => void;
  clearAllEffects: () => void;
  masterEffects: EffectsFunction;
  createOfflineEffectsFunction: () => EffectsFunction | undefined;
  analyserRef: RefObject<any>;
}

interface ActiveEffect {
  instanceId: string;
  effectId: string;
  definition: EffectDefinition;
  params: Record<string, number | string | boolean>;
  bypassed: boolean;
}
```

### useTrackDynamicEffects

```typescript
function useTrackDynamicEffects(): UseTrackDynamicEffectsReturn;

interface UseTrackDynamicEffectsReturn {
  trackEffectsState: Map<string, TrackActiveEffect[]>;
  addEffectToTrack: (trackId: string, effectId: string) => void;
  removeEffectFromTrack: (trackId: string, instanceId: string) => void;
  updateTrackEffectParameter: (trackId: string, instanceId: string, paramName: string, value: number | string | boolean) => void;
  toggleBypass: (trackId: string, instanceId: string) => void;
  clearTrackEffects: (trackId: string) => void;
  getTrackEffectsFunction: (trackId: string) => TrackEffectsFunction | undefined;
  createOfflineTrackEffectsFunction: (trackId: string) => TrackEffectsFunction | undefined;
  availableEffects: EffectDefinition[];
}

interface TrackActiveEffect {
  instanceId: string;
  effectId: string;
  definition: EffectDefinition;
  params: Record<string, number | string | boolean>;
  bypassed: boolean;
}
```

---

## Editing Hooks

### useClipDragHandlers

```typescript
function useClipDragHandlers(options: UseClipDragHandlersOptions): {
  onDragStart: (event: DragStartEvent) => void;
  onDragMove: (event: DragMoveEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  collisionModifier: Modifier;
};

interface UseClipDragHandlersOptions {
  tracks: ClipTrack[];
  onTracksChange: (tracks: ClipTrack[]) => void;
  samplesPerPixel: number;
  sampleRate: number;
}
```

### useClipSplitting

```typescript
function useClipSplitting(options: UseClipSplittingOptions): UseClipSplittingResult;

interface UseClipSplittingOptions {
  tracks: ClipTrack[];
  onTracksChange: (tracks: ClipTrack[]) => void;
  sampleRate: number;
  samplesPerPixel: number;
}

interface UseClipSplittingResult {
  splitClipAtPlayhead: () => boolean;
  splitClipAt: (trackIndex: number, clipIndex: number, splitTime: number) => boolean;
}
```

---

## Recording

### useIntegratedRecording

```typescript
function useIntegratedRecording(
  tracks: ClipTrack[],
  setTracks: (tracks: ClipTrack[]) => void,
  selectedTrackId: string | null,
  options?: IntegratedRecordingOptions
): UseIntegratedRecordingReturn;

interface IntegratedRecordingOptions {
  currentTime?: number;
  audioConstraints?: MediaTrackConstraints;
  channelCount?: number;      // Default: 1
  samplesPerPixel?: number;   // Default: 1024
}

interface UseIntegratedRecordingReturn {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  level: number;
  peakLevel: number;
  error: Error | null;
  stream: MediaStream | null;
  devices: MicrophoneDevice[];
  hasPermission: boolean;
  selectedDevice: string | null;
  startRecording: () => void;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  requestMicAccess: () => Promise<void>;
  changeDevice: (deviceId: string) => Promise<void>;
  recordingPeaks: Int8Array | Int16Array;
}
```

---

## Export

### useExportWav

```typescript
function useExportWav(): UseExportWavReturn;

interface UseExportWavReturn {
  exportWav: (tracks: ClipTrack[], trackStates: TrackState[], options?: ExportOptions) => Promise<ExportResult>;
  isExporting: boolean;
  progress: number;
  error: string | null;
}

interface ExportOptions {
  filename?: string;
  mode?: 'master' | 'individual';
  trackIndex?: number;
  autoDownload?: boolean;
  applyEffects?: boolean;        // Default: true
  effectsFunction?: EffectsFunction;
  createOfflineTrackEffects?: (trackId: string) => TrackEffectsFunction | undefined;
  onProgress?: (progress: number) => void;
  bitDepth?: 16 | 32;
}

interface ExportResult {
  audioBuffer: AudioBuffer;
  blob: Blob;
  duration: number;
}
```

---

## Keyboard Shortcuts

```typescript
function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions): void;

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description?: string;
  preventDefault?: boolean;
}

function usePlaybackShortcuts(options?: UsePlaybackShortcutsOptions): UsePlaybackShortcutsReturn;
// Default shortcuts: Space (play/pause), Escape (stop), 0 (rewind)
```

---

## Waveform Component Props

```typescript
interface WaveformProps {
  renderTrackControls?: (trackIndex: number) => ReactNode;
  renderTimestamp?: (timeMs: number, pixelPosition: number) => ReactNode;
  renderPlayhead?: RenderPlayheadFunction;
  renderAnnotationItem?: (props: RenderAnnotationItemProps) => ReactNode;
  getAnnotationBoxLabel?: GetAnnotationBoxLabelFn;
  annotationControls?: AnnotationAction[];
  annotationListConfig?: AnnotationActionOptions;
  annotationTextHeight?: number;
  scrollActivePosition?: ScrollLogicalPosition;
  scrollActiveContainer?: 'nearest' | 'all';
  className?: string;
  showClipHeaders?: boolean;      // Default: false
  interactiveClips?: boolean;     // Default: false
  showFades?: boolean;
  touchOptimized?: boolean;
  recordingState?: {
    isRecording: boolean;
    trackId: string;
    startSample: number;
    durationSamples: number;
    peaks: Int8Array | Int16Array;
  };
}
```

---

## Pre-built Components

```
Buttons: PlayButton, PauseButton, StopButton, RewindButton, FastForwardButton,
         SkipBackwardButton, SkipForwardButton, LoopButton, SetLoopRegionButton,
         ZoomInButton, ZoomOutButton, ExportWavButton, DownloadAnnotationsButton
Controls: MasterVolumeControl, TimeFormatSelect, AudioPosition, SelectionTimeInputs
Checkboxes: AutomaticScrollCheckbox, ContinuousPlayCheckbox, LinkEndpointsCheckbox, EditableCheckbox
Playheads: Playhead, PlayheadWithMarker (from @waveform-playlist/ui-components)
```

All button/control components connect to context automatically. No props required for basic usage. All accept `className` and `style`.

---

## Utilities

```typescript
// Waveform data (BBC audiowaveform)
loadWaveformData(src: string): Promise<WaveformData>;
waveformDataToPeaks(data: WaveformData, samplesPerPixel: number): PeakData;
loadPeaksFromWaveformData(src: string, samplesPerPixel: number): Promise<PeakData>;
getWaveformDataMetadata(data: WaveformData): { sampleRate: number; duration: number; channels: number };

// Effects
effectDefinitions: EffectDefinition[];
effectCategories: string[];
getEffectDefinition(id: string): EffectDefinition | undefined;
getEffectsByCategory(category: string): EffectDefinition[];
createEffectInstance(definition: EffectDefinition): EffectInstance;
createEffectChain(effects: EffectInstance[]): void;

// Keyboard
getShortcutLabel(shortcut: KeyboardShortcut): string;
// Returns e.g. "Cmd+Shift+S" on Mac, "Ctrl+Shift+S" on Windows
```
