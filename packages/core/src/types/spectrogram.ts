/**
 * Spectrogram Types
 *
 * Types for frequency-domain visualization of audio data.
 */

/**
 * Computed spectrogram data ready for rendering.
 */
export interface SpectrogramData {
  /** FFT size used for computation */
  fftSize: number;
  /** Number of frequency bins (fftSize / 2) */
  frequencyBinCount: number;
  /** Sample rate of the source audio */
  sampleRate: number;
  /** Hop size between FFT frames (in samples) */
  hopSize: number;
  /** Number of time frames */
  frameCount: number;
  /** dB values: frameCount * frequencyBinCount Float32Array (row-major, frame × bin) */
  data: Float32Array;
  /** Minimum dB value used in computation */
  minDecibels: number;
  /** Maximum dB value used in computation */
  maxDecibels: number;
}

/**
 * Configuration for spectrogram computation and rendering.
 */
export interface SpectrogramConfig {
  /** FFT size: 256–8192, must be power of 2. Default: 2048 */
  fftSize?: number;
  /** Hop size between frames in samples. Default: fftSize / 4 */
  hopSize?: number;
  /** Window function applied before FFT. Default: 'hann' */
  windowFunction?: 'hann' | 'hamming' | 'blackman' | 'rectangular' | 'bartlett' | 'blackman-harris';
  /** Window function parameter (0-1), used by some window functions */
  alpha?: number;
  /** Frequency axis scale. Default: 'linear' */
  frequencyScale?: 'linear' | 'logarithmic' | 'mel' | 'bark' | 'erb';
  /** Minimum frequency in Hz. Default: 0 */
  minFrequency?: number;
  /** Maximum frequency in Hz. Default: sampleRate / 2 */
  maxFrequency?: number;
  /** Minimum decibels for normalization. Default: -100 */
  minDecibels?: number;
  /** Maximum decibels for normalization. Default: -20 */
  maxDecibels?: number;
  /** Display brightness boost in dB. Default: 0 */
  gainDb?: number;
  /** Signal range in dB. Default: 80 */
  rangeDb?: number;
  /** Show frequency axis labels. Default: false */
  labels?: boolean;
  /** Label text color */
  labelsColor?: string;
  /** Label background color */
  labelsBackground?: string;
}

/** Built-in color map names */
export type ColorMapName = 'viridis' | 'magma' | 'inferno' | 'grayscale' | 'igray' | 'roseus';

/** Color map can be a named preset or a custom array of [r, g, b, a?] entries */
export type ColorMapValue = ColorMapName | number[][];

/** Render mode for a track's visualization */
export type RenderMode = 'waveform' | 'spectrogram' | 'both';
