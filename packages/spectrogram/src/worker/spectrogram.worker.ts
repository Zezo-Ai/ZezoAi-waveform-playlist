/**
 * Web Worker for off-main-thread spectrogram computation.
 */

import type { SpectrogramConfig, SpectrogramData } from '@waveform-playlist/core';
import { fft, magnitudeSpectrum, toDecibels } from '../computation/fft';
import { getWindowFunction } from '../computation/windowFunctions';

interface ComputeRequest {
  id: string;
  channelDataArrays: Float32Array[];
  config: SpectrogramConfig;
  sampleRate: number;
  offsetSamples: number;
  durationSamples: number;
  mono: boolean;
}

interface ComputeResponse {
  id: string;
  spectrograms: SpectrogramData[];
}

function computeFromChannelData(
  channelData: Float32Array,
  config: SpectrogramConfig,
  sampleRate: number,
  offsetSamples: number,
  durationSamples: number,
): SpectrogramData {
  const fftSize = config.fftSize ?? 2048;
  const hopSize = config.hopSize ?? Math.floor(fftSize / 4);
  const windowName = config.windowFunction ?? 'hann';
  const minDecibels = config.minDecibels ?? -100;
  const maxDecibels = config.maxDecibels ?? -20;
  const gainDb = config.gainDb ?? 0;
  const alpha = config.alpha;

  const frequencyBinCount = fftSize >> 1;
  const totalSamples = durationSamples;

  const window = getWindowFunction(windowName, fftSize, alpha);
  const frameCount = Math.max(1, Math.floor((totalSamples - fftSize) / hopSize) + 1);
  const data = new Float32Array(frameCount * frequencyBinCount);
  const real = new Float32Array(fftSize);
  const imag = new Float32Array(fftSize);

  for (let frame = 0; frame < frameCount; frame++) {
    const start = offsetSamples + frame * hopSize;

    for (let i = 0; i < fftSize; i++) {
      const sampleIdx = start + i;
      real[i] = sampleIdx < channelData.length ? channelData[sampleIdx] * window[i] : 0;
      imag[i] = 0;
    }

    fft(real, imag);
    const mags = magnitudeSpectrum(real, imag);
    const dbs = toDecibels(mags, minDecibels, maxDecibels, gainDb);
    data.set(dbs, frame * frequencyBinCount);
  }

  return { fftSize, frequencyBinCount, sampleRate, hopSize, frameCount, data, minDecibels, maxDecibels };
}

function computeMonoFromChannels(
  channels: Float32Array[],
  config: SpectrogramConfig,
  sampleRate: number,
  offsetSamples: number,
  durationSamples: number,
): SpectrogramData {
  if (channels.length === 1) {
    return computeFromChannelData(channels[0], config, sampleRate, offsetSamples, durationSamples);
  }

  const fftSize = config.fftSize ?? 2048;
  const hopSize = config.hopSize ?? Math.floor(fftSize / 4);
  const windowName = config.windowFunction ?? 'hann';
  const minDecibels = config.minDecibels ?? -100;
  const maxDecibels = config.maxDecibels ?? -20;
  const gainDb = config.gainDb ?? 0;
  const alpha = config.alpha;

  const frequencyBinCount = fftSize >> 1;
  const numChannels = channels.length;

  const window = getWindowFunction(windowName, fftSize, alpha);
  const frameCount = Math.max(1, Math.floor((durationSamples - fftSize) / hopSize) + 1);
  const data = new Float32Array(frameCount * frequencyBinCount);
  const real = new Float32Array(fftSize);
  const imag = new Float32Array(fftSize);

  for (let frame = 0; frame < frameCount; frame++) {
    const start = offsetSamples + frame * hopSize;

    for (let i = 0; i < fftSize; i++) {
      const sampleIdx = start + i;
      let sum = 0;
      for (let ch = 0; ch < numChannels; ch++) {
        sum += sampleIdx < channels[ch].length ? channels[ch][sampleIdx] : 0;
      }
      real[i] = (sum / numChannels) * window[i];
      imag[i] = 0;
    }

    fft(real, imag);
    const mags = magnitudeSpectrum(real, imag);
    const dbs = toDecibels(mags, minDecibels, maxDecibels, gainDb);
    data.set(dbs, frame * frequencyBinCount);
  }

  return { fftSize, frequencyBinCount, sampleRate, hopSize, frameCount, data, minDecibels, maxDecibels };
}

self.onmessage = (e: MessageEvent<ComputeRequest>) => {
  const { id, channelDataArrays, config, sampleRate, offsetSamples, durationSamples, mono } = e.data;

  const spectrograms: SpectrogramData[] = [];

  if (mono || channelDataArrays.length === 1) {
    spectrograms.push(
      computeMonoFromChannels(channelDataArrays, config, sampleRate, offsetSamples, durationSamples)
    );
  } else {
    for (const channelData of channelDataArrays) {
      spectrograms.push(
        computeFromChannelData(channelData, config, sampleRate, offsetSamples, durationSamples)
      );
    }
  }

  // Transfer the data Float32Arrays back (zero-copy)
  const transferables = spectrograms.map(s => s.data.buffer);

  const response: ComputeResponse = { id, spectrograms };
  (self as unknown as Worker).postMessage(response, transferables);
};
