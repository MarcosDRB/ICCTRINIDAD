# ICC La Trinidad - Agenda Compartida

Este sitio ahora incluye una agenda compartida para que los cambios del pastor se vean por todos los visitantes.

## Requisitos

- Node.js 18+

## Instalación

```bash
npm.cmd install
```

## Ejecutar

```bash
npm.cmd start
```

Abre en navegador:

- http://localhost:3000/conocenos.html

## Edición local

Al ejecutar el servidor Node local, la clave predeterminada para el editor es:

- `TRINIDAD2026`

Para cambiarla localmente:

```bash
set AGENDA_ADMIN_PASSWORD=TU_CLAVE_SEGURA
npm.cmd start
```

## Cómo funciona la agenda

- GitHub Pages carga los eventos directamente desde `agenda.json`.
- El formulario de administración funciona solo con el servidor Node local.
- Para publicar cambios en GitHub Pages, edita `agenda.json` y sube el cambio a la rama `main`.

## Archivo de datos

La agenda se guarda en:

- `agenda.json`

Haz backup de ese archivo si quieres conservar histórico.

## Publicar con GitHub Pages

El sitio se sirve desde la rama `main` y la carpeta raiz del repositorio. Cada `push` actualiza las paginas y los archivos de `media/`.

GitHub Pages es estático: la agenda pública se lee de `agenda.json` y el panel de edición no se ofrece en esa publicación. Para cambiar los eventos publicados, actualiza `agenda.json` y sube el cambio a GitHub.
