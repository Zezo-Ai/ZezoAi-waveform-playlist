/**
 * Shared annotation types used across Waveform components
 */

/**
 * Base annotation data structure
 */
export interface AnnotationData {
  id: string;
  start: number;
  end: number;
  lines: string[];
}

/**
 * Custom function to generate the label shown on annotation boxes in the waveform.
 * Receives the annotation data and its index in the list, returns a string label.
 * Default behavior: displays annotation.id
 *
 * @example
 * // Show sequence numbers
 * getAnnotationBoxLabel={(annotation, index) => String(index + 1)}
 *
 * @example
 * // Show formatted time
 * getAnnotationBoxLabel={(annotation) => formatTime(annotation.start)}
 */
export type GetAnnotationBoxLabelFn = (annotation: AnnotationData, index: number) => string;

/**
 * Callback when annotations are updated (e.g., boundaries dragged).
 * Called with the full updated annotations array.
 */
export type OnAnnotationUpdateFn = (annotations: AnnotationData[]) => void;
