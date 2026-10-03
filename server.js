const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.AGENDA_ADMIN_PASSWORD || 'TRINIDAD2026';
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'agenda.json');
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_DATA_URL_PATTERN = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

const defaultEvents = [
    { id: crypto.randomUUID(), title: 'Servicio Dominical', date: '2026-07-26T10:00:00', place: 'Sede Principal' },
    { id: crypto.randomUUID(), title: 'Reunión de Oración', date: '2026-07-29T19:00:00', place: 'Capilla' },
    { id: crypto.randomUUID(), title: 'Encuentro Jóvenes', date: '2026-08-01T18:30:00', place: 'Salón principal' },
    { id: crypto.randomUUID(), title: 'Taller de Discipulado', date: '2026-08-05T17:00:00', place: 'Salón 2' }
];

app.use(express.json({ limit: '7mb' }));
app.use(express.static(__dirname));

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
    return events.filter(e => e && e.title && e.date).map(e => ({
        id: e.id || crypto.randomUUID(),
        title: String(e.title),
        date: String(e.date),
        place: String(e.place || ''),
        time: String(e.time || ''),
        description: String(e.description || ''),
        image: String(e.image || ''),
        theme: String(e.theme || ''),
        posterLabel: String(e.posterLabel || '')
    }));
}

function writeEvents(events) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ events }, null, 2), 'utf8');
}

function sortEvents(events) {
    return [...events].sort((a, b) => new Date(a.date) - new Date(b.date));
}

function isAuthorized(password) {
    return typeof password === 'string' && password.trim() === String(ADMIN_PASSWORD).trim();
}

function isValidDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isValidImage(value) {
    if (typeof value !== 'string' || !IMAGE_DATA_URL_PATTERN.test(value)) return false;
    const encodedImage = value.slice(value.indexOf(',') + 1);
    return Buffer.from(encodedImage, 'base64').length <= MAX_IMAGE_BYTES;
}

app.get('/api/agenda/events', (req, res) => {
    const events = sortEvents(readEvents());
    res.json({ events });
});

app.post('/api/agenda/verify', (req, res) => {
    const { password } = req.body || {};
    if (!isAuthorized(password)) {
        return res.status(401).json({ ok: false });
    }
    return res.json({ ok: true });
});

app.post('/api/agenda/update-dates', (req, res) => {
    const { password, dates } = req.body || {};
    if (!isAuthorized(password)) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    if (!Array.isArray(dates) || !dates.length) {
        return res.status(400).json({ error: 'Datos incompletos' });
    }

    const events = readEvents();
    const dateMap = new Map(dates.map(d => [String(d.id), String(d.date)]));

    const updated = events.map(ev => {
        const nextDate = dateMap.get(String(ev.id));
        if (!nextDate) return ev;
        return { ...ev, date: nextDate };
    });

    writeEvents(sortEvents(updated));
    return res.json({ ok: true, events: sortEvents(readEvents()) });
});

app.put('/api/agenda/events/:id', (req, res) => {
    const { password, title, date, time, description, image } = req.body || {};
    if (!isAuthorized(password)) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    if (
        typeof title !== 'string' || !title.trim() || title.trim().length > 160 ||
        !isValidDate(date) ||
        typeof time !== 'string' || time.length > 80 ||
        typeof description !== 'string' || description.length > 2000 ||
        (image !== undefined && image !== '' && !isValidImage(image))
    ) {
        return res.status(400).json({ error: 'Revisa el nombre, la fecha, la hora, la descripción y la imagen.' });
    }

    const events = readEvents();
    const eventIndex = events.findIndex(event => event.id === req.params.id);
    if (eventIndex === -1) {
        return res.status(404).json({ error: 'Evento no encontrado.' });
    }

    events[eventIndex] = {
        ...events[eventIndex],
        title: title.trim(),
        date,
        time,
        description: description.trim(),
        ...(image !== undefined ? { image } : {})
    };

    writeEvents(sortEvents(events));
    return res.json({ ok: true, event: readEvents().find(event => event.id === req.params.id) });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

if (require.main === module) {
    ensureDataFile();
    app.listen(PORT, () => {
        console.log(`ICC site running at http://localhost:${PORT}`);
    });
}

module.exports = {
    app,
    ensureDataFile,
    readEvents,
    writeEvents,
    sortEvents,
    isAuthorized,
    isValidDate,
    isValidImage,
    defaultEvents,
    DATA_FILE
};
