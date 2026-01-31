import React, { FunctionComponent } from 'react';
import { useDevicePixelRatio, usePlaylistInfo, useTheme } from '../contexts';
import { Channel } from './Channel';
import { SpectrogramChannel, type SpectrogramChannelProps } from './SpectrogramChannel';
import type { SpectrogramData, RenderMode } from '@waveform-playlist/core';

export interface SmartChannelProps {
  className?: string;
  index: number;
  data: Int8Array | Int16Array;
  bits: 8 | 16;
  length: number;
  isSelected?: boolean; // Whether this channel's track is selected
  /** If true, background is transparent (for use with external progress overlay) */
  transparentBackground?: boolean;
  /** Render mode: waveform, spectrogram, or both */
  renderMode?: RenderMode;
  /** Spectrogram data for this channel */
  spectrogramData?: SpectrogramData;
  /** 256-entry RGB LUT from getColorMap() */
  spectrogramColorLUT?: Uint8Array;
  /** Samples per pixel at current zoom level */
  samplesPerPixel?: number;
  /** Frequency scale function */
  spectrogramFrequencyScaleFn?: (f: number, minF: number, maxF: number) => number;
  /** Min frequency in Hz */
  spectrogramMinFrequency?: number;
  /** Max frequency in Hz */
  spectrogramMaxFrequency?: number;
  /** Show frequency labels */
  spectrogramLabels?: boolean;
  /** Label text color */
  spectrogramLabelsColor?: string;
  /** Label background color */
  spectrogramLabelsBackground?: string;
}

export const SmartChannel: FunctionComponent<SmartChannelProps> = ({
  isSelected,
  transparentBackground,
  renderMode = 'waveform',
  spectrogramData,
  spectrogramColorLUT,
  samplesPerPixel: sppProp,
  spectrogramFrequencyScaleFn,
  spectrogramMinFrequency,
  spectrogramMaxFrequency,
  spectrogramLabels,
  spectrogramLabelsColor,
  spectrogramLabelsBackground,
  ...props
}) => {
  const theme = useTheme();
  const { waveHeight, barWidth, barGap, samplesPerPixel: contextSpp } = usePlaylistInfo();
  const devicePixelRatio = useDevicePixelRatio();
  const samplesPerPixel = sppProp ?? contextSpp;

  // Use selected colors if track is selected
  const waveOutlineColor = isSelected && theme
    ? theme.selectedWaveOutlineColor
    : theme?.waveOutlineColor;

  const waveFillColor = isSelected && theme
    ? theme.selectedWaveFillColor
    : theme?.waveFillColor;

  // Get draw mode from theme (defaults to 'inverted' for backwards compatibility)
  const drawMode = theme?.waveformDrawMode || 'inverted';

  if (renderMode === 'spectrogram' && spectrogramData) {
    return (
      <SpectrogramChannel
        index={props.index}
        data={spectrogramData}
        length={props.length}
        waveHeight={waveHeight}
        devicePixelRatio={devicePixelRatio}
        samplesPerPixel={samplesPerPixel}
        colorLUT={spectrogramColorLUT}
        frequencyScaleFn={spectrogramFrequencyScaleFn}
        minFrequency={spectrogramMinFrequency}
        maxFrequency={spectrogramMaxFrequency}
        labels={spectrogramLabels}
        labelsColor={spectrogramLabelsColor}
        labelsBackground={spectrogramLabelsBackground}
      />
    );
  }

  if (renderMode === 'both' && spectrogramData) {
    // Spectrogram above, waveform below — each at full waveHeight.
    // The "both" channel index occupies 2× slots, so spectrogram is at
    // slot (index * 2) and waveform at slot (index * 2 + 1).
    return (
      <>
        <SpectrogramChannel
          index={props.index * 2}
          data={spectrogramData}
          length={props.length}
          waveHeight={waveHeight}
          devicePixelRatio={devicePixelRatio}
          samplesPerPixel={samplesPerPixel}
          colorLUT={spectrogramColorLUT}
          frequencyScaleFn={spectrogramFrequencyScaleFn}
          minFrequency={spectrogramMinFrequency}
          maxFrequency={spectrogramMaxFrequency}
          labels={spectrogramLabels}
          labelsColor={spectrogramLabelsColor}
          labelsBackground={spectrogramLabelsBackground}
        />
        <div style={{ position: 'absolute', top: (props.index * 2 + 1) * waveHeight, width: props.length, height: waveHeight }}>
          <Channel
            {...props}
            {...theme}
            index={0}
            waveOutlineColor={waveOutlineColor}
            waveFillColor={waveFillColor}
            waveHeight={waveHeight}
            devicePixelRatio={devicePixelRatio}
            barWidth={barWidth}
            barGap={barGap}
            transparentBackground={transparentBackground}
            drawMode={drawMode}
          />
        </div>
      </>
    );
  }

  // Default: waveform mode
  return (
    <Channel
      {...props}
      {...theme}
      waveOutlineColor={waveOutlineColor}
      waveFillColor={waveFillColor}
      waveHeight={waveHeight}
      devicePixelRatio={devicePixelRatio}
      barWidth={barWidth}
      barGap={barGap}
      transparentBackground={transparentBackground}
      drawMode={drawMode}
    ></Channel>
  );
};
