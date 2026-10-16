/**
 * Script de entrada (pequeño, sin GSAP):
 * - botón «Saltar intro» y estado de la navegación;
 * - si alguien llega con el teclado a un enlace de la portada antes de que
 *   esté montada, se salta al final de la intro para que lo enfocado se vea;
 * - recuerda por dónde va la lectura para recuperarla si la página cambia de
 *   modo (girar el móvil: escena animada ↔ portada fija);
 * - carga diferida de las escenas (GSAP + ScrollTrigger + fotogramas):
 *   cuando la página ha cargado y el navegador está libre, o antes si la
 *   persona empieza a hacer scroll.
 */
import { MEDIA_ESCENA, hayEscena } from './comun';
import { avisarSalto, cambioDeModo, finIntro, guardarPosicion } from './posicion';

const raiz = document.documentElement;
const intro = document.querySelector<HTMLElement>('[data-intro]');
const portada = document.querySelector<HTMLElement>('[data-portada]');
const nombre = document.querySelector<HTMLElement>('[data-nombre]');
const nav = document.querySelector<HTMLElement>('[data-nav]');
const saltar = document.querySelector<HTMLAnchorElement>('[data-saltar-intro]');

let escenasListas = false;
let haSaltado = false;

/**
 * Lleva a la portada terminada. Si GSAP aún no ha llegado, la clase .saltada
 * enseña ya la portada montada (CSS) hasta que la escena tome el control.
 */
function irAlFinal() {
  haSaltado = true;
  if (!escenasListas) raiz.classList.add('saltada');
  window.scrollTo({ top: finIntro(), behavior: 'instant' });
  avisarSalto();
}

if (intro && portada) {
  saltar?.addEventListener('click', (e) => {
    if (!hayEscena()) return; // sin escena, el enlace #portada ya hace lo correcto
    e.preventDefault();
    irAlFinal();
    nombre?.focus({ preventScroll: true });
  });

  // Solo cuenta el foco con teclado en un enlace o botón de la portada (no el
  // de la propia capa al hacer clic, ni el del titular tras «Saltar intro»).
  portada.addEventListener('focusin', (e) => {
    const destino = e.target as HTMLElement;
    if (destino.tabIndex < 0 || !destino.matches(':focus-visible')) return;
    if (hayEscena() && window.scrollY < finIntro() - 2) irAlFinal();
  });
}

// Navegación: «Saltar intro» desaparece al llegar a la portada terminada y la
// barra se vuelve opaca cuando hay contenido pasando por debajo.
function actualizarNav() {
  if (!nav || !intro) return;
  const fin = finIntro();
  const y = window.scrollY;
  nav.classList.toggle('is-pasada', y >= fin - 2);
  nav.classList.toggle('is-solida', hayEscena() ? y > fin + 8 : y > 8);
}

if (intro) {
  let pedido = false;
  const alMoverse = () => {
    if (pedido) return;
    pedido = true;
    requestAnimationFrame(() => {
      pedido = false;
      actualizarNav();
      guardarPosicion();
    });
  };
  window.addEventListener('scroll', alMoverse, { passive: true });
  window.addEventListener('resize', alMoverse);
  actualizarNav();
  guardarPosicion();

  // Cambio de modo (girar el móvil, activar «reducir movimiento»…): se vuelve
  // a la misma parte de la página cuando se asiente el nuevo diseño.
  window.matchMedia(MEDIA_ESCENA).addEventListener('change', () => {
    if (raiz.classList.contains('anima')) cambioDeModo();
  });
}

// Carga diferida de las escenas
if (intro && raiz.classList.contains('anima')) {
  let empezado = false;
  const empezar = () => {
    if (empezado) return;
    empezado = true;
    import('./escenas')
      .then(({ iniciar }) => {
        iniciar(intro);
        escenasListas = true;
      })
      .catch((error) => {
        // Si GSAP no llega, se enseña la portada montada en vez de dejarla oculta
        console.error(error);
        cambioDeModo();
        raiz.classList.remove('anima', 'saltada');
        if (haSaltado) portada?.scrollIntoView({ behavior: 'instant' });
        actualizarNav();
      });
  };
  const cuandoLibre = () =>
    'requestIdleCallback' in window ? window.requestIdleCallback(empezar, { timeout: 1500 }) : setTimeout(empezar, 1);

  if (document.readyState === 'complete') cuandoLibre();
  else window.addEventListener('load', cuandoLibre, { once: true });

  for (const evento of ['scroll', 'wheel', 'touchstart', 'keydown', 'pointerdown']) {
    window.addEventListener(evento, empezar, { once: true, passive: true });
  }
}
