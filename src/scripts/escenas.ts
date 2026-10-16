/**
 * Escenas de la intro con GSAP + ScrollTrigger (se carga diferido desde intro.ts).
 *
 * Una sola línea de tiempo ligada al scroll de la sección .intro (scrub).
 * Las duraciones son "tramos" de scroll: la sección mide 520vh, así que
 * cada unidad son ~33vh de recorrido.
 *
 *   0    – 3.6   Acto 1: el vídeo avanza hasta que la pantalla llena el encuadre
 *   3.3  – 4.0   aparece el cursor sobre la pantalla y el vídeo se funde al negro
 *   4.3  – 5.5   se teclea el nombre
 *   5.6  – 6.5   rejilla de 12 columnas
 *   6.6  – 7.7   cajas grises del boceto
 *   7.8  – 9.0   tipografía real (la mono da paso a la serif)
 *   9.2  – 10.4  color: el fondo se calienta y entra el ámbar
 *   10.4 – 11.4  fotos
 *   11.4 – 12.4  se recoge la rejilla; portada terminada
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { crearSecuencia, type Secuencia } from './secuencia';
import { MEDIA_ESCENA } from './comun';

gsap.registerPlugin(ScrollTrigger);
// En móvil, que aparezca o se esconda la barra del navegador no recalcula nada
ScrollTrigger.config({ ignoreMobileResize: true });

const T = {
  videoFin: 3.6,
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

/** Momento en que empieza cada fase del rótulo "build" (mismo orden que en Intro.astro). */
const INICIO_FASES = [T.cursor, T.teclear, T.rejilla, T.cajas, T.tipografia, T.color, T.fotos, T.final];

export function iniciar(intro: HTMLElement) {
  const mm = gsap.matchMedia();
  mm.add(MEDIA_ESCENA, () => montar(intro));
}

function montar(intro: HTMLElement) {
  const $ = <T extends Element>(sel: string) => intro.querySelector<T>(sel)!;
  const $$ = <T extends Element>(sel: string) => [...intro.querySelectorAll<T>(sel)];

  const capaVideo = $<HTMLElement>('[data-capa-video]');
  const lienzo = $<HTMLCanvasElement>('[data-lienzo]');
  const desliza = $<HTMLElement>('[data-desliza]');
  const tecleado = $<HTMLElement>('[data-tecleado]');
  const cursor = $<HTMLElement>('[data-cursor]');
  const nombre = $<HTMLElement>('[data-nombre]');
  const columnas = $$<HTMLElement>('.rejilla-col');
  const rejilla = $<HTMLElement>('[data-rejilla]');
  const cajas = $$<HTMLElement>('[data-caja]');
  const foto = $<HTMLElement>('[data-foto]');
  const pieFoto = $<HTMLElement>('.foto figcaption');
  const luz = $<HTMLElement>('[data-luz]');
  const obra = $<HTMLElement>('[data-obra]');
  const obraFase = $<HTMLElement>('[data-obra-fase]');
  const fases: string[] = JSON.parse(obraFase.dataset.fases ?? '[]');
  const letras = Number(getComputedStyle(tecleado).getPropertyValue('--n')) || 1;

  // ---- Secuencia de fotogramas (acto 1) ----
  const movil = window.matchMedia(lienzo.dataset.mediaMovil ?? '(max-width: 800px)').matches;
  const fondo = getComputedStyle(document.documentElement).getPropertyValue('--pantalla').trim() || '#03080b';
  const secuencia: Secuencia = crearSecuencia({
    canvas: lienzo,
    carpeta: (movil ? lienzo.dataset.movil : lienzo.dataset.escritorio) ?? '',
    total: Number(movil ? lienzo.dataset.movilTotal : lienzo.dataset.escritorioTotal),
    foco: Number(getComputedStyle(intro).getPropertyValue('--foco')) || 0.5,
    fondo,
  });
  const video = { progreso: 0, zoom: 0 };
  const pintarVideo = () => secuencia.ir(video.progreso, video.zoom);

  // Los fotogramas se piden cuando el navegador está libre (no compiten con el LCP)
  const cuandoLibre = window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 200));
  cuandoLibre(() => void secuencia.precargar());

  const alRedimensionar = () => secuencia.medir();
  window.addEventListener('resize', alRedimensionar);

  // ---- Línea de tiempo ----
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: intro,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.6,
      invalidateOnRefresh: true,
    },
  });

  // Acto 1: fotogramas 1–90 (cámara acercándose) y 90–120 (la pantalla ya llena el encuadre)
  tl.to(video, { progreso: 0.75, duration: 2.6, onUpdate: pintarVideo }, 0)
    .to(video, { progreso: 1, duration: T.videoFin - 2.6, onUpdate: pintarVideo }, 2.6)
    .to(video, { zoom: 1, duration: 2.6, ease: 'power1.inOut', onUpdate: pintarVideo }, 0)
    .to(desliza, { autoAlpha: 0, duration: 0.3 }, 0.05);

  // Transición: el cursor aparece sobre la pantalla del portátil y el vídeo se funde
  tl.fromTo(tecleado, { opacity: 0 }, { opacity: 1, duration: 0.25 }, T.cursor)
    .fromTo(obra, { opacity: 0 }, { opacity: 1, duration: 0.3 }, T.fundido)
    .to(capaVideo, { autoAlpha: 0, duration: 0.4 }, T.fundido);

  // Acto 2.1: se teclea el nombre
  tl.fromTo(
    tecleado,
    { '--typed': 0 },
    { '--typed': letras, duration: 1.2, ease: `steps(${letras})` },
    T.teclear,
  );

  // 2.2: rejilla
  tl.fromTo(
    columnas,
    { scaleY: 0 },
    { scaleY: 1, duration: 0.5, stagger: 0.04, ease: 'power2.out' },
    T.rejilla,
  );

  // 2.3: cajas del boceto
  tl.fromTo(cajas, { '--wf': 0 }, { '--wf': 1, duration: 0.35, stagger: 0.12 }, T.cajas);

  // 2.4: tipografía real
  tl.to(cajas, { '--wf': 0, duration: 0.5, stagger: 0.08 }, T.tipografia)
    .fromTo(cajas, { '--txt': 0 }, { '--txt': 1, duration: 0.5, stagger: 0.08 }, T.tipografia + 0.1)
    .to(tecleado, { opacity: 0, filter: 'blur(10px)', duration: 0.6 }, T.tipografia)
    .fromTo(
      nombre,
      { opacity: 0, filter: 'blur(12px)', letterSpacing: '0.04em' },
      { opacity: 1, filter: 'blur(0px)', letterSpacing: '-0.025em', duration: 0.8, ease: 'power2.out' },
      T.tipografia + 0.1,
    );

  // 2.5: color
  tl.fromTo(intro, { '--c': 0 }, { '--c': 1, duration: 1.2, ease: 'power1.inOut' }, T.color).fromTo(
    luz,
    { opacity: 0 },
    { opacity: 1, duration: 1.2 },
    T.color,
  );

  // 2.6: fotos
  tl.fromTo(
    foto,
    { clipPath: 'inset(100% 0% 0% 0%)', filter: 'grayscale(1) brightness(0.6)' },
    { clipPath: 'inset(0% 0% 0% 0%)', filter: 'grayscale(0) brightness(1)', duration: 0.9, ease: 'power2.inOut' },
    T.fotos,
  ).fromTo(pieFoto, { opacity: 0 }, { opacity: 1, duration: 0.3 }, T.fotos + 0.7);

  // 2.7: se recoge la rejilla y se quita la barra de "build"
  tl.to(rejilla, { opacity: 0, duration: 0.6 }, T.final)
    .to(obra, { opacity: 0, duration: 0.4 }, T.final + 0.6)
    .fromTo(obra, { '--obra': 0 }, { '--obra': 1, duration: T.final - T.fundido }, T.fundido)
    // Tramo final sin cambios, para ver la portada terminada antes de que se suelte
    .set({}, {}, T.total);

  // ---- Rótulo de fase y parpadeo del cursor ----
  let faseActual = -1;
  let parpadeando = false;
  const actualizarFase = () => {
    const t = tl.time();
    let fase = 0;
    for (let i = 0; i < INICIO_FASES.length; i++) if (t >= INICIO_FASES[i]) fase = i;
    if (fase !== faseActual) {
      faseActual = fase;
      obraFase.textContent = fases[fase] ?? '';
    }
    // El cursor parpadea mientras espera, pero no mientras teclea
    const tecleando = t >= T.teclear && t < T.teclear + 1.2;
    const visible = t >= T.cursor && t < T.tipografia;
    const debe = visible && !tecleando;
    if (debe !== parpadeando) {
      parpadeando = debe;
      cursor.classList.remove('parpadea');
      if (debe) {
        void cursor.offsetWidth; // reinicia la animación (parpadeo finito: 4 veces)
        cursor.classList.add('parpadea');
      }
    }
  };
  tl.eventCallback('onUpdate', actualizarFase);
  actualizarFase();

  return () => {
    window.removeEventListener('resize', alRedimensionar);
    secuencia.destruir();
    cursor.classList.remove('parpadea');
  };
}
