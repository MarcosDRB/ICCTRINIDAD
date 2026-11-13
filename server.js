const express = require('express');
const path = require('path');
const crypto = require('crypto');
const database = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.AGENDA_ADMIN_PASSWORD || '';
const SESSION_COOKIE = 'icc_admin_session';
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_DATA_URL_PATTERN = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/;
const IMAGE_PATH_PATTERN = /^(?:media\/(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9_./% -]+|\/api\/images\/[0-9a-f-]{36})$/i;

app.use(express.json({ limit: '7mb' }));
app.use(express.static(__dirname));
app.locals.database = database;

function secureEqual(left, right) {
    const leftBuffer = Buffer.from(String(left));
    const rightBuffer = Buffer.from(String(right));
    return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function isAuthorized(password) {
    return Boolean(ADMIN_PASSWORD) && typeof password === 'string' &&
        secureEqual(password.trim(), ADMIN_PASSWORD.trim());
}

function sessionSecret() {
    return process.env.ADMIN_SESSION_SECRET || ADMIN_PASSWORD;
}

function createSessionToken(expiration) {
    const signature = crypto.createHmac('sha256', sessionSecret()).update(String(expiration)).digest('hex');
    return `${expiration}.${signature}`;
}

function getCookie(req, name) {
    const cookies = String(req.headers.cookie || '').split(';');
    const cookie = cookies.map(item => item.trim()).find(item => item.startsWith(`${name}=`));
    return cookie ? cookie.slice(name.length + 1) : '';
}

function isValidAdminSession(req) {
    if (!sessionSecret()) return false;
    const [expirationText, signature] = getCookie(req, SESSION_COOKIE).split('.');
    const expiration = Number(expirationText);
    if (!Number.isSafeInteger(expiration) || expiration <= Date.now() || !signature) return false;
    const expected = createSessionToken(expiration).split('.')[1];
    return secureEqual(signature, expected);
}

function requireAdmin(req, res, next) {
    if (!isValidAdminSession(req)) return res.status(401).json({ error: 'Sesión de administración no válida.' });
    return next();
}

function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validImagePath(value) {
    return typeof value === 'string' &&
        (value === '' || (value.length <= 2048 && IMAGE_PATH_PATTERN.test(value)));
}

function validImageDataUrl(value) {
    if (typeof value !== 'string') return null;
    const match = IMAGE_DATA_URL_PATTERN.exec(value);
    if (!match) return null;
    const imageData = Buffer.from(match[2], 'base64');
    if (!imageData.length || imageData.length > MAX_IMAGE_BYTES) return null;
    return { mimeType: `image/${match[1]}`, imageData };
}

function asyncRoute(handler) {
    return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

app.post('/api/admin/login', (req, res) => {
    if (!ADMIN_PASSWORD) {
        return res.status(503).json({ error: 'Configura AGENDA_ADMIN_PASSWORD en el servidor.' });
    }
    const { password } = req.body || {};
    if (!isAuthorized(password)) return res.status(401).json({ error: 'La clave no es correcta.' });

    const expiration = Date.now() + SESSION_DURATION_MS;
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.setHeader(
        'Set-Cookie',
        `${SESSION_COOKIE}=${createSessionToken(expiration)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_DURATION_MS / 1000}${secure}`
    );
    return res.json({ ok: true });
});

app.post('/api/admin/logout', (req, res) => {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`);
    return res.json({ ok: true });
});

app.get('/api/agenda/events', asyncRoute(async (req, res) => {
    const events = await req.app.locals.database.getEvents();
    return res.json({ events });
}));

app.put('/api/agenda/events/:id', requireAdmin, asyncRoute(async (req, res) => {
    const { title, date, time, description, image } = req.body || {};
    if (
        typeof title !== 'string' || !title.trim() || title.trim().length > 160 ||
        !validDate(date) ||
        typeof time !== 'string' || time.length > 80 ||
        typeof description !== 'string' || description.length > 2000 ||
        (image !== undefined && !validImagePath(image))
    ) {
        return res.status(400).json({ error: 'Revisa el nombre, la fecha, la hora, la descripción y la imagen.' });
    }

    const event = await req.app.locals.database.updateEvent(req.params.id, {
        title: title.trim(),
        date,
        time,
        description: description.trim(),
        image: image === undefined ? undefined : image
    });
    if (!event) return res.status(404).json({ error: 'Evento no encontrado.' });
    return res.json({ ok: true, event });
}));

app.get('/api/pages/:pageKey', asyncRoute(async (req, res) => {
    if (!database.editablePages.includes(req.params.pageKey)) {
        return res.status(404).json({ error: 'Página no encontrada.' });
    }
    const contentHtml = await req.app.locals.database.getPage(req.params.pageKey);
    if (contentHtml === null) return res.status(404).json({ error: 'Contenido de página no encontrado.' });
    return res.json(contentHtml);
}));

app.put('/api/pages/:pageKey', requireAdmin, asyncRoute(async (req, res) => {
    if (!database.editablePages.includes(req.params.pageKey)) {
        return res.status(404).json({ error: 'Página no encontrada.' });
    }
    const { contentHtml, expectedRevision } = req.body || {};
    if (
        typeof contentHtml !== 'string' || !contentHtml.trim() || contentHtml.length > 2 * 1024 * 1024 ||
        !Number.isSafeInteger(expectedRevision) || expectedRevision < 1
    ) {
        return res.status(400).json({ error: 'Revisa el contenido y la versión de la página antes de guardar.' });
    }
    const saved = await req.app.locals.database.savePage(req.params.pageKey, contentHtml, expectedRevision);
    if (!saved) return res.status(409).json({ error: 'Esta página cambió desde que la abriste. Recárgala antes de guardar.' });
    return res.json({ ok: true, revision: expectedRevision + 1 });
}));

app.post('/api/admin/images', requireAdmin, asyncRoute(async (req, res) => {
    const image = validImageDataUrl(req.body && req.body.dataUrl);
    if (!image) return res.status(400).json({ error: 'Selecciona una imagen JPG, PNG o WebP de máximo 5 MB.' });
    const id = await req.app.locals.database.saveImage(image.mimeType, image.imageData);
    return res.status(201).json({ path: `/api/images/${id}` });
}));

app.get('/api/images/:id', asyncRoute(async (req, res) => {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return res.sendStatus(404);
    const image = await req.app.locals.database.getImage(req.params.id);
    if (!image) return res.sendStatus(404);
    res.type(image.mime_type);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.send(image.image_data);
}));

app.use((error, req, res, next) => {
    console.error('Error en la solicitud:', error);
    if (res.headersSent) return next(error);
    return res.status(500).json({ error: 'Ocurrió un error al procesar la solicitud.' });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

async function startServer() {
    await database.initializeDatabase();
    app.listen(PORT, () => {
        console.log(`ICC site running at http://localhost:${PORT}`);
    });
}

if (require.main === module) {
    startServer().catch(async error => {
        console.error('No se pudo iniciar el sitio con MySQL:', error);
        await database.closeDatabase();
        process.exitCode = 1;
    });
}

module.exports = {
    app,
    isAuthorized,
    validDate,
    validImagePath,
    validImageDataUrl,
    isValidAdminSession,
    startServer
};
