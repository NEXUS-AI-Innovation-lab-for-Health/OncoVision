import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(() => {
  return {
    // expose both VITE_ and API_ prefixed env vars to the client so the app
    // can keep using `API_URL` in .env during development
    envPrefix: ["VITE_", "API_"],

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
