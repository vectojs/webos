import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5201,
    host: '127.0.0.1',
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
