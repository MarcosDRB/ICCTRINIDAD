const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.AGENDA_ADMIN_PASSWORD || '';
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'agenda.json');
const MAX_EVENT_UPDATES = 200;
const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const BLOCKED_STATIC_FILES = new Set([
    '/server.js',
    '/agenda.json',
    '/package.json',
    '/package-lock.json',
    '/render.yaml',
    '/readme.md',
    '/todo.md'
]);

if (!ADMIN_PASSWORD) {
    console.warn('AGENDA_ADMIN_PASSWORD no esta definida: la edicion de la agenda queda deshabilitada.');
}

const defaultEvents = [
    { id: crypto.randomUUID(), title: 'Servicio Dominical', date: '2026-07-26T10:00:00', place: 'Sede Principal' },
    { id: crypto.randomUUID(), title: 'Reunión de Oración', date: '2026-07-29T19:00:00', place: 'Capilla' },
    { id: crypto.randomUUID(), title: 'Encuentro Jóvenes', date: '2026-08-01T18:30:00', place: 'Salón principal' },
    { id: crypto.randomUUID(), title: 'Taller de Discipulado', date: '2026-08-05T17:00:00', place: 'Salón 2' }
];

app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

app.use((req, res, next) => {
    const requested = decodeURIComponent(req.path).toLowerCase();
    if (BLOCKED_STATIC_FILES.has(requested)) {
        return res.status(404).send('No encontrado');
    }
    next();
});

app.use(express.static(__dirname, { dotfiles: 'deny' }));

function ensureDataFile() {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });

    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify({ events: defaultEvents }, null, 2), 'utf8');
        return;
    }

    try {
        const current = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        if (!current || !Array.isArray(current.events)) {
            fs.writeFileSync(DATA_FILE, JSON.stringify({ events: defaultEvents }, null, 2), 'utf8');
        }
    } catch (err) {
        fs.writeFileSync(DATA_FILE, JSON.stringify({ events: defaultEvents }, null, 2), 'utf8');
    }
}

function readEvents() {
    ensureDataFile();
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    const events = Array.isArray(parsed.events) ? parsed.events : [];
    return events.filter(e => e && e.title && e.date && e.place).map(e => ({
        id: e.id || crypto.randomUUID(),
        title: String(e.title),
        date: String(e.date),
        place: String(e.place)
    }));
}

function writeEvents(events) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ events }, null, 2), 'utf8');
}

function sortEvents(events) {
    return [...events].sort((a, b) => new Date(a.date) - new Date(b.date));
}

function isAuthorized(password) {
    if (!ADMIN_PASSWORD || typeof password !== 'string') return false;
    const provided = Buffer.from(password.trim(), 'utf8');
    const expected = Buffer.from(ADMIN_PASSWORD.trim(), 'utf8');
    if (provided.length !== expected.length) return false;
    return crypto.timingSafeEqual(provided, expected);
}

const loginAttempts = new Map();

function tooManyAttempts(req) {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const entry = loginAttempts.get(key);
    if (!entry || now - entry.first > LOGIN_WINDOW_MS) {
        loginAttempts.set(key, { first: now, count: 1 });
        return false;
    }
    entry.count += 1;
    return entry.count > LOGIN_MAX_ATTEMPTS;
}

function clearAttempts(req) {
    loginAttempts.delete(req.ip || 'unknown');
}

function sanitizeDateUpdates(dates) {
    if (!Array.isArray(dates) || !dates.length || dates.length > MAX_EVENT_UPDATES) return null;
    const clean = [];
    for (const item of dates) {
        if (!item || typeof item !== 'object') return null;
        const id = typeof item.id === 'string' ? item.id.trim() : '';
        const date = typeof item.date === 'string' ? item.date.trim() : '';
        if (!id || id.length > 64 || !date || date.length > 40) return null;
        if (Number.isNaN(new Date(date).getTime())) return null;
        clean.push({ id, date });
    }
    return clean;
}

app.get('/api/agenda/events', (req, res) => {
    const events = sortEvents(readEvents());
    res.json({ events });
});

app.post('/api/agenda/verify', (req, res) => {
    if (tooManyAttempts(req)) {
        return res.status(429).json({ ok: false, error: 'Demasiados intentos' });
    }
    const { password } = req.body || {};
    if (!isAuthorized(password)) {
        return res.status(401).json({ ok: false });
    }
    clearAttempts(req);
    return res.json({ ok: true });
});

app.post('/api/agenda/update-dates', (req, res) => {
    if (tooManyAttempts(req)) {
        return res.status(429).json({ error: 'Demasiados intentos' });
    }
    const { password, dates } = req.body || {};
    if (!isAuthorized(password)) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    clearAttempts(req);

    const cleanDates = sanitizeDateUpdates(dates);
    if (!cleanDates) {
        return res.status(400).json({ error: 'Datos incompletos' });
    }

    const events = readEvents();
    const dateMap = new Map(cleanDates.map(d => [d.id, d.date]));

    const updated = events.map(ev => {
        const nextDate = dateMap.get(String(ev.id));
        if (!nextDate) return ev;
        return { ...ev, date: nextDate };
    });

    writeEvents(sortEvents(updated));
    return res.json({ ok: true, events: sortEvents(readEvents()) });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

ensureDataFile();
app.listen(PORT, () => {
    console.log(`ICC site running at http://localhost:${PORT}`);
});
