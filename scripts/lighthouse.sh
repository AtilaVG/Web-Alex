#!/usr/bin/env bash
# Mide Lighthouse en móvil (la configuración por defecto de Lighthouse:
# Moto G Power emulado, 4G lenta simulada) contra el build de producción.
#
#   npm run build && npm run preview     # en otra terminal
#   scripts/lighthouse.sh [url] [repeticiones]
#
# Necesita Chrome o Chromium (variable CHROME_PATH si no lo encuentra solo).
# Los informes HTML quedan en lighthouse/ (ignorada por git).
set -euo pipefail

url="${1:-http://localhost:4321/}"
veces="${2:-3}"
mkdir -p lighthouse

for i in $(seq 1 "$veces"); do
  npx -y lighthouse@13 "$url" --quiet \
    --chrome-flags="--headless=new" \
    --output=json --output=html --output-path="lighthouse/movil-$i" >/dev/null
  node -e "
    const r = require('./lighthouse/movil-$i.report.json');
    const notas = Object.values(r.categories).map((c) => c.title + ' ' + Math.round(c.score * 100)).join(' · ');
    const a = r.audits;
    console.log('Pasada $i: ' + notas);
    console.log('  FCP ' + a['first-contentful-paint'].displayValue + ' · LCP ' + a['largest-contentful-paint'].displayValue +
      ' · TBT ' + a['total-blocking-time'].displayValue + ' · CLS ' + a['cumulative-layout-shift'].displayValue);
  "
done
