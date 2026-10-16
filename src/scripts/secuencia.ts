/**
 * Secuencia de fotogramas pintada en un <canvas> (vídeo controlado por el scroll).
 *
 * - El fotograma 1 ya está en la caché: es el póster (precargado en el <head>).
 * - El resto se pide en segundo plano, con prioridad baja, primero a saltos
 *   (1, 33, 65…, luego 17, 49…) para tener pronto fotogramas repartidos por
 *   todo el vídeo, y después rellenando huecos.
 * - Si el fotograma pedido aún no ha llegado, se pinta el más cercano cargado.
 * - Encuadre: a pantalla completa (cover); en pantallas verticales se reduce
 *   lo justo para que se vea el portátil (foco) y se funde arriba y abajo con
 *   el fondo, igual que el póster en CSS. `zoom` lleva de ese encuadre al cover.
 */

interface Opciones {
  canvas: HTMLCanvasElement;
  carpeta: string;
  total: number;
  foco: number;
  fondo: string;
}

const PETICIONES_A_LA_VEZ = 6;
const BANDA = 0.18;

export function crearSecuencia({ canvas, carpeta, total, foco, fondo }: Opciones) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const imagenes: HTMLImageElement[] = [];
  const listos = new Uint8Array(total);
  const fondoTransparente = transparente(fondo);

  let objetivo = 0;
  let zoom = 0;
  let pintado = -1;
  let zoomPintado = -1;
  let ancho = 0;
  let alto = 0;
  let pedido = 0;
  let parado = false;

  const ruta = (i: number) => `${carpeta}/f_${String(i + 1).padStart(3, '0')}.webp`;

  function cargar(i: number) {
    return new Promise<void>((resolver) => {
      const img = new Image();
      img.decoding = 'async';
      img.fetchPriority = i === 0 ? 'high' : 'low';
      img.src = ruta(i);
      imagenes[i] = img;
      const listo = () => {
        if (parado) return resolver();
        listos[i] = 1;
        // Solo hace falta repintar si este fotograma está más cerca del pedido que el pintado
        if (pintado < 0 || Math.abs(i - objetivo) < Math.abs(pintado - objetivo)) pedirPintado();
        resolver();
      };
      img.decode().then(listo, () => (img.complete && img.naturalWidth ? listo() : resolver()));
    });
  }

  /** Orden de carga: primero y último, luego a saltos cada vez más finos. */
  function orden() {
    const visto = new Uint8Array(total);
    const lista: number[] = [];
    const añadir = (i: number) => {
      if (i < total && !visto[i]) {
        visto[i] = 1;
        lista.push(i);
      }
    };
    añadir(0);
    añadir(total - 1);
    for (let paso = 32; paso >= 1; paso /= 2) {
      for (let i = 0; i < total; i += paso) añadir(i);
    }
    return lista;
  }

  async function precargar() {
    const cola = orden();
    // El primero va solo: es el póster y ya está en caché, así el canvas lo tapa cuanto antes
    await cargar(cola.shift()!);
    const trabajador = async () => {
      while (cola.length && !parado) await cargar(cola.shift()!);
    };
    await Promise.all(Array.from({ length: PETICIONES_A_LA_VEZ }, trabajador));
  }

  function cercano(i: number) {
    if (listos[i]) return i;
    for (let d = 1; d < total; d++) {
      if (i - d >= 0 && listos[i - d]) return i - d;
      if (i + d < total && listos[i + d]) return i + d;
    }
    return -1;
  }

  function medir() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    ancho = Math.max(1, Math.round(canvas.clientWidth * ratio));
    alto = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width !== ancho) canvas.width = ancho;
    if (canvas.height !== alto) canvas.height = alto;
    pintado = -1;
    pedirPintado();
  }

  function pedirPintado() {
    if (!pedido && !parado) pedido = requestAnimationFrame(pintar);
  }

  function pintar() {
    pedido = 0;
    const n = cercano(objetivo);
    if (n < 0 || !ctx) return;
    if (n === pintado && zoom === zoomPintado) return;

    const img = imagenes[n];
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const cubrir = Math.max(ancho / iw, alto / ih);
    const encajar = Math.min(cubrir, ancho / (iw * foco));
    const escala = encajar + (cubrir - encajar) * zoom;
    const w = iw * escala;
    const h = ih * escala;
    const x = (ancho - w) / 2;
    const y = (alto - h) / 2;

    ctx.fillStyle = fondo;
    ctx.fillRect(0, 0, ancho, alto);
    ctx.drawImage(img, x, y, w, h);

    // Si el fotograma no llena el alto (pantalla vertical), se funde con el fondo
    if (h < alto - 1) {
      const banda = h * BANDA;
      const arriba = ctx.createLinearGradient(0, y, 0, y + banda);
      arriba.addColorStop(0, fondo);
      arriba.addColorStop(1, fondoTransparente);
      ctx.fillStyle = arriba;
      ctx.fillRect(0, y - 1, ancho, banda + 1);
      const abajo = ctx.createLinearGradient(0, y + h - banda, 0, y + h);
      abajo.addColorStop(0, fondoTransparente);
      abajo.addColorStop(1, fondo);
      ctx.fillStyle = abajo;
      ctx.fillRect(0, y + h - banda, ancho, banda + 1);
    }

    pintado = n;
    zoomPintado = zoom;
    canvas.classList.add('is-listo');
  }

  medir();

  return {
    precargar,
    medir,
    /** progreso 0–1 del vídeo; zoom 0–1 del encuadre vertical al de pantalla completa */
    ir(progreso: number, nuevoZoom: number) {
      const i = Math.round(Math.min(1, Math.max(0, progreso)) * (total - 1));
      const z = Math.round(Math.min(1, Math.max(0, nuevoZoom)) * 1000) / 1000;
      if (i === objetivo && z === zoom) return;
      objetivo = i;
      zoom = z;
      pedirPintado();
    },
    destruir() {
      parado = true;
      if (pedido) cancelAnimationFrame(pedido);
      canvas.classList.remove('is-listo');
    },
  };
}

export type Secuencia = ReturnType<typeof crearSecuencia>;

/** #rrggbb → rgba(r, g, b, 0) */
function transparente(color: string) {
  const hex = color.trim().replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(hex)) return 'rgba(0, 0, 0, 0)';
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, 0)`;
}
