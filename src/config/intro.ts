/**
 * Secuencias de fotogramas de la intro (acto 1).
 *
 * Son los fotogramas de `fuentes/intro.mp4` (vídeo generado con IA), pintados
 * en un <canvas> según el scroll. Para regenerarlos: `scripts/fotogramas.sh`.
 *
 * La de móvil se elige con la misma media query que el <picture> del póster,
 * para que el primer fotograma y el canvas coincidan.
 */
export const secuencias = {
  escritorio: { carpeta: 'seq/desktop', total: 120, ancho: 1280, alto: 720 },
  movil: { carpeta: 'seq/mobile', total: 60, ancho: 960, alto: 540 },
};

export const mediaMovil = '(max-width: 800px)';

/** Nombre de cada fotograma: f_001.webp, f_002.webp… */
export const nombreFotograma = (n: number) => `f_${String(n).padStart(3, '0')}.webp`;

/**
 * Parte del ancho del fotograma que tiene que verse siempre en pantallas
 * verticales (el portátil ocupa el 42 % central). En horizontal manda el
 * recorte normal a pantalla completa.
 */
export const foco = 0.5;
