import React, { useState, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import {
  WaveformPlaylistProvider,
  Waveform,
  PlayButton,
  PauseButton,
  StopButton,
  AudioPosition,
  ZoomInButton,
  ZoomOutButton,
  useAudioTracks,
  usePlaybackShortcuts,
} from '@waveform-playlist/browser';
import type { SpectrogramConfig, RenderMode, ColorMapName } from '@waveform-playlist/core';
import type { AudioTrackConfig } from '@waveform-playlist/browser';
import { useDocusaurusTheme } from '../../hooks/useDocusaurusTheme';

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`;

const ControlBar = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding: 0.75rem 1rem;
  flex-wrap: wrap;
  background: var(--ifm-background-surface-color, #f5f5f5);
  border-radius: 6px;
  margin-bottom: 1rem;
`;

const ConfigPanel = styled.div<{ $collapsed: boolean }>`
  background: var(--ifm-background-surface-color, #f5f5f5);
  border-radius: 6px;
  padding: ${p => p.$collapsed ? '0' : '1rem'};
  margin-bottom: 1rem;
  max-height: ${p => p.$collapsed ? '0' : '600px'};
  overflow: hidden;
  transition: max-height 0.3s ease, padding 0.3s ease;
`;

const ConfigGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
`;

const ConfigGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const Label = styled.label`
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.7;
`;

const Select = styled.select`
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--ifm-color-emphasis-300, #ccc);
  border-radius: 4px;
  background: var(--ifm-background-color, #fff);
  color: inherit;
  font-size: 0.85rem;
`;

const RangeInput = styled.input`
  width: 100%;
`;

const RangeValue = styled.span`
  font-size: 0.75rem;
  font-family: monospace;
  opacity: 0.6;
`;

const ToggleButton = styled.button`
  background: none;
  border: 1px solid var(--ifm-color-emphasis-300, #ccc);
  border-radius: 4px;
  padding: 0.35rem 0.75rem;
  cursor: pointer;
  font-size: 0.85rem;
  color: inherit;

  &:hover {
    background: var(--ifm-color-emphasis-100, #eee);
  }
`;

const TrackModeRow = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--ifm-color-emphasis-200, #ddd);

  &:last-child { border-bottom: none; }
`;

const TrackName = styled.span`
  font-weight: 600;
  min-width: 80px;
`;

const TRACK_CONFIGS: { src: string; name: string; defaultMode: RenderMode }[] = [
  {
    src: '/waveform-playlist/media/audio/AlbertKader_Whiptails/09_Synth1.opus',
    name: 'Synth',
    defaultMode: 'spectrogram',
  },
  {
    src: '/waveform-playlist/media/audio/AlbertKader_Whiptails/07_Bass1.opus',
    name: 'Bass',
    defaultMode: 'spectrogram',
  },
  {
    src: '/waveform-playlist/media/audio/AlbertKader_Whiptails/03_Kick.opus',
    name: 'Kick',
    defaultMode: 'both',
  },
  {
    src: '/waveform-playlist/media/audio/AlbertKader_Whiptails/06_HiHat.opus',
    name: 'HiHat',
    defaultMode: 'waveform',
  },
];

const FFT_SIZES = [256, 512, 1024, 2048, 4096, 8192];
const WINDOW_FUNCTIONS = ['hann', 'hamming', 'blackman', 'blackman-harris', 'bartlett', 'rectangular'] as const;
const FREQ_SCALES = ['linear', 'logarithmic', 'mel', 'bark', 'erb'] as const;
const COLOR_MAPS: ColorMapName[] = ['viridis', 'magma', 'inferno', 'grayscale', 'igray', 'roseus'];

function MirSpectrogramInner() {
  usePlaybackShortcuts();
  return null;
}

export function MirSpectrogramExample() {
  const { theme } = useDocusaurusTheme();

  // Per-track render modes
  const [trackModes, setTrackModes] = useState<RenderMode[]>(
    TRACK_CONFIGS.map(t => t.defaultMode)
  );

  // Spectrogram config state
  const [fftSize, setFftSize] = useState(2048);
  const [windowFn, setWindowFn] = useState<string>('hann');
  const [freqScale, setFreqScale] = useState<string>('linear');
  const [colorMap, setColorMap] = useState<ColorMapName>('viridis');
  const [minFreq, setMinFreq] = useState(0);
  const [maxFreq, setMaxFreq] = useState(20000);
  const [minDb, setMinDb] = useState(-100);
  const [maxDb, setMaxDb] = useState(-20);
  const [gainDb, setGainDb] = useState(0);
  const [showLabels, setShowLabels] = useState(false);
  const [configCollapsed, setConfigCollapsed] = useState(false);

  // Build audio configs with render modes
  const audioConfigs: AudioTrackConfig[] = useMemo(() =>
    TRACK_CONFIGS.map((tc, i) => ({
      src: tc.src,
      name: tc.name,
      renderMode: trackModes[i],
    })),
    [trackModes]
  );

  const { tracks, loading, error } = useAudioTracks(audioConfigs, { progressive: true });

  const spectrogramConfig: SpectrogramConfig = useMemo(() => ({
    fftSize,
    windowFunction: windowFn as SpectrogramConfig['windowFunction'],
    frequencyScale: freqScale as SpectrogramConfig['frequencyScale'],
    minFrequency: minFreq,
    maxFrequency: maxFreq,
    minDecibels: minDb,
    maxDecibels: maxDb,
    gainDb,
    labels: showLabels,
  }), [fftSize, windowFn, freqScale, minFreq, maxFreq, minDb, maxDb, gainDb, showLabels]);

  const setTrackMode = useCallback((index: number, mode: RenderMode) => {
    setTrackModes(prev => {
      const next = [...prev];
      next[index] = mode;
      return next;
    });
  }, []);

  if (error) return <div>Error: {error}</div>;

  return (
    <Container>
      <ToggleButton onClick={() => setConfigCollapsed(!configCollapsed)}>
        {configCollapsed ? 'Show' : 'Hide'} Config Panel
      </ToggleButton>

      <ConfigPanel $collapsed={configCollapsed}>
        <ConfigGrid>
          <ConfigGroup>
            <Label>FFT Size</Label>
            <Select value={fftSize} onChange={e => setFftSize(Number(e.target.value))}>
              {FFT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </ConfigGroup>

          <ConfigGroup>
            <Label>Window Function</Label>
            <Select value={windowFn} onChange={e => setWindowFn(e.target.value)}>
              {WINDOW_FUNCTIONS.map(w => <option key={w} value={w}>{w}</option>)}
            </Select>
          </ConfigGroup>

          <ConfigGroup>
            <Label>Frequency Scale</Label>
            <Select value={freqScale} onChange={e => setFreqScale(e.target.value)}>
              {FREQ_SCALES.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </ConfigGroup>

          <ConfigGroup>
            <Label>Color Map</Label>
            <Select value={colorMap} onChange={e => setColorMap(e.target.value as ColorMapName)}>
              {COLOR_MAPS.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </ConfigGroup>

          <ConfigGroup>
            <Label>Min Frequency: <RangeValue>{minFreq} Hz</RangeValue></Label>
            <RangeInput type="range" min={0} max={5000} step={50} value={minFreq}
              onChange={e => setMinFreq(Number(e.target.value))} />
          </ConfigGroup>

          <ConfigGroup>
            <Label>Max Frequency: <RangeValue>{maxFreq} Hz</RangeValue></Label>
            <RangeInput type="range" min={1000} max={22050} step={50} value={maxFreq}
              onChange={e => setMaxFreq(Number(e.target.value))} />
          </ConfigGroup>

          <ConfigGroup>
            <Label>Min dB: <RangeValue>{minDb} dB</RangeValue></Label>
            <RangeInput type="range" min={-120} max={-20} step={5} value={minDb}
              onChange={e => setMinDb(Number(e.target.value))} />
          </ConfigGroup>

          <ConfigGroup>
            <Label>Max dB: <RangeValue>{maxDb} dB</RangeValue></Label>
            <RangeInput type="range" min={-60} max={0} step={5} value={maxDb}
              onChange={e => setMaxDb(Number(e.target.value))} />
          </ConfigGroup>

          <ConfigGroup>
            <Label>Gain: <RangeValue>{gainDb} dB</RangeValue></Label>
            <RangeInput type="range" min={-20} max={40} step={1} value={gainDb}
              onChange={e => setGainDb(Number(e.target.value))} />
          </ConfigGroup>

          <ConfigGroup>
            <Label>
              <input type="checkbox" checked={showLabels} onChange={e => setShowLabels(e.target.checked)} />
              {' '}Frequency Labels
            </Label>
          </ConfigGroup>
        </ConfigGrid>

        <div style={{ marginTop: '1rem' }}>
          <Label>Track Render Modes</Label>
          {TRACK_CONFIGS.map((tc, i) => (
            <TrackModeRow key={tc.name}>
              <TrackName>{tc.name}</TrackName>
              {(['waveform', 'spectrogram', 'both'] as RenderMode[]).map(mode => (
                <label key={mode} style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name={`track-mode-${i}`}
                    checked={trackModes[i] === mode}
                    onChange={() => setTrackMode(i, mode)}
                  />
                  {' '}{mode}
                </label>
              ))}
            </TrackModeRow>
          ))}
        </div>
      </ConfigPanel>

      {loading && <div style={{ padding: '1rem', opacity: 0.7 }}>Loading tracks...</div>}

      {tracks.length > 0 && (
        <WaveformPlaylistProvider
          tracks={tracks}
          theme={theme}
          waveHeight={100}
          samplesPerPixel={512}
          zoomLevels={[128, 256, 512, 1024, 2048, 4096]}
          controls={{ show: true, width: 180 }}
          spectrogramConfig={spectrogramConfig}
          spectrogramColorMap={colorMap}
        >
          <MirSpectrogramInner />
          <ControlBar>
            <PlayButton />
            <PauseButton />
            <StopButton />
            <AudioPosition />
            <ZoomInButton />
            <ZoomOutButton />
          </ControlBar>
          <Waveform />
        </WaveformPlaylistProvider>
      )}
    </Container>
  );
}
