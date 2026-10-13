# ICC La Trinidad

Sitio estático publicado con GitHub Pages. Eventos, Prédicas, Liderazgo, Grupos y Testimonios permiten editar su contenido desde la misma página y guardar cambios como commits en GitHub.

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

## Editar desde GitHub Pages

En Eventos, Prédicas, Liderazgo, Grupos y Testimonios, el acceso de administración está abajo a la izquierda del footer. Para conectarse, se requiere:

1. La clave de administración: `TRINIDAD2026`.
2. Crea un token fine-grained desde [GitHub Settings](https://github.com/settings/personal-access-tokens/new), selecciona solo `ICCTRINIDAD` y concede `Contents: Read and write` en Repository permissions.
3. La cuenta debe tener permiso de escritura en el repositorio.

El token se ingresa en el navegador y se conserva solo en memoria mientras la página está abierta; no se guarda en el repositorio ni en el almacenamiento del navegador. No lo compartas por chat ni lo agregues al código.

Al editar una página, los cambios se guardan directamente como un commit en `main`. Eventos actualiza `agenda.json`; las otras páginas guardan su archivo HTML. GitHub Pages puede tardar unos minutos en publicar cada commit.

La clave de administración es solo una barrera visual del panel estático. La autorización efectiva para escribir la controla el token de GitHub y los permisos de la cuenta.

## Publicación

GitHub Pages se sirve desde la rama `main` y la raíz del repositorio. Los cambios guardados desde los editores se publican automáticamente; también se puede actualizar el sitio con un `git push`.
