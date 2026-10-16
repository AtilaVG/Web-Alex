/**
 * Escenas de la intro con GSAP + ScrollTrigger (se carga diferido desde intro.ts).
 *
 * Una sola línea de tiempo ligada al scroll de la sección .intro (scrub).
 * Las duraciones son "tramos" de scroll (constantes T en comun.ts):
 *
 *   0    – 3.6   Acto 1: el vídeo avanza hasta que la pantalla llena el encuadre
 *   3.2  – 4.0   se va la etiqueta de IA, aparece el cursor sobre la pantalla
 *                y el vídeo se funde al negro
 *   4.3  – 5.5   se teclea el nombre
 *   5.6  – 6.5   rejilla de 12 columnas
 *   6.6  – 7.7   cajas grises del boceto
 *   7.8  – 9.0   tipografía real (la mono da paso a la serif)
 *   9.2  – 10.4  color: el fondo se calienta y entra el ámbar
 *   10.4 – 11.3  fotos (la caja gris de la foto se llena)
 *   11.4 – 12.4  se recoge la rejilla; portada terminada
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { crearSecuencia } from './secuencia';
import { MEDIA_ESCENA, T } from './comun';
import { cambioDeModo, trasRefresco } from './posicion';

gsap.registerPlugin(ScrollTrigger);
// En móvil, que aparezca o se esconda la barra del navegador no recalcula nada
ScrollTrigger.config({ ignoreMobileResize: true });

/** Momento en que empieza cada fase del rótulo "build" (mismo orden que en Intro.astro). */
const INICIO_FASES = [T.cursor, T.teclear, T.rejilla, T.cajas, T.tipografia, T.color, T.fotos, T.final];
/** A partir de aquí la portada ya se lee y sus enlaces se pueden pulsar. */
const PORTADA_ACTIVA = T.tipografia + 0.6;

export function iniciar(intro: HTMLElement) {
  const raiz = document.documentElement;
  const mm = gsap.matchMedia();

  mm.add(MEDIA_ESCENA, () => montar(intro, () => desactivar()));

  // Tras un cambio de modo (girar el móvil…), ScrollTrigger deja el scroll
  // arriba: se vuelve a donde se estaba leyendo.
  ScrollTrigger.addEventListener('refresh', trasRefresco);

  // Si la portada no cabe en la pantalla (texto ampliado, espaciado de texto
  // del usuario, pantallas muy justas), se renuncia a la escena: se ve la
  // portada fija, completa y legible.
  function desactivar() {
    cambioDeModo();
    raiz.classList.remove('anima', 'saltada');
    mm.revert();
    ScrollTrigger.refresh();
  }

  // La escena ya manda: fuera el estado provisional de «Saltar intro»
  requestAnimationFrame(() => raiz.classList.remove('saltada'));
}

function montar(intro: HTMLElement, noCabe: () => void) {
  const $ = <E extends Element>(sel: string) => intro.querySelector<E>(sel)!;
  const $$ = <E extends Element>(sel: string) => [...intro.querySelectorAll<E>(sel)];

  const capaVideo = $<HTMLElement>('[data-capa-video]');
  const lienzo = $<HTMLCanvasElement>('[data-lienzo]');
  const aviso = $<HTMLElement>('[data-aviso-ia]');
  const desliza = $<HTMLElement>('[data-desliza]');
  const portada = $<HTMLElement>('[data-portada]');
  const portadaDentro = $<HTMLElement>('.portada');
  const tecleado = $<HTMLElement>('[data-tecleado]');
  const cursor = $<HTMLElement>('[data-cursor]');
  const nombre = $<HTMLElement>('[data-nombre]');
  const columnas = $$<HTMLElement>('.rejilla-col');
  const rejilla = $<HTMLElement>('[data-rejilla]');
  const cajas = $$<HTMLElement>('[data-caja]');
  const cajasTexto = cajas.filter((c) => !c.matches('.wf-imagen'));
  const cajaFoto = $<HTMLElement>('.wf-imagen');
  const foto = $<HTMLElement>('[data-foto]');
  const pieFoto = $<HTMLElement>('.foto figcaption');
  const luz = $<HTMLElement>('[data-luz]');
  const obra = $<HTMLElement>('[data-obra]');
  const obraFase = $<HTMLElement>('[data-obra-fase]');
  const fases: string[] = JSON.parse(obraFase.dataset.fases ?? '[]');
  const letras = Number(getComputedStyle(tecleado).getPropertyValue('--n')) || 1;

  // ---- Secuencia de fotogramas (acto 1) ----
  const mediaMovil = window.matchMedia(lienzo.dataset.mediaMovil ?? '(max-width: 800px)');
  const fondo = getComputedStyle(document.documentElement).getPropertyValue('--pantalla').trim() || '#03080b';
  const foco = Number(getComputedStyle(intro).getPropertyValue('--foco')) || 0.5;
  const video = { progreso: 0, zoom: 0 };

  const nuevaSecuencia = (movil: boolean) => {
    const d = lienzo.dataset;
    const s = crearSecuencia({
      canvas: lienzo,
      carpeta: (movil ? d.movil : d.escritorio) ?? '',
      total: Number(movil ? d.movilTotal : d.escritorioTotal),
      ancho: Number(movil ? d.movilAncho : d.escritorioAncho),
      alto: Number(movil ? d.movilAlto : d.escritorioAlto),
      foco,
      fondo,
    });
    s.ir(video.progreso, video.zoom);
    return s;
  };
  let movil = mediaMovil.matches;
  let secuencia = nuevaSecuencia(movil);
  const pintarVideo = () => secuencia.ir(video.progreso, video.zoom);

  // Los fotogramas se piden cuando el navegador está libre (no compiten con el LCP)
  const cuandoLibre = window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 200));
  cuandoLibre(() => void secuencia.precargar());

  // Al cruzar el corte de móvil (girar una tableta, maximizar la ventana) se
  // cambia de juego de fotogramas sin rehacer la escena.
  const alCambiarMovil = () => {
    if (mediaMovil.matches === movil) return;
    movil = mediaMovil.matches;
    secuencia.destruir();
    secuencia = nuevaSecuencia(movil);
    void secuencia.precargar();
  };
  const alRedimensionar = () => secuencia.medir();
  mediaMovil.addEventListener('change', alCambiarMovil);
  window.addEventListener('resize', alRedimensionar);

  // ---- ¿Cabe la portada? ----
  // Se comprueba cuando cambia el tamaño de cualquier bloque de texto (carga de
  // fuentes, giro, zoom de texto, espaciado de texto del usuario…).
  let comprobando = 0;
  const comprobar = () => {
    comprobando = 0;
    if (portadaDentro.scrollHeight > portadaDentro.clientHeight + 2) noCabe();
  };
  const vigia = new ResizeObserver(() => {
    if (!comprobando) comprobando = requestAnimationFrame(comprobar);
  });
  for (const el of portadaDentro.children) vigia.observe(el);
  vigia.observe(portadaDentro);

  // ---- Línea de tiempo ----
  let actualizarFase = () => {};
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: intro,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.6,
      // Un refresco (cambio de tamaño) mueve la línea de tiempo sin lanzar sus
      // eventos: se vuelve a pintar el fotograma y el rótulo que tocan.
      onRefresh: () => {
        pintarVideo();
        actualizarFase();
      },
    },
  });

  // Acto 1: fotogramas 1–90 (cámara acercándose) y 90–120 (la pantalla ya llena el encuadre)
  tl.to(video, { progreso: 0.75, duration: 2.6, onUpdate: pintarVideo }, 0)
    .to(video, { progreso: 1, duration: T.videoFin - 2.6, onUpdate: pintarVideo }, 2.6)
    .to(video, { zoom: 1, duration: 2.6, ease: 'power1.inOut', onUpdate: pintarVideo }, 0)
    .to(desliza, { autoAlpha: 0, duration: 0.3 }, 0.05);

  // Transición: se va la etiqueta, el cursor aparece sobre la pantalla del portátil y el vídeo se funde
  tl.to(aviso, { autoAlpha: 0, duration: 0.2 }, T.aviso)
    .fromTo(tecleado, { opacity: 0 }, { opacity: 1, duration: 0.25 }, T.cursor)
    .to(capaVideo, { autoAlpha: 0, duration: 0.4 }, T.fundido)
    .fromTo(obra, { opacity: 0 }, { opacity: 1, duration: 0.3 }, T.fundido + 0.2);

  // Acto 2.1: se teclea el nombre
  tl.fromTo(
    tecleado,
    { '--typed': 0 },
    { '--typed': letras, duration: 1.2, ease: `steps(${letras})` },
    T.teclear,
  );

  // 2.2: rejilla
  tl.fromTo(columnas, { scaleY: 0 }, { scaleY: 1, duration: 0.5, stagger: 0.04, ease: 'power2.out' }, T.rejilla);

  // 2.3: cajas del boceto
  tl.fromTo(cajas, { '--wf': 0 }, { '--wf': 1, duration: 0.35, stagger: 0.12 }, T.cajas);

  // 2.4: tipografía real (la caja de la foto sigue gris hasta la fase de fotos)
  tl.to(cajasTexto, { '--wf': 0, duration: 0.5, stagger: 0.08 }, T.tipografia)
    .fromTo(cajasTexto, { '--txt': 0 }, { '--txt': 1, duration: 0.5, stagger: 0.08 }, T.tipografia + 0.1)
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

  // 2.6: fotos: la foto sube dentro de su caja y la caja gris se desvanece
  tl.fromTo(
    foto,
    { clipPath: 'inset(100% 0% 0% 0%)', filter: 'grayscale(1) brightness(0.6)' },
    { clipPath: 'inset(0% 0% 0% 0%)', filter: 'grayscale(0) brightness(1)', duration: 0.9, ease: 'power2.inOut' },
    T.fotos,
  )
    .to(cajaFoto, { '--wf': 0, duration: 0.9, ease: 'power2.inOut' }, T.fotos)
    .fromTo(pieFoto, { opacity: 0 }, { opacity: 1, duration: 0.3 }, T.fotos + 0.7);

  // 2.7: se recoge la rejilla y se quita la barra de "build"
  tl.to(rejilla, { opacity: 0, duration: 0.6 }, T.final)
    .to(obra, { opacity: 0, duration: 0.4 }, T.final + 0.6)
    .fromTo(obra, { '--obra': 0 }, { '--obra': 1, duration: T.final - T.fundido }, T.fundido)
    // Tramo final sin cambios, para ver la portada terminada antes de que se suelte
    .set({}, {}, T.total);

  // ---- Rótulo de fase, parpadeo del cursor y portada pulsable ----
  let faseActual = -1;
  let parpadeando = false;
  actualizarFase = () => {
    const t = tl.time();
    let fase = 0;
    for (let i = 0; i < INICIO_FASES.length; i++) if (t >= INICIO_FASES[i]) fase = i;
    if (fase !== faseActual) {
      faseActual = fase;
      obraFase.textContent = fases[fase] ?? '';
    }
    // Mientras la portada no se lee, sus enlaces invisibles no se pueden pulsar
    portada.classList.toggle('is-activa', t >= PORTADA_ACTIVA);
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
    vigia.disconnect();
    if (comprobando) cancelAnimationFrame(comprobando);
    mediaMovil.removeEventListener('change', alCambiarMovil);
    window.removeEventListener('resize', alRedimensionar);
    secuencia.destruir();
    cursor.classList.remove('parpadea');
    portada.classList.remove('is-activa');
  };
}
