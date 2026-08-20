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

## Clave pastoral

No hay clave por defecto. La edición de la agenda solo funciona si defines
`AGENDA_ADMIN_PASSWORD`; si no está definida, los endpoints de edición
responden `401` y el servidor lo advierte al arrancar.

```bash
set AGENDA_ADMIN_PASSWORD=TU_CLAVE_SEGURA
npm.cmd start
```

Nunca guardes la clave en el repositorio ni la compartas por chat.

## Cómo funciona la agenda

- Público: consume `GET /api/agenda/events`.
- Pastor: usa `Editar agenda` y solo actualiza fechas/horas (no cambia títulos ni lugares).
- Todos los visitantes ven los cambios al recargar la página.

## Archivo de datos

La agenda se guarda en:

- `agenda.json`

Haz backup de ese archivo si quieres conservar histórico.

## Publicar para que todos lo vean (Render)

1. En Render crea un `Web Service` conectando este repo de GitHub.
2. Render detectara `render.yaml` automaticamente.
3. En `Environment` define una clave segura en:
	- `AGENDA_ADMIN_PASSWORD`
4. Despliega y abre la URL publica que te entrega Render.

Configuracion incluida para produccion:

- Start command: `npm start`

Nota sobre Render Free:

- El plan free no permite disco persistente.
- La agenda se guarda en almacenamiento temporal del servicio.
- Si el servicio se reinicia/redeploya, los cambios pueden reiniciarse.
- Para persistencia real, usa un plan con disco o conecta una base de datos.
