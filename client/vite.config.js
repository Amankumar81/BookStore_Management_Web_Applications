// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react' // <-- KEEP WHATEVER IMPORT YOU ORIGINALLY HAD HERE

// export default defineConfig({
//   plugins: [react()],
//   build: {
//     chunkSizeWarningLimit: 1000 // This fixes the warning by raising the limit to 1000kB
//   }
// })
import { defineConfig } from 'vitest/config';   // was: from 'vite'
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
  },
});