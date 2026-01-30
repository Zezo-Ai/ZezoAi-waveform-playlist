# Spectrogram Renderer

A canvas-based spectrogram visualization for waveform-playlist, rendering frequency content over time alongside or in place of waveform views.

## Use Cases

- **MIR research** — Visualize frequency content for source separation evaluation, onset detection, pitch tracking
- **Audio editing** — Identify noise, artifacts, or frequency bands visually
- **Education** — Show students what audio looks like in the frequency domain
- **Stem comparison** — See what frequencies a separation model kept or removed

## Rendering Modes

### Standalone
Spectrogram replaces the waveform for a track.

```tsx
<WaveformPlaylistProvider tracks={tracks}>
  <Waveform renderMode="spectrogram" />
</WaveformPlaylistProvider>
```

### Dual view
Waveform on top, spectrogram below (or vice versa) for the same track.

```tsx
<WaveformPlaylistProvider tracks={tracks}>
  <Waveform renderMode="both" spectrogramPosition="below" />
</WaveformPlaylistProvider>
```

### Per-track
Mix and match — some tracks show waveforms, others show spectrograms.

```tsx
const tracks = [
  { src: 'vocals.wav', renderMode: 'spectrogram' },
  { src: 'drums.wav', renderMode: 'waveform' },
  { src: 'mix.wav', renderMode: 'both' },
];
```

## FFT Computation

### Client-side (Phase 1)
Use Web Audio API `OfflineAudioContext` + `AnalyserNode` to compute FFT data after audio is decoded. Store as a typed array alongside peak data.

```typescript
interface SpectrogramData {
  fftSize: number;           // e.g., 2048
  frequencyBinCount: number; // fftSize / 2
  sampleRate: number;
  hopSize: number;           // samples between frames
  data: Float32Array;        // flattened [frames × frequencyBinCount]
}
```

### Pre-computed (Phase 2)
Accept pre-computed spectrogram data via URL, similar to `peaksUrl`. Useful for large files or custom FFT parameters.

```tsx
{ src: 'track.wav', spectrogramUrl: '/data/track-spectrogram.bin' }
```

## Canvas Rendering

### Approach
Each spectrogram frame maps to a column of pixels. Frequency bins map to rows (low frequencies at bottom). Magnitude maps to color via a configurable color map.

### Color Maps
- **Viridis** (default) — Perceptually uniform, colorblind-friendly
- **Magma** — Dark background, good contrast
- **Inferno** — High contrast for presentations
- **Grayscale** — Classic, minimal
- **Custom** — User-provided function `(magnitude: number) => [r, g, b]`

```tsx
<Waveform
  renderMode="spectrogram"
  spectrogramColorMap="viridis"
/>
```

### Performance
- Render to an offscreen canvas once after FFT computation
- On scroll/zoom, draw the relevant region from the offscreen canvas to the visible canvas
- Only recompute when audio data or FFT parameters change
- Use `ImageData` and typed arrays for fast pixel manipulation

### Zoom behavior
- **Horizontal zoom** — Same as waveform (samples per pixel), resamples spectrogram columns
- **Vertical zoom** — Optional, zoom into a frequency range (e.g., 0-8kHz instead of full spectrum)

## Configuration

```typescript
interface SpectrogramConfig {
  fftSize?: number;          // 256-8192, default 2048
  hopSize?: number;          // default fftSize / 4
  windowFunction?: 'hann' | 'hamming' | 'blackman' | 'rectangular';
  minFrequency?: number;     // Hz, default 0
  maxFrequency?: number;     // Hz, default sampleRate / 2
  minDecibels?: number;      // default -100
  maxDecibels?: number;      // default -30
  colorMap?: string | ((magnitude: number) => [number, number, number]);
}
```

Passed via theme or as a prop:

```tsx
<WaveformPlaylistProvider
  tracks={tracks}
  spectrogramConfig={{ fftSize: 4096, colorMap: 'magma' }}
>
```

## Architecture

### New files

```
packages/browser/src/
├── spectrogram/
│   ├── computeSpectrogram.ts    # FFT computation via OfflineAudioContext
│   ├── renderSpectrogram.ts     # Canvas rendering from spectrogram data
│   ├── colorMaps.ts             # Color map definitions
│   └── SpectrogramCanvas.tsx    # React component wrapping the canvas
```

### Integration points

- **Track loading** — After audio decode, optionally compute spectrogram data
- **Channel component** — `SmartChannel` switches between waveform and spectrogram renderer based on `renderMode`
- **Zoom/scroll** — Spectrogram redraws from cached offscreen canvas using same pixel-per-second math as waveforms
- **Playhead/selection** — Overlays work identically since spectrogram occupies the same canvas space

## Implementation Phases

### Phase 1 — Basic spectrogram
- FFT computation from decoded audio buffer
- Canvas rendering with viridis color map
- `renderMode="spectrogram"` on tracks
- Horizontal zoom/scroll synced with existing controls
- Grayscale and viridis color maps

### Phase 2 — Dual view and configuration
- `renderMode="both"` with configurable position
- Per-track render mode
- All color maps
- Window function options
- Frequency range clamping (min/max frequency)
- dB range configuration

### Phase 3 — Performance and features
- Pre-computed spectrogram data loading (`spectrogramUrl`)
- Web Worker for FFT computation (avoid blocking main thread on large files)
- Frequency axis labels
- Cursor frequency readout (hover shows Hz value)
- Log/linear/mel frequency scale options

### Phase 4 — Advanced
- Real-time spectrogram during recording
- Spectrogram-based selection (time + frequency box select)
- Export spectrogram as image
- Integration with waveform service (server-side spectrogram generation)

## Open Questions

- **Height**: Should spectrogram have a fixed pixel height, or fill the track height? Dual view needs to split the available height.
- **Memory**: Large files with high FFT resolution produce big typed arrays. May need to compute on-demand per visible region instead of all at once.
- **Color map in theme**: Should color maps live in the theme system, or stay as a separate spectrogram config?
- **Interaction**: Should clicking on the spectrogram do anything frequency-specific (e.g., create a frequency-band selection)?
