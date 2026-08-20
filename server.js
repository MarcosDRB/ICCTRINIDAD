const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.AGENDA_ADMIN_PASSWORD || 'TRINIDAD2026';
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'agenda.json');

const defaultEvents = [
    { id: crypto.randomUUID(), title: 'Servicio Dominical', date: '2026-07-26T10:00:00', place: 'Sede Principal' },
    { id: crypto.randomUUID(), title: 'Reunión de Oración', date: '2026-07-29T19:00:00', place: 'Capilla' },
    { id: crypto.randomUUID(), title: 'Encuentro Jóvenes', date: '2026-08-01T18:30:00', place: 'Salón principal' },
    { id: crypto.randomUUID(), title: 'Taller de Discipulado', date: '2026-08-05T17:00:00', place: 'Salón 2' }
];

app.use(express.json());
app.use(express.static(__dirname));

function backupCorruptDataFile(reason) {
    const backupFile = `${DATA_FILE}.corrupt-${Date.now()}`;
    try {
        fs.copyFileSync(DATA_FILE, backupFile);
        console.error(`Agenda data file is unusable (${reason}). Copia de respaldo en ${backupFile}; se restauran los eventos por defecto.`);
    } catch (err) {
        console.error(`Agenda data file is unusable (${reason}) y no se pudo respaldar en ${backupFile}: ${err.message}. Se restauran los eventos por defecto.`);
    }
}

function writeDefaultEvents() {
    writeEvents(defaultEvents);
}

function ensureDataFile() {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });

    if (!fs.existsSync(DATA_FILE)) {
        writeDefaultEvents();
        return;
    }

    let current;
    try {
        current = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (err) {
        backupCorruptDataFile(err.message);
        writeDefaultEvents();
        return;
    }

    if (!current || !Array.isArray(current.events)) {
        backupCorruptDataFile('falta la lista de eventos');
        writeDefaultEvents();
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
    return typeof password === 'string' && password.trim() === String(ADMIN_PASSWORD).trim();
}

function isValidDate(value) {
    return typeof value === 'string' && value.trim() !== '' && !Number.isNaN(new Date(value).getTime());
}

app.get('/api/agenda/events', (req, res, next) => {
    let events;
    try {
        events = sortEvents(readEvents());
    } catch (err) {
        return next(err);
    }
    res.json({ events });
});

app.post('/api/agenda/verify', (req, res) => {
    const { password } = req.body || {};
    if (!isAuthorized(password)) {
        return res.status(401).json({ ok: false });
    }
    return res.json({ ok: true });
});

app.post('/api/agenda/update-dates', (req, res, next) => {
    const { password, dates } = req.body || {};
    if (!isAuthorized(password)) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    if (!Array.isArray(dates) || !dates.length) {
        return res.status(400).json({ error: 'Datos incompletos' });
    }

    const invalid = dates.filter(d => !d || !d.id || !isValidDate(d.date));
    if (invalid.length) {
        return res.status(400).json({ error: 'Fechas inválidas', ids: invalid.map(d => (d && d.id) || null) });
    }

    try {
        const events = readEvents();
        const dateMap = new Map(dates.map(d => [String(d.id), String(d.date)]));
        const knownIds = new Set(events.map(ev => String(ev.id)));
        const unknownIds = [...dateMap.keys()].filter(id => !knownIds.has(id));
        if (unknownIds.length) {
            return res.status(404).json({ error: 'Eventos no encontrados', ids: unknownIds });
        }

        const updated = sortEvents(events.map(ev => {
            const nextDate = dateMap.get(String(ev.id));
            if (!nextDate) return ev;
            return { ...ev, date: nextDate };
        }));

        writeEvents(updated);
        return res.json({ ok: true, events: updated });
    } catch (err) {
        return next(err);
    }
});

app.get('*', (req, res, next) => {
    res.sendFile(path.join(__dirname, 'index.html'), err => {
        if (err && err.code !== 'ECONNABORTED') next(err);
    });
});

app.use((err, req, res, next) => {
    console.error(`Error handling ${req.method} ${req.originalUrl}:`, err);
    if (res.headersSent) {
        return next(err);
    }
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ error: status === 500 ? 'Error interno del servidor' : err.message });
});

process.on('unhandledRejection', reason => {
    console.error('Unhandled promise rejection:', reason);
});

try {
    ensureDataFile();
} catch (err) {
    console.error(`No se pudo preparar el archivo de agenda en ${DATA_FILE}:`, err);
    process.exit(1);
}

app.listen(PORT, () => {
    console.log(`ICC site running at http://localhost:${PORT}`);
}).on('error', err => {
    console.error(`No se pudo iniciar el servidor en el puerto ${PORT}:`, err);
    process.exit(1);
});
