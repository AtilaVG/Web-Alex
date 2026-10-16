# Web personal de Alex — «La web que se construye sola»

Prototipo de los **actos 1 y 2** de la web personal. Sitio estático con [Astro](https://astro.build) y [GSAP](https://gsap.com) + ScrollTrigger, preparado para GitHub Pages.

1. **Acto 1 · Entrada:** un vídeo generado con IA (escritorio de noche → la cámara se acerca → la pantalla del portátil llena el encuadre) convertido en fotogramas y pintado en un `<canvas>` según el scroll.
2. **Acto 2 · La web se construye sola:** en la pantalla aparece un cursor, se teclea el nombre y la portada se monta delante: rejilla de 12 columnas → cajas grises del boceto → tipografía → color → fotos. Todo es HTML y CSS real; el contenido está en el HTML desde el principio y la animación solo lo revela.

Los actos 3 (proyectos y rama de git) y 4 (salida del portátil y contacto) están **pendientes de visto bueno**; de momento hay dos secciones de relleno para que funcionen los enlaces de la navegación.

## Verlo en local

Hace falta Node 22.12 o superior.

```bash
npm ci
npm run dev        # http://localhost:4321 (con recarga al guardar)
```

Para ver exactamente lo que se publica (es lo que se ha medido con Lighthouse):

```bash
npm run build
npm run preview    # http://localhost:4321
```

Para probar la versión sin animaciones, activa «reducir movimiento» en el sistema, o en Chrome: DevTools → ⋮ → More tools → Rendering → *Emulate CSS media feature prefers-reduced-motion: reduce*.

## Lighthouse (móvil)

Medido el 16/10/2026 con Lighthouse 13.5.0, configuración móvil por defecto (Moto G Power emulado, 4G lenta y CPU 4× simuladas), contra `npm run build && npm run preview`. Tres pasadas:

| Pasada | Rendimiento | Accesibilidad | Buenas prácticas | SEO | FCP | LCP | TBT | CLS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | **100** | **100** | **100** | 66 | 1,4 s | 1,4 s | 40 ms | 0,004 |
| 2 | **100** | **100** | **100** | 66 | 1,4 s | 1,5 s | 0 ms | 0,004 |
| 3 | **100** | **100** | **100** | 66 | 1,4 s | 1,5 s | 10 ms | 0,004 |

- **SEO 66** es solo por el `noindex` del prototipo (la única auditoría que falla es «la página no se puede indexar»). Con `INDEXAR=true` da **100**.
- El LCP es el fotograma 1 (`seq/mobile/f_001.webp`, 11 KB). La página entera pesa 541 KB, casi todo fotogramas que se descargan después de la carga.
- El CLS de 0,004 es la fila de «Qué hago» al cambiar a las fuentes web (aún invisible en ese momento).
- Fluidez del acto 1 con la CPU 4× más lenta y pantalla de densidad 2: 60 fps de mediana y ningún fotograma de más de 50 ms.

Para repetir la medición: `npm run build && npm run preview` y, en otra terminal, `scripts/lighthouse.sh`.

## Cómo está hecho

```
src/config/perfil.ts     textos de la portada (PROVISIONALES): nombre, frase, servicios, correo
src/config/intro.ts      secuencias de fotogramas (carpetas, número, tamaño) y encuadre en vertical
src/components/Intro.astro   actos 1 y 2: una sección fija con la capa de vídeo y la capa de portada
src/scripts/intro.ts     script de entrada (sin GSAP): «Saltar intro», navegación y carga diferida
src/scripts/escenas.ts   la línea de tiempo de GSAP ligada al scroll (los tramos están comentados arriba)
src/scripts/comun.ts     tramos de la línea de tiempo y cuándo hay escena animada
src/scripts/secuencia.ts descarga, decodificación y pintado de los fotogramas en el canvas
src/scripts/posicion.ts  recupera la posición de lectura al girar el móvil
src/styles/global.css    sistema de diseño y estados de cada fase
public/seq/desktop/      120 fotogramas WebP 1280×720 (escritorio)
public/seq/mobile/       60 fotogramas WebP 960×540 (móvil)
public/keyframe-a.jpg    fotograma A (póster, imagen fija con movimiento reducido, imagen para redes)
public/keyframe-b.jpg    fotograma B (referencia del final del acto 1)
fuentes/intro.mp4        vídeo original de Veo, para regenerar los fotogramas
scripts/fotogramas.sh    vídeo → fotogramas WebP (escritorio y móvil)
scripts/lighthouse.sh    mide Lighthouse en móvil contra el build
```

### Decisiones

- **Una sola sección fija para los dos actos.** El vídeo termina en el negro de la pantalla (`#03080b`, medido en el último fotograma) y el cursor aparece encima de esa pantalla antes de que el vídeo se funda. Así no hay un tramo de scroll en negro entre los dos actos y el corte no se nota. La sección mide 520vh; cada fase tiene su tramo (comentados en `escenas.ts`).
- **`position: sticky` en lugar del `pin` de GSAP.** La escena se queda fija con CSS y ScrollTrigger solo calcula el progreso (`scrub`). Es más ligero, no mete envoltorios en el DOM y la página tiene su altura real antes de que cargue GSAP.
- **GSAP diferido.** El script de entrada pesa ~2 KB; GSAP, ScrollTrigger y los fotogramas se cargan cuando la página ha terminado de cargar y el navegador está libre, o antes si se empieza a hacer scroll.
- **LCP = fotograma 1**, como `<img>` normal (un canvas no cuenta como LCP) con `<link rel="preload">` y `fetchpriority="high"`. El canvas pinta encima el mismo fotograma con el mismo encuadre, así que el cambio no se ve.
- **Precarga de fotogramas** con prioridad baja, 6 a la vez, primero repartidos por todo el vídeo (1, 120, 33, 65…) y luego rellenando huecos; si alguien salta a una zona que aún no ha llegado, esa zona pasa delante. Si un fotograma no ha llegado, se pinta el más cercano.
- **Sin tirones al hacer scroll:** los fotogramas se guardan comprimidos y solo se decodifican los cercanos al actual, con `createImageBitmap` (fuera del hilo principal). El canvas no tiene más resolución que la del vídeo (en una pantalla de densidad 2 no pinta 4 veces más píxeles para nada).
- **Móvil:** 60 fotogramas de 960 px (el brief decía ~800 px: con el vídeo horizontal recortado en vertical, 800 px se veía blando; son 70 KB más). En vertical el encuadre empieza reducido para que se vea el portátil entero, fundido arriba y abajo con el fondo, y se va acercando hasta llenar la pantalla. Cuando exista `intro-vertical.mp4`, basta con `scripts/fotogramas.sh fuentes/intro.mp4 fuentes/intro-vertical.mp4`.
- **Sin Lenis.** El scroll nativo con `scrub: 0.6` ya va suave, y así no hay riesgo para INP ni para la accesibilidad.
- **CSS dentro del HTML** (`inlineStylesheets: 'always'`): es una sola página con ~12 KB de CSS y así no bloquea el primer pintado.
- **Fuentes:** Geist (texto), Geist Mono (cursor, código, boceto) e Instrument Serif (nombre y titulares), de Google Fonts pero autoalojadas desde los paquetes de Fontsource con la API de fuentes de Astro: `font-display: swap` y un fallback ajustado a las métricas de cada fuente, sin peticiones a Google.
- **Etiquetas de IA:** «Vídeo generado con IA» en la esquina del acto 1 e «Imagen generada con IA» en la foto de la portada y en la imagen fija.

### Accesibilidad

- **Movimiento reducido** (o sin JS, o pantallas de menos de 560 px de alto): no hay sección fija ni scrub. Se ve el fotograma A como imagen fija, fundida con la portada ya montada que va debajo.
- **Si la portada no cabe** en la pantalla fija (texto ampliado, espaciado de texto personalizado, pantallas muy justas), se renuncia a la escena y se usa la versión fija: nunca queda texto cortado. En pantallas justas la foto de la portada se encoge o se quita antes que el texto.
- **«Saltar intro»** en la navegación lleva directamente a la portada terminada y pone el foco en el nombre; funciona también antes de que cargue GSAP y en la versión fija. Desaparece cuando se llega a la portada.
- Si alguien llega con el teclado a un enlace de la portada antes de que esté montada, la página salta al final de la intro para que lo enfocado se vea. Con ratón o dedo, en cambio, los enlaces aún invisibles no se pueden pulsar.
- **Girar el móvil** (que cambia entre escena y versión fija) mantiene la parte de la página que se estaba leyendo.
- Un velo oscuro arriba del vídeo mantiene legible la navegación cuando la lámpara pasa por detrás (contraste ≥ 7:1).
- El canvas, el nombre tecleado, la rejilla y la barra de «build» llevan `aria-hidden`; el póster tiene `alt`. El cursor parpadea solo 4 veces seguidas y la línea de «Desliza para entrar» se mueve menos de 5 s.

## Publicar en GitHub Pages

1. *Settings → Pages → Source*: **GitHub Actions**.
2. Cada push compila la web (y pasa `astro check`); solo la rama principal se publica. La URL y la ruta base (`/web-alex/`, es decir, https://atilavg.github.io/web-alex/) las pone el workflow solas; con dominio propio la base pasa a ser `/`.
3. Mientras sea prototipo lleva `noindex`. Para la versión definitiva, añadir `INDEXAR=true` al paso «Compilar» del workflow.

## Pendiente

- **De Alex:** nombre o marca y dominio; frase y servicios definitivos (`src/config/perfil.ts`); correo de contacto; hitos con fecha; proyectos de clientes, solo con su permiso; idioma (¿solo español?).
- **Assets:** `intro-vertical.mp4` (9:16) para móvil y los vídeos de scroll de cada proyecto (acto 3).
- **Actos 3 y 4**, cuando des el visto bueno a este prototipo.
