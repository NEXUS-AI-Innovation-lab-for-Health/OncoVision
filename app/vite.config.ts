import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Cornerstone codecs (UMD/CJS) doivent être pré-bundlés par Vite,
    // sinon les imports `default` peuvent casser en dev.
    include: [
      "@cornerstonejs/dicom-image-loader",
      "@cornerstonejs/codec-libjpeg-turbo-8bit/decodewasmjs",
      "@cornerstonejs/codec-libjpeg-turbo-8bit/wasmjs",
      "@cornerstonejs/codec-charls",
      "@cornerstonejs/codec-openjpeg",
      "@cornerstonejs/codec-openjph",
    ],
    needsInterop: ["@cornerstonejs/codec-libjpeg-turbo-8bit"],
  },
})
