import { defineConfig } from 'vite';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '../..');

// Resolve workspace peer dependencies from source (not dist/) so dev page
// picks up changes without rebuilding. Matches the Docusaurus webpack alias
// pattern in website/docusaurus.config.ts.
export default defineConfig({
  root: import.meta.dirname,
  publicDir: path.resolve(repoRoot, 'website/static'),
  resolve: {
    alias: {
      '@dawcore/components': path.resolve(
        repoRoot,
        'packages/dawcore/src/index.ts',
      ),
      '@waveform-playlist/core': path.resolve(
        repoRoot,
        'packages/core/src/index.ts',
      ),
      '@waveform-playlist/engine': path.resolve(
        repoRoot,
        'packages/engine/src/index.ts',
      ),
      '@dawcore/transport': path.resolve(
        repoRoot,
        'packages/transport/src/index.ts',
      ),
      // NOTE: `@dawcore/spectrogram` is deliberately NOT aliased to source. Its
      // worker URL — `new URL('@dawcore/spectrogram/worker/spectrogram.worker',
      // import.meta.url)` — needs node_modules resolution to find the built
      // worker dist. Source aliasing would break it. Rebuild the package
      // (`pnpm --filter @dawcore/spectrogram build`) after editing orchestrator/
      // computation code.
    },
  },
  optimizeDeps: {
    exclude: ['tone'],
  },
  server: {
    port: 5173,
    open: '/',
  },
});
