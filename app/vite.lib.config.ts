import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Configuration Vite pour builder la lib de viewers
export default defineConfig({
  // Exposer les variables d'env avec préfixe API_
  envPrefix: ['API_'],

  plugins: [
    react({
      babel: {
        plugins: [['@babel/plugin-proposal-decorators', { legacy: true }]],
      },
    }),
  ],

  build: {
    // Point d'entrée de la lib
    lib: {
      entry: resolve(__dirname, 'src/lib.tsx'),
      name: 'SAEImageViewer',
      formats: ['es'],
      fileName: 'index',
    },

    // Ne pas bundler React (le consommateur doit l'avoir)
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
        },
      },
    },

    // Générer un seul fichier CSS pour tous les styles
    cssCodeSplit: false,
  },

  resolve: {
    alias: {
      // Maintenir les alias si nécessaire
    },
  },
})
