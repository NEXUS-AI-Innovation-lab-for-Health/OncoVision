import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(() => {
  return {
    // expose API_ prefixed env vars to the client
    envPrefix: ["API_"],

    plugins: [
      react({
        babel: {
          plugins: [["@babel/plugin-proposal-decorators", { legacy: true }]],
        },
      }),
    ],

    preview: {
      allowedHosts: ['sae.jdsr.dev'],
    },
  };
});
