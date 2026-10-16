// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

// En GitHub Actions, SITE_URL y BASE_PATH los rellena el workflow a partir de
// la configuración de GitHub Pages (vale igual para usuario.github.io/repo/
// que para un dominio propio). En local se usa la raíz.
const site = process.env.SITE_URL || 'https://atilavg.github.io';
const base = process.env.BASE_PATH || '/';

// Mientras sea un prototipo con textos provisionales, no se indexa.
// Para la versión definitiva: INDEXAR=true en el build.
const indexar = process.env.INDEXAR === 'true';

// Fuentes de Google Fonts autoalojadas (paquetes de Fontsource). Astro genera
// los @font-face con font-display: swap y un fallback ajustado a las métricas
// de cada fuente, para que el cambio de fuente no mueva el texto.
const fuente = (/** @type {string} */ ruta) => `./node_modules/${ruta}`;

export default defineConfig({
  site,
  base,
  trailingSlash: 'ignore',
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Geist',
      cssVariable: '--fuente-texto',
      fallbacks: ['system-ui', 'sans-serif'],
      options: {
        variants: [
          {
            src: [fuente('@fontsource-variable/geist/files/geist-latin-wght-normal.woff2')],
            weight: '100 900',
            style: 'normal',
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Geist Mono',
      cssVariable: '--fuente-mono',
      fallbacks: ['ui-monospace', 'monospace'],
      options: {
        variants: [
          {
            src: [fuente('@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2')],
            weight: '100 900',
            style: 'normal',
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Instrument Serif',
      cssVariable: '--fuente-titulos',
      fallbacks: ['Georgia', 'serif'],
      options: {
        variants: [
          {
            src: [fuente('@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2')],
            weight: 400,
            style: 'normal',
          },
          {
            src: [fuente('@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2')],
            weight: 400,
            style: 'italic',
          },
        ],
      },
    },
  ],
  vite: {
    define: {
      __INDEXAR__: JSON.stringify(indexar),
    },
  },
});
