# Spectrogram Package (`@waveform-playlist/spectrogram`)

## Integration Context Pattern

**Pattern:** Browser package defines an interface + context, this package provides implementation via a Provider component. Same pattern as `@waveform-playlist/annotations`.

**Flow:** Browser defines `SpectrogramIntegrationContext` → this package creates `SpectrogramProvider` that supplies components/functions → browser components use `useSpectrogramIntegration()` and gracefully return `null` if unavailable.

**Throwing Context Hooks (Kent C. Dodds Pattern):**
`useSpectrogramIntegration()` throws if used without the provider. This follows the [Kent C. Dodds context pattern](https://kentcdodds.com/blog/how-to-use-react-context-effectively) — fail fast with a clear error instead of silently rendering nothing.

```typescript
// Components that need spectrograms — throws if <SpectrogramProvider> missing
const integration = useSpectrogramIntegration();

// Internal components that render with or without spectrograms
// use useContext(SpectrogramIntegrationContext) directly to get null when absent
const spectrogram = useContext(SpectrogramIntegrationContext);
```

**Location:** `packages/browser/src/SpectrogramIntegrationContext.tsx`

## SpectrogramChannel Index vs ChannelIndex

**`SpectrogramChannel`** has two index concerns: `index` (CSS positioning via Wrapper `top` offset) and `channelIndex` (canvas ID construction for worker registration, e.g. `clipId-ch{channelIndex}-chunk0`). In "both" mode, `SmartChannel` passes `index={props.index * 2}` for layout interleaving but `channelIndex={props.index}` for correct canvas identity. When `channelIndex` is omitted it defaults to `index`. Never use the visual `index` for canvas IDs — the worker and SpectrogramProvider registry expect sequential audio channel indices (0, 1).
