# Comuna Manantial

Este proyecto es una plataforma web pensada para mejorar la comunicación entre vecinos y la administración local.  
Permite registrar reclamos, darles seguimiento en tiempo real y visualizar su estado en un mapa interactivo.  
La idea es ofrecer una herramienta simple, transparente y accesible para la gestión comunitaria.

## Características
- Registro de reclamos con base de datos en tiempo real (Firestore).
- Autenticación de usuarios y sistema de roles.
- Mapa interactivo con geolocalización de incidencias.
- Carga de imágenes optimizada en Firebase Storage.
- CMS headless con Sanity.io para gestión de contenido.
- Interfaz responsive con modo oscuro.

## Tecnologías utilizadas
- React 18  
- Firebase (Auth, Firestore, Storage)  
- Sanity CMS  
- Mantine UI  
- Leaflet Maps  
- Vercel (despliegue serverless)

## Instalación
1. Clonar el repositorio:
   ```bash
   git clone https://github.com/lucas24aguirre-lang/comuna-manantial.git
   cd comuna-manantial
2. Instalar dependencias:
   ```bash
   npm install
3. Configurar las variables de entorno necesarias (Firebase y Sanity).
    ```bash
   VITE_FIREBASE_API_KEY=
   VITE_FIREBASE_AUTH_DOMAIN=
   VITE_FIREBASE_PROJECT_ID=
   VITE_FIREBASE_STORAGE_BUCKET=
   VITE_FIREBASE_MESSAGING_SENDER_ID=
   VITE_FIREBASE_APP_ID=
   SANITY_PROJECT_ID=
   SANITY_DATASET=

5. Ejecutar en modo desarrollo:
   ```bash
   npm run dev
6. Abrir en el navegador.
   
## Despliegue
Versión en producción:
https://comuna-manantial.vercel.app/

## Estado del proyecto
En desarrollo. Próximas mejoras:

- Mejoras en la interfaz de usuario (UI).
- Panel administrativo con métricas.
- Optimización de la experiencia de usuario.

## Contribuciones
Sugerencias y mejoras son bienvenidas. Pull requests abiertos son revisados. 

## Autor
**Lucas Emanuel Aguirre**  
- LinkedIn: [linkedin.com/in/lucas-emanuel-aguirre-69617532a](https://www.linkedin.com/in/lucas-emanuel-aguirre-69617532a/)  
- GitHub: [github.com/lucas24aguirre-lang](https://github.com/lucas24aguirre-lang)





