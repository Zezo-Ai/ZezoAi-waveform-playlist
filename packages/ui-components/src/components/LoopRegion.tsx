import React from 'react';
import styled from 'styled-components';

interface LoopRegionOverlayProps {
  readonly $left: number;
  readonly $width: number;
  readonly $color: string;
}

const LoopRegionOverlay = styled.div.attrs<LoopRegionOverlayProps>((props) => ({
  style: {
    left: `${props.$left}px`,
    width: `${props.$width}px`,
  },
}))<LoopRegionOverlayProps>`
  position: absolute;
  top: 0;
  background: ${(props) => props.$color};
  height: 100%;
  z-index: 55; /* Between clips (z-index: 50) and selection (z-index: 60) */
  pointer-events: none;
`;

interface LoopMarkerProps {
  readonly $left: number;
  readonly $color: string;
  readonly $isStart: boolean;
}

const LoopMarker = styled.div.attrs<LoopMarkerProps>((props) => ({
  style: {
    left: `${props.$left}px`,
  },
}))<LoopMarkerProps>`
  position: absolute;
  top: 0;
  width: 2px;
  height: 100%;
  background: ${(props) => props.$color};
  z-index: 90; /* Below playhead (z-index: 100) */
  pointer-events: none;

  /* Triangle marker at top */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    ${(props) => props.$isStart ? 'left: 0' : 'right: 0'};
    width: 0;
    height: 0;
    border-top: 8px solid ${(props) => props.$color};
    ${(props) => props.$isStart
      ? 'border-right: 8px solid transparent;'
      : 'border-left: 8px solid transparent;'
    }
  }
`;

export interface LoopRegionProps {
  startPosition: number; // Start position in pixels
  endPosition: number;   // End position in pixels
  regionColor?: string;
  markerColor?: string;
}

export const LoopRegion: React.FC<LoopRegionProps> = ({
  startPosition,
  endPosition,
  regionColor = 'rgba(59, 130, 246, 0.3)',
  markerColor = '#3b82f6'
}) => {
  const width = Math.max(0, endPosition - startPosition);

  if (width <= 0) {
    return null;
  }

  return (
    <>
      <LoopRegionOverlay
        $left={startPosition}
        $width={width}
        $color={regionColor}
        data-loop-region
      />
      <LoopMarker
        $left={startPosition}
        $color={markerColor}
        $isStart={true}
        data-loop-marker="start"
      />
      <LoopMarker
        $left={endPosition - 2}
        $color={markerColor}
        $isStart={false}
        data-loop-marker="end"
      />
    </>
  );
};
