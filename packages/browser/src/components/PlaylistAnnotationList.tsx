import React, { useCallback } from 'react';
import { AnnotationText } from '@waveform-playlist/annotations';
import type {
  RenderAnnotationItemProps,
  AnnotationAction,
  AnnotationActionOptions,
} from '@waveform-playlist/annotations';
import { usePlaylistState, usePlaylistControls } from '../WaveformPlaylistContext';
import type { OnAnnotationUpdateFn } from '../types/annotations';

export type { RenderAnnotationItemProps, AnnotationAction, AnnotationActionOptions } from '@waveform-playlist/annotations';
export type { OnAnnotationUpdateFn } from '../types/annotations';

export interface PlaylistAnnotationListProps {
  /** Height in pixels for the annotation text list */
  height?: number;
  /**
   * Custom render function for annotation items in the text list.
   * When provided, completely replaces the default annotation item rendering.
   */
  renderAnnotationItem?: (props: RenderAnnotationItemProps) => React.ReactNode;
  /**
   * Callback when annotations are updated (e.g., text edited).
   * Called with the full updated annotations array.
   */
  onAnnotationUpdate?: OnAnnotationUpdateFn;
  /**
   * Action controls to show on each annotation item (e.g., delete, split).
   * Only rendered when `annotationsEditable` is true in context.
   */
  controls?: AnnotationAction[];
  /**
   * Override annotation list config. Falls back to context values
   * `{ linkEndpoints, continuousPlay }` if not provided.
   */
  annotationListConfig?: AnnotationActionOptions;
  /** Where to position the active annotation when auto-scrolling. Defaults to 'center'. */
  scrollActivePosition?: ScrollLogicalPosition;
  /** Which scrollable containers to scroll: 'nearest' or 'all'. Defaults to 'nearest'. */
  scrollActiveContainer?: 'nearest' | 'all';
}

/**
 * Standalone annotation text list component for WaveformPlaylistProvider (WebAudio).
 *
 * Reads annotations and playback state from context and renders AnnotationText
 * unconditionally (even when annotations are empty).
 */
export const PlaylistAnnotationList: React.FC<PlaylistAnnotationListProps> = ({
  height,
  renderAnnotationItem,
  onAnnotationUpdate,
  controls,
  annotationListConfig,
  scrollActivePosition = 'center',
  scrollActiveContainer = 'nearest',
}) => {
  const {
    annotations,
    activeAnnotationId,
    annotationsEditable,
    linkEndpoints,
    continuousPlay,
  } = usePlaylistState();
  const { setAnnotations } = usePlaylistControls();

  const resolvedConfig = annotationListConfig ?? { linkEndpoints, continuousPlay };

  const handleAnnotationUpdate = useCallback((updatedAnnotations: any[]) => {
    setAnnotations(updatedAnnotations);
    onAnnotationUpdate?.(updatedAnnotations);
  }, [setAnnotations, onAnnotationUpdate]);

  return (
    <AnnotationText
      annotations={annotations}
      activeAnnotationId={activeAnnotationId ?? undefined}
      shouldScrollToActive={true}
      scrollActivePosition={scrollActivePosition}
      scrollActiveContainer={scrollActiveContainer}
      editable={annotationsEditable}
      controls={annotationsEditable ? controls : undefined}
      annotationListConfig={resolvedConfig}
      height={height}
      onAnnotationUpdate={handleAnnotationUpdate}
      renderAnnotationItem={renderAnnotationItem}
    />
  );
};
