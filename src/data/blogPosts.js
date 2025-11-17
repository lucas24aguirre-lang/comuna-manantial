// src/data/blogPosts.js

// Esta es tu "base de datos" de noticias.
// Cuando tengas tus imágenes, reemplaza las URLs de placeholder.co

export const blogPosts = [
  {
    id: "1",
    title: "Jornada de Limpieza en la Plaza Principal",
    summary: "Este sábado nos reuniremos para embellecer nuestro espacio común. ¡Esperamos la colaboración de todos los vecinos!",
    // Usamos 'lorem ipsum' para el contenido largo
    content: `
Este sábado 23 de Noviembre, a partir de las 9:00 AM, se llevará a cabo una jornada de limpieza y embellecimiento de la Plaza Principal.
Invitamos a todos los vecinos a participar trayendo sus propias herramientas si es posible (guantes, bolsas, rastrillos).

Las tareas incluirán:
- Recolección de residuos.
- Pintura de bancos y juegos.
- Plantación de nuevas flores de estación.

¡Contamos con tu ayuda para hacer de El Manantial un lugar más lindo!
`,
    imageUrl: "https://placeholder.co/600x400/845ef7/white?text=Plaza+Principal",
    author: "Admin Comunal",
    date: "5 de Noviembre, 2025"
  },
  {
    id: "2",
    title: "Nuevos Horarios de Colectivos",
    summary: "La línea 123 ha actualizado sus horarios de fin de semana. Consultá la nueva grilla para planificar tu viaje.",
    content: `
A partir del próximo lunes, la línea de colectivos 123 ajustará sus frecuencias de fin de semana (sábados y domingos) para mejorar el servicio.
Se agregarán refuerzos en horas pico de la mañana y se extenderá el último recorrido hasta las 23:30 hs.

La grilla completa estará disponible en la oficina comunal y en la parada de colectivo principal.
`,
    imageUrl: "https://placeholder.co/600x400/4c6ef5/white?text=Colectivo+123",
    author: "Admin Comunal",
    date: "3 de Noviembre, 2025"
  },
  {
    id: "3",
    title: "Campaña de Vacunación Antirrábica",
    summary: "Traé a tu mascota a la campaña gratuita de vacunación que se realizará frente al dispensario comunal.",
    content: `
Recordamos a todos los vecinos que la vacunación antirrábica es obligatoria y fundamental para la salud pública.
Estaremos vacunando perros y gatos de forma gratuita este viernes de 10:00 a 16:00 hs frente al dispensario.

Requisitos:
- Mascotas mayores de 3 meses.
- Perros con correa y bozal (si es necesario).
- Gatos en transportadora o bolso seguro.
`,
    imageUrl: "https://placeholder.co/600x400/f783ac/white?text=Mascotas",
    author: "Salud Comunal",
    date: "1 de Noviembre, 2025"
  }
];