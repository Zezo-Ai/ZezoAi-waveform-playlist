import type { SpectrogramConfig, SpectrogramData } from '@waveform-playlist/core';

export interface SpectrogramWorkerComputeParams {
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

let idCounter = 0;

/**
 * Wraps a Web Worker running `spectrogram.worker.ts` with a promise-based API.
 *
 * The caller is responsible for creating the Worker, e.g.:
 * ```ts
 * const worker = new Worker(
 *   new URL('@waveform-playlist/spectrogram/worker/spectrogram.worker', import.meta.url),
 *   { type: 'module' }
 * );
 * const api = createSpectrogramWorker(worker);
 * ```
 */
export function createSpectrogramWorker(worker: Worker): {
  compute(params: SpectrogramWorkerComputeParams): Promise<SpectrogramData[]>;
  terminate(): void;
} {
  const pending = new Map<string, {
    resolve: (value: SpectrogramData[]) => void;
    reject: (reason: unknown) => void;
  }>();

  worker.onmessage = (e: MessageEvent<ComputeResponse>) => {
    const { id, spectrograms } = e.data;
    const entry = pending.get(id);
    if (entry) {
      pending.delete(id);
      entry.resolve(spectrograms);
    }
  };

  worker.onerror = (e: ErrorEvent) => {
    for (const [, entry] of pending) {
      entry.reject(e.error ?? new Error(e.message));
    }
    pending.clear();
  };

  return {
    compute(params: SpectrogramWorkerComputeParams): Promise<SpectrogramData[]> {
      const id = String(++idCounter);

      return new Promise<SpectrogramData[]>((resolve, reject) => {
        pending.set(id, { resolve, reject });

        // Slice channel data so we can transfer without detaching the original AudioBuffer views
        const transferableArrays = params.channelDataArrays.map(arr => arr.slice());
        const transferables = transferableArrays.map(arr => arr.buffer);

        worker.postMessage(
          {
            id,
            channelDataArrays: transferableArrays,
            config: params.config,
            sampleRate: params.sampleRate,
            offsetSamples: params.offsetSamples,
            durationSamples: params.durationSamples,
            mono: params.mono,
          },
          transferables,
        );
      });
    },

    terminate() {
      worker.terminate();
      for (const [, entry] of pending) {
        entry.reject(new Error('Worker terminated'));
      }
      pending.clear();
    },
  };
}
