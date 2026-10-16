/**
 * Cuándo hay escena animada: con JS (clase .anima, que ya excluye «reducir
 * movimiento») y con altura suficiente para que quepa la portada fija.
 * Tiene que coincidir con la media query de .anima en global.css.
 */
export const MEDIA_ESCENA = '(min-height: 560px) and (prefers-reduced-motion: no-preference)';

export const hayEscena = () =>
  document.documentElement.classList.contains('anima') && window.matchMedia(MEDIA_ESCENA).matches;

/**
 * Tramos de la línea de tiempo de la intro (en unidades de scroll; la
 * sección mide 520vh, así que cada unidad son ~33vh). Ver escenas.ts.
 */
export const T = {
  videoFin: 3.6,
  aviso: 3.2,
  cursor: 3.3,
  fundido: 3.6,
  teclear: 4.3,
  rejilla: 5.6,
  cajas: 6.6,
  tipografia: 7.8,
  color: 9.2,
  fotos: 10.4,
  final: 11.4,
  total: 12.8,
};
