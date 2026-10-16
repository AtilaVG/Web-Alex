/**
 * Secuencia de fotogramas pintada en un <canvas> (vídeo controlado por el scroll).
 *
 * Descarga: el fotograma 1 ya está en la caché (es el póster, precargado en
 * el <head>). El resto se pide en segundo plano con prioridad baja, 6 a la
 * vez: primero repartidos por todo el vídeo (1, 120, 33, 65…, luego 17,
 * 49…) y después rellenando huecos; si la persona salta a una zona que aún no
 * ha llegado, esa zona pasa delante.
 *
 * Decodificación: los fotogramas se guardan comprimidos (Blob, ~10 KB) y solo
 * se decodifican los cercanos al que se está viendo, con createImageBitmap
 * (fuera del hilo principal). Así pintar es solo copiar píxeles y no hay
 * tirones por decodificar WebP al hacer scroll. Si el pedido aún no está, se
 * pinta el más cercano que sí lo esté.
 *
 * Encuadre: a pantalla completa (cover); en pantallas verticales se reduce lo
 * justo para que se vea el portátil (foco) y se funde arriba y abajo con el
 * fondo, igual que el póster en CSS. `zoom` lleva de ese encuadre al cover.
 */

interface Opciones {
  canvas: HTMLCanvasElement;
  carpeta: string;
  total: number;
  /** Tamaño de los fotogramas (para no dar al canvas más resolución de la que tienen). */
  ancho: number;
  alto: number;
  foco: number;
  fondo: string;
}

const DESCARGAS_A_LA_VEZ = 6;
const DECODIFICACIONES_A_LA_VEZ = 3;
/** Fotogramas decodificados que se mantienen a cada lado del actual. */
const VENTANA = 10;
const BANDA = 0.18;

export function crearSecuencia({ canvas, carpeta, total, ancho: iw, alto: ih, foco, fondo }: Opciones) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const blobs: (Blob | undefined)[] = new Array(total);
  const pedidos = new Uint8Array(total);
  const mapas = new Map<number, ImageBitmap>();
  const decodificando = new Set<number>();
  const fondoTransparente = transparente(fondo);

  let objetivo = 0;
  let direccion = 1;
  let zoom = 0;
  let pintado = -1;
  let escalaPintada = -1;
  let anchoCanvas = 0;
  let altoCanvas = 0;
  let pedidoPintar = 0;
  let parado = false;
  let cola: number[] = [];

  const ruta = (i: number) => `${carpeta}/f_${String(i + 1).padStart(3, '0')}.webp`;
  const cerca = (i: number, margen = VENTANA) => Math.abs(i - objetivo) <= margen;

  // ---- Descarga ----

  /** Orden de descarga: primero y último, luego a saltos cada vez más finos. */
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

  /** Siguiente fotograma a pedir: lo que falte junto al actual va primero. */
  function siguiente() {
    for (let d = 0; d <= VENTANA; d++) {
      for (const i of [objetivo + d * direccion, objetivo - d * direccion]) {
        if (i >= 0 && i < total && !pedidos[i]) return i;
      }
    }
    while (cola.length) {
      const i = cola.shift()!;
      if (!pedidos[i]) return i;
    }
    return -1;
  }

  async function descargar(i: number) {
    pedidos[i] = 1;
    try {
      const respuesta = await fetch(ruta(i), { priority: i === 0 ? 'high' : 'low' } as RequestInit);
      if (!respuesta.ok) return;
      blobs[i] = await respuesta.blob();
      if (!parado && cerca(i)) decodificar();
    } catch {
      // Sin red: se queda con los que haya y se pinta el más cercano
    }
  }

  async function precargar() {
    cola = orden();
    await descargar(cola.shift()!);
    const trabajador = async () => {
      for (let i = siguiente(); i >= 0 && !parado; i = siguiente()) await descargar(i);
    };
    await Promise.all(Array.from({ length: DESCARGAS_A_LA_VEZ }, trabajador));
  }

  // ---- Decodificación (ventana alrededor del fotograma actual) ----

  function decodificar() {
    if (parado) return;
    for (const [i, mapa] of mapas) {
      if (!cerca(i, VENTANA + 2) && i !== pintado) {
        mapa.close();
        mapas.delete(i);
      }
    }
    for (let d = 0; d <= VENTANA; d++) {
      for (const i of [objetivo + d * direccion, objetivo - d * direccion]) {
        if (decodificando.size >= DECODIFICACIONES_A_LA_VEZ) return;
        if (i < 0 || i >= total || !blobs[i] || mapas.has(i) || decodificando.has(i)) continue;
        decodificando.add(i);
        createImageBitmap(blobs[i]!).then(
          (mapa) => {
            decodificando.delete(i);
            if (parado || !cerca(i, VENTANA + 2)) {
              mapa.close();
            } else {
              mapas.set(i, mapa);
              // Solo hace falta repintar si este está más cerca del pedido que el pintado
              if (pintado < 0 || Math.abs(i - objetivo) < Math.abs(pintado - objetivo)) pedirPintado();
            }
            decodificar();
          },
          () => {
            decodificando.delete(i);
            decodificar();
          },
        );
      }
    }
  }

  // ---- Pintado ----

  function cercano(i: number) {
    if (mapas.has(i)) return i;
    for (let d = 1; d < total; d++) {
      if (mapas.has(i - d)) return i - d;
      if (mapas.has(i + d)) return i + d;
    }
    return -1;
  }

  /** Escala (en px de canvas por px de fotograma) para el zoom actual. */
  function escalaPara(z: number, w: number, h: number) {
    const cubrir = Math.max(w / iw, h / ih);
    const encajar = Math.min(cubrir, w / (iw * foco));
    return encajar + (cubrir - encajar) * z;
  }

  function medir() {
    const anchoCss = Math.max(1, canvas.clientWidth);
    const altoCss = Math.max(1, canvas.clientHeight);
    // Más resolución que la del fotograma no añade detalle: solo más píxeles que mover
    const maxUtil = 1 / escalaPara(0, anchoCss, altoCss);
    const ratio = Math.min(window.devicePixelRatio || 1, 2, Math.max(1, maxUtil));
    anchoCanvas = Math.round(anchoCss * ratio);
    altoCanvas = Math.round(altoCss * ratio);
    if (canvas.width !== anchoCanvas) canvas.width = anchoCanvas;
    if (canvas.height !== altoCanvas) canvas.height = altoCanvas;
    pintado = -1;
    pedirPintado();
  }

  function pedirPintado() {
    if (!pedidoPintar && !parado) pedidoPintar = requestAnimationFrame(pintar);
  }

  function pintar() {
    pedidoPintar = 0;
    const n = cercano(objetivo);
    if (n < 0 || !ctx) return;
    const escala = escalaPara(zoom, anchoCanvas, altoCanvas);
    // En horizontal el zoom no cambia el encuadre: no hace falta repintar el mismo fotograma
    if (n === pintado && Math.abs(escala - escalaPintada) < 1e-4) return;

    const w = iw * escala;
    const h = ih * escala;
    const x = (anchoCanvas - w) / 2;
    const y = (altoCanvas - h) / 2;

    if (w < anchoCanvas || h < altoCanvas) {
      ctx.fillStyle = fondo;
      ctx.fillRect(0, 0, anchoCanvas, altoCanvas);
    }
    ctx.drawImage(mapas.get(n)!, x, y, w, h);

    // Si el fotograma no llena el alto (pantalla vertical), se funde con el fondo
    if (h < altoCanvas - 1) {
      const banda = h * BANDA;
      const arriba = ctx.createLinearGradient(0, y, 0, y + banda);
      arriba.addColorStop(0, fondo);
      arriba.addColorStop(1, fondoTransparente);
      ctx.fillStyle = arriba;
      ctx.fillRect(0, y - 1, anchoCanvas, banda + 1);
      const abajo = ctx.createLinearGradient(0, y + h - banda, 0, y + h);
      abajo.addColorStop(0, fondoTransparente);
      abajo.addColorStop(1, fondo);
      ctx.fillStyle = abajo;
      ctx.fillRect(0, y + h - banda, anchoCanvas, banda + 1);
    }

    pintado = n;
    escalaPintada = escala;
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
      if (i !== objetivo) {
        direccion = i > objetivo ? 1 : -1;
        objetivo = i;
        decodificar();
      }
      zoom = z;
      pedirPintado();
    },
    destruir() {
      parado = true;
      if (pedidoPintar) cancelAnimationFrame(pedidoPintar);
      for (const mapa of mapas.values()) mapa.close();
      mapas.clear();
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
