/**
 * Recuerda por dónde va la lectura para recuperarla cuando la página cambia
 * de modo (escena animada ↔ portada fija), por ejemplo al girar el móvil:
 * la intro pasa de medir 520vh a ser una imagen y la portada, y ScrollTrigger
 * deja el scroll arriba del todo. Se guarda un "ancla" (en qué parte de la
 * intro, o qué sección y a qué altura) y se vuelve a ella tras el cambio.
 */
import { hayEscena, T } from './comun';

type Ancla =
  | { tipo: 'intro'; progreso: number } // 0–1 dentro del recorrido de la intro
  | { tipo: 'portada'; pasado: number } // px pasados del final de la intro
  | { tipo: 'seccion'; el: Element; arriba: number };

/** Parte del recorrido de la intro que ocupa el vídeo (acto 1). */
const FIN_VIDEO = T.fundido / T.total;
const ESPERA = 1200;

const intro = document.querySelector<HTMLElement>('[data-intro]');
const portada = document.querySelector<HTMLElement>('[data-portada]');
const nav = document.querySelector<HTMLElement>('[data-nav]');

let ancla: Ancla | null = null;
let restaurandoHasta = 0;
/** Dónde dejó el scroll la última restauración (-1: aún no ha restaurado). */
let yRestaurada = -1;

const altoNav = () => nav?.offsetHeight ?? 0;
const arribaEnDocumento = (el: Element) => el.getBoundingClientRect().top + window.scrollY;

/**
 * Posición de scroll en la que la portada ya se ve terminada: con escena, el
 * final del recorrido fijo; sin escena, cuando la portada llega arriba.
 */
export function finIntro() {
  if (!intro) return 0;
  if (hayEscena()) return arribaEnDocumento(intro) + intro.offsetHeight - window.innerHeight;
  return portada ? Math.max(0, arribaEnDocumento(portada) - altoNav()) : arribaEnDocumento(intro);
}

function calcular(): Ancla | null {
  if (!intro) return null;
  const y = window.scrollY;
  const fin = finIntro();
  if (y < fin - 2) {
    const p = fin > 0 ? y / fin : 0;
    // Sin escena, el tramo de antes de la portada equivale al vídeo
    return { tipo: 'intro', progreso: hayEscena() ? p : p * FIN_VIDEO };
  }
  if (intro.getBoundingClientRect().bottom > altoNav() + 1) return { tipo: 'portada', pasado: y - fin };
  const siguientes = document.querySelectorAll('main > section:not([data-intro]), body > footer');
  for (const el of siguientes) {
    const caja = el.getBoundingClientRect();
    if (caja.bottom > altoNav()) return { tipo: 'seccion', el, arriba: caja.top };
  }
  return null;
}

function destino(a: Ancla) {
  const fin = finIntro();
  switch (a.tipo) {
    case 'intro':
      if (hayEscena()) return a.progreso * fin;
      // Sin escena: si ya se estaba montando la portada, se va a la portada
      return a.progreso >= FIN_VIDEO ? fin : (a.progreso / FIN_VIDEO) * fin;
    case 'portada':
      return fin + Math.max(0, a.pasado);
    case 'seccion':
      return arribaEnDocumento(a.el) - a.arriba;
  }
}

/** Se llama en cada scroll (ya limitado a uno por fotograma). */
export function guardarPosicion() {
  // Mientras se asienta un cambio de modo no se guarda nada, salvo que la
  // persona ya esté haciendo scroll por su cuenta
  const asentando = performance.now() < restaurandoHasta;
  const quieta = yRestaurada < 0 || Math.abs(window.scrollY - yRestaurada) < 2;
  if (asentando && quieta) return;
  ancla = calcular();
}

/** Tras un salto hecho por código: la escena se pone al día sin reproducir lo saltado. */
export function avisarSalto() {
  window.dispatchEvent(new Event('posicion-saltada'));
}

export function restaurarPosicion() {
  if (!ancla) return;
  window.scrollTo({ top: Math.max(0, Math.round(destino(ancla))), behavior: 'instant' });
  yRestaurada = window.scrollY;
  avisarSalto();
}

/** La página va a cambiar de modo: se congela el ancla y se recupera cuando se asiente. */
export function cambioDeModo() {
  yRestaurada = -1;
  restaurandoHasta = performance.now() + ESPERA;
  requestAnimationFrame(() => requestAnimationFrame(restaurarPosicion));
}

/** ScrollTrigger acaba de recalcular: si fue por un cambio de modo, se vuelve al ancla. */
export function trasRefresco() {
  if (performance.now() < restaurandoHasta) restaurarPosicion();
}
