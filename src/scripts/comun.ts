/**
 * Cuándo hay escena animada: con JS (clase .anima, que ya excluye «reducir
 * movimiento») y con altura suficiente para que quepa la portada fija.
 * Tiene que coincidir con la media query de .anima en global.css.
 */
export const MEDIA_ESCENA = '(min-height: 560px) and (prefers-reduced-motion: no-preference)';

export const hayEscena = () =>
  document.documentElement.classList.contains('anima') && window.matchMedia(MEDIA_ESCENA).matches;
