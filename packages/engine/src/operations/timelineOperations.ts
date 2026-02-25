import type { ClipTrack } from '@waveform-playlist/core';

/**
 * Calculate total timeline duration in seconds from all tracks/clips.
 * Iterates all clips, finds the furthest clip end (startSample + durationSamples),
 * converts to seconds using each clip's sampleRate.
 *
 * @param tracks - Array of clip tracks
 * @param _sampleRate - Timeline sample rate (for API consistency; each clip uses its own sampleRate)
 * @returns Duration in seconds
 */
export function calculateDuration(tracks: ClipTrack[], _sampleRate: number): number {
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
 * Find zoom level index matching a given samplesPerPixel.
 * Returns exact match index, or middle of array if no match.
 *
 * @param targetSamplesPerPixel - The samplesPerPixel value to find
 * @param zoomLevels - Array of available zoom levels (samplesPerPixel values)
 * @returns Index into the zoomLevels array
 */
export function findClosestZoomIndex(
  targetSamplesPerPixel: number,
  zoomLevels: number[],
): number {
  const index = zoomLevels.indexOf(targetSamplesPerPixel);
  return index !== -1 ? index : Math.floor(zoomLevels.length / 2);
}

/**
 * Keep viewport centered during zoom changes.
 * Calculates center time from old zoom, computes new pixel position at new zoom,
 * and returns new scrollLeft clamped to >= 0.
 *
 * @param oldSamplesPerPixel - Previous zoom level
 * @param newSamplesPerPixel - New zoom level
 * @param scrollLeft - Current horizontal scroll position
 * @param containerWidth - Viewport width in pixels
 * @param sampleRate - Audio sample rate
 * @param controlWidth - Width of track controls panel (defaults to 0)
 * @returns New scrollLeft value
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
 * Clamp a seek position to the valid range [0, duration].
 *
 * @param time - Requested seek time in seconds
 * @param duration - Maximum duration in seconds
 * @returns Clamped time value
 */
export function clampSeekPosition(time: number, duration: number): number {
  return Math.max(0, Math.min(time, duration));
}
