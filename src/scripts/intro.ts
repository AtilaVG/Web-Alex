/**
 * Script de entrada (pequeño, sin GSAP):
 * - botón «Saltar intro» y estado de la navegación;
 * - si alguien llega con el teclado a la portada antes de que esté montada,
 *   se salta al final de la intro para que lo enfocado se vea;
 * - carga diferida de las escenas (GSAP + ScrollTrigger + fotogramas):
 *   cuando la página ha cargado y el navegador está libre, o antes si la
 *   persona empieza a hacer scroll.
 */
import { hayEscena } from './comun';

const raiz = document.documentElement;
const intro = document.querySelector<HTMLElement>('[data-intro]');
const portada = document.querySelector<HTMLElement>('[data-portada]');
const nombre = document.querySelector<HTMLElement>('[data-nombre]');
const nav = document.querySelector<HTMLElement>('[data-nav]');
const saltar = document.querySelector<HTMLAnchorElement>('[data-saltar-intro]');

/** Posición de scroll en la que la portada ya está terminada. */
function finIntro() {
  if (!intro) return 0;
  const arriba = intro.getBoundingClientRect().top + window.scrollY;
  return hayEscena() ? arriba + intro.offsetHeight - window.innerHeight : arriba;
}

function irAlFinal() {
  window.scrollTo({ top: finIntro(), behavior: 'instant' });
}

if (intro && portada) {
  saltar?.addEventListener('click', (e) => {
    if (!hayEscena()) return; // sin escena, el enlace #portada ya hace lo correcto
    e.preventDefault();
    irAlFinal();
    nombre?.focus({ preventScroll: true });
  });

  portada.addEventListener('focusin', () => {
    if (hayEscena() && window.scrollY < finIntro() - 2) irAlFinal();
  });
}

// Navegación: «Saltar intro» desaparece al terminar la intro y la barra se
// vuelve opaca cuando hay contenido pasando por debajo.
if (nav && intro) {
  let pedido = false;
  const actualizar = () => {
    pedido = false;
    const fin = finIntro();
    const y = window.scrollY;
    nav.classList.toggle('is-pasada', y >= fin - 2);
    nav.classList.toggle('is-solida', hayEscena() ? y > fin + 8 : y > 8);
  };
  const pedir = () => {
    if (!pedido) {
      pedido = true;
      requestAnimationFrame(actualizar);
    }
  };
  window.addEventListener('scroll', pedir, { passive: true });
  window.addEventListener('resize', pedir);
  actualizar();
}

// Carga diferida de las escenas
if (intro && raiz.classList.contains('anima')) {
  let empezado = false;
  const empezar = () => {
    if (empezado) return;
    empezado = true;
    import('./escenas')
      .then(({ iniciar }) => iniciar(intro))
      .catch((error) => {
        // Si GSAP no llega, se enseña la portada montada en vez de dejarla oculta
        console.error(error);
        raiz.classList.remove('anima');
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
