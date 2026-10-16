#!/usr/bin/env bash
# Convierte el vídeo de la intro en las dos secuencias de fotogramas WebP.
#
#   scripts/fotogramas.sh [vídeo-horizontal] [vídeo-vertical]
#
# Por defecto usa fuentes/intro.mp4 para las dos. Cuando exista el vídeo
# vertical (9:16) para móvil, pásalo como segundo argumento.
# Si cambia el número de fotogramas, actualiza src/config/intro.ts.
set -euo pipefail

horizontal="${1:-fuentes/intro.mp4}"
vertical="${2:-$horizontal}"
destino="public/seq"

# Escritorio: 10 s a 12 fps = 120 fotogramas. El vídeo de Veo es de 1280×720:
# no se amplía (por encima del tamaño original solo crecería el peso).
rm -rf "$destino/desktop" && mkdir -p "$destino/desktop"
ffmpeg -v error -i "$horizontal" -vf "fps=12,scale='min(1600,iw)':-2" -frames:v 120 \
  -c:v libwebp -quality 75 "$destino/desktop/f_%03d.webp"

# Móvil: la mitad de fotogramas (6 fps = 60) y 960 px de ancho. Con el vídeo
# horizontal, en vertical se ve recortado al centro y hace falta algo más de
# 800 px para que el portátil no se vea blando.
rm -rf "$destino/mobile" && mkdir -p "$destino/mobile"
ffmpeg -v error -i "$vertical" -vf "fps=6,scale=960:-2" -frames:v 60 \
  -c:v libwebp -quality 70 "$destino/mobile/f_%03d.webp"

echo "Escritorio: $(ls "$destino/desktop" | wc -l) fotogramas, $(du -sh "$destino/desktop" | cut -f1)"
echo "Móvil:      $(ls "$destino/mobile" | wc -l) fotogramas, $(du -sh "$destino/mobile" | cut -f1)"
