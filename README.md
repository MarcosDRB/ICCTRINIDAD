# ICC La Trinidad

Sitio web servido con Node.js/Express y MySQL. Los cambios administrativos de Eventos, Prédicas, Liderazgo, Grupos y Testimonios se guardan en la base de datos. Las imágenes agregadas desde los editores también se guardan en MySQL.

## Hosting recomendado

Para GoDaddy, utiliza un **VPS** con Node.js y MySQL. El sitio necesita ejecutar `server.js`; no publiques estos archivos como un sitio estático ni uses GitHub Pages como servidor de producción. Configura HTTPS antes de habilitar la administración.

## Requisitos

- Node.js 18+
- MySQL 8+ (o una versión MySQL compatible)

## Configuración

1. Crea una base de datos MySQL y un usuario con permisos sobre esa base.
2. Instala dependencias:

   ```bash
   npm install
   ```

3. Configura estas variables de entorno en el VPS:

   - `DB_HOST`: servidor MySQL.
   - `DB_PORT`: puerto MySQL (normalmente `3306`).
   - `DB_NAME`: nombre de la base de datos.
   - `DB_USER`: usuario de la base de datos.
   - `DB_PASSWORD`: contraseña de la base de datos.
   - `AGENDA_ADMIN_PASSWORD`: clave fuerte para el panel de administración.
   - `ADMIN_SESSION_SECRET`: secreto aleatorio largo para firmar las sesiones.
   - `NODE_ENV`: `production`.
   - `PORT`: puerto asignado al servidor, si GoDaddy no usa `3000`.

   No guardes estas credenciales en el repositorio ni las compartas en el navegador.

4. Inicia el sitio:

   ```bash
   npm start
   ```

En el primer inicio se crean las tablas `agenda_events`, `editable_pages` y `admin_images`. Los eventos iniciales se importan de `agenda.json`; las cuatro páginas editables se inicializan desde sus archivos HTML. Después de esa primera carga, MySQL es la fuente de verdad y las ediciones no modifican archivos ni crean commits en GitHub.

## Administración

En Eventos, Prédicas, Liderazgo, Grupos y Testimonios, abre **Administrar** en el pie de página e inicia sesión con `AGENDA_ADMIN_PASSWORD`. Las sesiones se guardan en una cookie `HttpOnly` y expiran después de ocho horas. Los cambios de eventos, contenido de páginas e imágenes se envían al servidor y se persisten en MySQL.

## Desarrollo local

Configura las variables de conexión MySQL y la clave de administración en la terminal antes de ejecutar:

```powershell
$env:DB_HOST = "127.0.0.1"
$env:DB_PORT = "3306"
$env:DB_NAME = "icc_la_trinidad"
$env:DB_USER = "icc_admin"
$env:DB_PASSWORD = "tu-clave-local"
$env:AGENDA_ADMIN_PASSWORD = "clave-local-fuerte"
$env:ADMIN_SESSION_SECRET = "secreto-local-largo-y-aleatorio"
npm.cmd start
```

La aplicación inicia con `npm start`; las pruebas se ejecutan con `npm test`.
