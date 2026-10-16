/**
 * Datos personales que salen en la web.
 *
 * PROVISIONAL: todo lo de este archivo es texto de relleno hasta que Alex pase
 * los datos reales (nombre o marca, frase, correo, redes). Está en un solo
 * sitio para cambiarlo sin tocar las escenas.
 */
export const perfil = {
  /** Nombre que se teclea en la intro y es el titular de la portada. */
  nombre: 'Alex',
  /** Línea pequeña sobre el nombre. */
  antetitulo: 'Diseño y desarrollo web',
  /** Qué hace, en una frase. */
  frase: 'Diseño y programo webs a medida: rápidas, accesibles y con animaciones que se recuerdan.',
  /** Tres cosas que hace, debajo de la portada. */
  servicios: [
    { titulo: 'Diseño', texto: 'Webs a medida, sin plantillas.' },
    { titulo: 'Desarrollo', texto: 'HTML, CSS y JavaScript cuidados.' },
    { titulo: 'Rendimiento', texto: 'Rápidas y accesibles, medidas con Lighthouse.' },
  ],
  /** Correo de contacto (pendiente: aún no hay uno público). */
  correo: '',
  /** Título de la pestaña y descripción para buscadores y redes. */
  titulo: 'Alex · Diseño y desarrollo web',
  descripcion:
    'Web personal de Alex: diseño y programo webs a medida, rápidas, accesibles y con animaciones que se recuerdan.',
};
