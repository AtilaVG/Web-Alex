/** Ruta a un archivo de public/ teniendo en cuenta la base (GitHub Pages sirve en /repo/). */
export function url(ruta: string) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/${ruta.replace(/^\//, '')}`;
}
