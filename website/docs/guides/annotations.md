---
sidebar_position: 6
---

# Annotations

Add time-synchronized text annotations to your audio timeline with drag-to-edit functionality. The annotations package provides a flexible, composable architecture that lets you build custom annotation UIs.

## Installation

Install the annotations package:

```bash npm2yarn
npm install @waveform-playlist/annotations
```

## Architecture Overview

The annotations package exports composable building blocks:

| Component | Description |
|-----------|-------------|
| `AnnotationText` | Scrollable list of annotation text with auto-scroll to active |
| `AnnotationBox` | Individual draggable box on the timeline |
| `AnnotationBoxesWrapper` | Container that aligns boxes with the waveform |
| `AnnotationsTrack` | Complete annotation track (combines wrapper + boxes) |
| `Annotation` | Legacy overlay-style annotation (text over waveform) |

**Hooks:**
- `useAnnotationControls` - Manages continuous play, linked endpoints, and boundary updates

**Control Components:**
- `ContinuousPlayCheckbox` - Toggle continuous playback mode
- `LinkEndpointsCheckbox` - Toggle linked annotation boundaries
- `EditableCheckbox` - Toggle edit mode
- `DownloadAnnotationsButton` - Export annotations

## Basic Usage

```tsx
import {
  WaveformPlaylistProvider,
  Waveform,
  useAudioTracks,
} from '@waveform-playlist/browser';
import { AnnotationsTrack } from '@waveform-playlist/annotations';

function AnnotatedPlaylist() {
  const { tracks, loading } = useAudioTracks([
    { src: '/audio/podcast.mp3', name: 'Podcast' },
  ]);

  const [annotations, setAnnotations] = useState([
    { id: '1', start: 0, end: 5, lines: ['Introduction'] },
    { id: '2', start: 5, end: 15, lines: ['Topic Overview'] },
    { id: '3', start: 15, end: 30, lines: ['Main Discussion'] },
  ]);

  if (loading) return <div>Loading...</div>;

  return (
    <WaveformPlaylistProvider tracks={tracks} timescale>
      <Waveform />
      <AnnotationsTrack
        annotations={annotations}
        onAnnotationsChange={setAnnotations}
      />
    </WaveformPlaylistProvider>
  );
}
```

## Annotation Structure

Each annotation has the following properties:

```typescript
interface AnnotationData {
  id: string;         // Unique identifier
  start: number;      // Start time in seconds
  end: number;        // End time in seconds
  lines: string[];    // Text content as array of lines
  language?: string;  // Optional language code (e.g., 'en', 'es')
}
```

## Core Components

### AnnotationText

A scrollable list view of annotations with automatic scrolling to the active annotation during playback.

```tsx
import { AnnotationText } from '@waveform-playlist/annotations';

<AnnotationText
  annotations={annotations}
  activeAnnotationId={currentAnnotation?.id}
  shouldScrollToActive={isPlaying}
  editable={true}
  height={200}
  onAnnotationClick={(annotation) => seekTo(annotation.start)}
  onAnnotationUpdate={setAnnotations}
/>
```

#### Custom Annotation Rendering

Use `renderAnnotationItem` for complete control over how each annotation appears in the list:

```tsx
<AnnotationText
  annotations={annotations}
  activeAnnotationId={activeId}
  renderAnnotationItem={({ annotation, index, isActive, onClick, formatTime }) => (
    <div
      onClick={onClick}
      style={{
        padding: '12px',
        background: isActive ? '#ffe0b2' : 'transparent',
        borderLeft: isActive ? '4px solid #ff9800' : '4px solid transparent',
        cursor: 'pointer',
      }}
    >
      <div style={{ fontWeight: 'bold' }}>{annotation.id}</div>
      <div style={{ fontSize: '12px', color: '#666' }}>
        {formatTime(annotation.start)} - {formatTime(annotation.end)}
      </div>
      <div>{annotation.lines.join('\n')}</div>
    </div>
  )}
/>
```

### AnnotationBox

Individual draggable annotation box for the timeline. Supports boundary resizing with @dnd-kit.

```tsx
import { AnnotationBox } from '@waveform-playlist/annotations';

<AnnotationBox
  annotationId={annotation.id}
  annotationIndex={index}
  startPosition={startPixels}
  endPosition={endPixels}
  label={annotation.id}
  color="#ff9800"
  isActive={annotation.id === activeId}
  editable={true}
  onClick={() => selectAnnotation(annotation)}
/>
```

### AnnotationBoxesWrapper

Container that aligns annotation boxes with the waveform, accounting for track controls width.

```tsx
import { AnnotationBoxesWrapper, AnnotationBox } from '@waveform-playlist/annotations';

<AnnotationBoxesWrapper height={30}>
  {annotations.map((annotation, index) => (
    <AnnotationBox
      key={annotation.id}
      annotationId={annotation.id}
      annotationIndex={index}
      startPosition={annotation.start * pixelsPerSecond}
      endPosition={annotation.end * pixelsPerSecond}
      label={annotation.id}
    />
  ))}
</AnnotationBoxesWrapper>
```

### AnnotationsTrack

Complete annotation track component that combines `AnnotationBoxesWrapper` with `AnnotationBox` components. Best for quick setup.

```tsx
import { AnnotationsTrack } from '@waveform-playlist/annotations';

<AnnotationsTrack
  annotations={annotations}
  onAnnotationsChange={setAnnotations}
  editable={true}
  height={30}
/>
```

## useAnnotationControls Hook

Manages annotation editing state including continuous play mode and linked endpoints.

```tsx
import { useAnnotationControls } from '@waveform-playlist/annotations';

function AnnotationEditor() {
  const {
    continuousPlay,
    linkEndpoints,
    setContinuousPlay,
    setLinkEndpoints,
    updateAnnotationBoundaries,
  } = useAnnotationControls({
    initialContinuousPlay: false,
    initialLinkEndpoints: true,
  });

  // Handle drag updates
  const handleDragEnd = (annotationIndex: number, newTime: number, isDraggingStart: boolean) => {
    const updated = updateAnnotationBoundaries({
      annotationIndex,
      newTime,
      isDraggingStart,
      annotations,
      duration,
      linkEndpoints,
    });
    setAnnotations(updated);
  };

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={continuousPlay}
          onChange={(e) => setContinuousPlay(e.target.checked)}
        />
        Continuous Play
      </label>
      <label>
        <input
          type="checkbox"
          checked={linkEndpoints}
          onChange={(e) => setLinkEndpoints(e.target.checked)}
        />
        Link Endpoints
      </label>
    </div>
  );
}
```

### Linked Endpoints Behavior

When `linkEndpoints` is enabled:
- Dragging the end of annotation A moves the start of annotation B if they're adjacent
- Annotations "snap" together when boundaries meet
- Useful for transcription where segments should be contiguous

When disabled:
- Annotations can overlap or have gaps
- Boundary collisions push adjacent annotations

## Control Components

Pre-built checkbox and button components for common annotation controls:

```tsx
import {
  ContinuousPlayCheckbox,
  LinkEndpointsCheckbox,
  EditableCheckbox,
  DownloadAnnotationsButton,
} from '@waveform-playlist/annotations';

function AnnotationControls({ annotations }) {
  const [continuousPlay, setContinuousPlay] = useState(false);
  const [linkEndpoints, setLinkEndpoints] = useState(true);
  const [editable, setEditable] = useState(true);

  return (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <ContinuousPlayCheckbox
        checked={continuousPlay}
        onChange={setContinuousPlay}
      />
      <LinkEndpointsCheckbox
        checked={linkEndpoints}
        onChange={setLinkEndpoints}
      />
      <EditableCheckbox
        checked={editable}
        onChange={setEditable}
      />
      <DownloadAnnotationsButton
        annotations={annotations}
        filename="my-annotations.json"
      />
    </div>
  );
}
```

## Styling Annotations

Customize annotation appearance via theme:

```tsx
const theme = {
  // Annotation boxes on timeline
  annotationBoxBackground: 'rgba(255, 255, 255, 0.85)',
  annotationBoxActiveBackground: 'rgba(255, 200, 100, 0.95)',
  annotationBoxHoverBackground: 'rgba(255, 255, 255, 0.98)',
  annotationBoxActiveBorder: '#ff9800',
  annotationLabelColor: '#2a2a2a',

  // Resize handles
  annotationResizeHandleColor: 'rgba(0, 0, 0, 0.4)',
  annotationResizeHandleActiveColor: 'rgba(0, 0, 0, 0.8)',

  // Text list items
  annotationTextItemHoverBackground: 'rgba(0, 0, 0, 0.05)',
};

<WaveformPlaylistProvider tracks={tracks} theme={theme}>
  <Waveform />
  <AnnotationsTrack annotations={annotations} />
</WaveformPlaylistProvider>
```

## Import/Export

### Aeneas Format

Parse and serialize the Aeneas synchronization format:

```tsx
import { parseAeneas, serializeAeneas } from '@waveform-playlist/annotations';

// Parse Aeneas JSON
const aeneasData = { fragments: [...] };
const annotations = parseAeneas(aeneasData);

// Serialize back to Aeneas format
const exported = serializeAeneas(annotations);
```

### Download Button

Use the built-in download button:

```tsx
<DownloadAnnotationsButton
  annotations={annotations}
  filename="annotations.json"
/>
```

### Custom Export

```tsx
function ExportAnnotations({ annotations }) {
  const handleExport = () => {
    const json = JSON.stringify(annotations, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'annotations.json';
    a.click();

    URL.revokeObjectURL(url);
  };

  return <button onClick={handleExport}>Export Annotations</button>;
}
```

### Import from JSON

```tsx
function ImportAnnotations({ onImport }) {
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const json = e.target?.result as string;
      const imported = JSON.parse(json);
      onImport(imported);
    };
    reader.readAsText(file);
  };

  return <input type="file" accept=".json" onChange={handleImport} />;
}
```

## Complete Example

```tsx
import { useState } from 'react';
import {
  WaveformPlaylistProvider,
  Waveform,
  PlayButton,
  PauseButton,
  StopButton,
  useAudioTracks,
} from '@waveform-playlist/browser';
import {
  AnnotationsTrack,
  AnnotationText,
  useAnnotationControls,
  ContinuousPlayCheckbox,
  LinkEndpointsCheckbox,
  EditableCheckbox,
  DownloadAnnotationsButton,
} from '@waveform-playlist/annotations';

function AnnotationsExample() {
  const { tracks, loading, error } = useAudioTracks([
    { src: '/audio/podcast.mp3', name: 'Podcast Episode' },
  ], { progressive: true });

  const [annotations, setAnnotations] = useState([
    { id: '1', start: 0, end: 10, lines: ['Introduction'] },
    { id: '2', start: 10, end: 30, lines: ['Main Topic'] },
    { id: '3', start: 30, end: 45, lines: ['Conclusion'] },
  ]);

  const [activeAnnotationId, setActiveAnnotationId] = useState<string>();
  const [editable, setEditable] = useState(true);

  const {
    continuousPlay,
    linkEndpoints,
    setContinuousPlay,
    setLinkEndpoints,
  } = useAnnotationControls();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <WaveformPlaylistProvider
      tracks={tracks}
      samplesPerPixel={1024}
      waveHeight={100}
      timescale
    >
      {/* Playback controls */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <PlayButton />
        <PauseButton />
        <StopButton />
      </div>

      {/* Annotation controls */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <ContinuousPlayCheckbox checked={continuousPlay} onChange={setContinuousPlay} />
        <LinkEndpointsCheckbox checked={linkEndpoints} onChange={setLinkEndpoints} />
        <EditableCheckbox checked={editable} onChange={setEditable} />
        <DownloadAnnotationsButton annotations={annotations} />
      </div>

      {/* Waveform with annotation boxes */}
      <Waveform />
      <AnnotationsTrack
        annotations={annotations}
        onAnnotationsChange={setAnnotations}
        activeAnnotationId={activeAnnotationId}
        editable={editable}
      />

      {/* Annotation text list */}
      <AnnotationText
        annotations={annotations}
        activeAnnotationId={activeAnnotationId}
        editable={editable}
        height={200}
        onAnnotationClick={(annotation) => setActiveAnnotationId(annotation.id)}
        onAnnotationUpdate={setAnnotations}
      />
    </WaveformPlaylistProvider>
  );
}

export default AnnotationsExample;
```

## Use Cases

### Podcast Chapters

Mark sections of a podcast for easy navigation:

```tsx
const chapters = [
  { id: '1', start: 0, end: 120, lines: ['Intro & Sponsors'] },
  { id: '2', start: 120, end: 600, lines: ['Guest Interview'] },
  { id: '3', start: 600, end: 900, lines: ['Q&A Session'] },
  { id: '4', start: 900, end: 960, lines: ['Outro'] },
];
```

### Transcription Segments

Break down audio into transcribed segments:

```tsx
const transcription = [
  { id: '1', start: 0, end: 3.5, lines: ['Welcome to the show.'] },
  { id: '2', start: 3.5, end: 7, lines: ["Today we're discussing..."] },
  // ...
];
```

### Music Markers

Mark sections in music:

```tsx
const musicSections = [
  { id: 'v1', start: 0, end: 16, lines: ['Verse 1'] },
  { id: 'c1', start: 16, end: 32, lines: ['Chorus'] },
  { id: 'v2', start: 32, end: 48, lines: ['Verse 2'] },
  { id: 'c2', start: 48, end: 64, lines: ['Chorus'] },
  { id: 'br', start: 64, end: 80, lines: ['Bridge'] },
  { id: 'c3', start: 80, end: 96, lines: ['Final Chorus'] },
];
```

### Multi-line Annotations

Annotations support multiple lines of text:

```tsx
const detailedAnnotations = [
  {
    id: '1',
    start: 0,
    end: 30,
    lines: [
      'Speaker: John Smith',
      'Topic: Introduction to the project',
      'Key points: overview, timeline, goals',
    ],
  },
];
```

## Live Example

See the [Annotations Example](/examples/annotations) for a full working demo.

## Next Steps

- [Recording](/docs/guides/recording) - Record audio with annotations
- [Theming](/docs/guides/theming) - Customize annotation appearance
