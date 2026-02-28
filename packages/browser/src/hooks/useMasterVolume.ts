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

  const setMasterVolume = useCallback(
    (volume: number) => {
      setMasterVolumeState(volume);

      // Update the engine with linear gain (0-1.0 range)
      if (engineRef.current) {
        engineRef.current.setMasterVolume(volume);
      }

      // Call optional callback
      onVolumeChange?.(volume);
    },
    [engineRef, onVolumeChange]
  );

  return {
    masterVolume,
    setMasterVolume,
  };
}
