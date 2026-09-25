import { defineConfig } from 'vite';

export default defineConfig({
  server: { host: '127.0.0.1', port: 5190 },
  build: { target: 'es2022', chunkSizeWarningLimit: 1500 },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
} as never);
