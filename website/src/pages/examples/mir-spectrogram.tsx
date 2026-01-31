import React from 'react';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';
import { createLazyExample } from '../../components/BrowserOnlyWrapper';
import { AudioCredits } from '../../components/AudioCredits';

const LazyMirSpectrogramExample = createLazyExample(
  () => import('../../components/examples/MirSpectrogramExample').then(m => ({ default: m.MirSpectrogramExample }))
);

export default function MirSpectrogramPage(): React.ReactElement {
  return (
    <Layout
      title="MIR Spectrogram"
      description="Frequency-domain spectrogram visualization with configurable FFT, window functions, frequency scales, and color maps"
    >
      <Head>
        <meta property="og:title" content="MIR Spectrogram - Waveform Playlist" />
        <meta property="og:description" content="Frequency-domain spectrogram visualization with configurable FFT, window functions, frequency scales, and color maps" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="MIR Spectrogram - Waveform Playlist" />
        <meta name="twitter:description" content="Frequency-domain spectrogram visualization with configurable FFT, window functions, frequency scales, and color maps" />
      </Head>
      <main className="container margin-vert--lg">
        <h1>MIR Spectrogram</h1>
        <p style={{ marginBottom: '2rem' }}>
          Frequency-domain visualization for music information retrieval. Configure FFT parameters,
          window functions, frequency scales, and color maps per track.
        </p>

        <LazyMirSpectrogramExample />

        <div style={{ marginTop: '2rem' }}>
          <h2>About This Example</h2>
          <p>This example demonstrates:</p>
          <ul>
            <li>Spectrogram rendering with configurable FFT size and window functions</li>
            <li>Five frequency scales: linear, logarithmic, mel, bark, ERB</li>
            <li>Six perceptually uniform color maps: viridis, magma, inferno, grayscale, inverted gray, roseus</li>
            <li>Per-track render mode: waveform, spectrogram, or split (both)</li>
            <li>Frequency range control and dB range adjustment</li>
            <li>Progress overlay and playback over spectrogram views</li>
          </ul>
        </div>

        <AudioCredits track="whiptails" />
      </main>
    </Layout>
  );
}
