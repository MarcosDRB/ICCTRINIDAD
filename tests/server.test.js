const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const PASSWORD = 'CLAVE_TEST';

let tmpDir;
let dataFile;
let server;

function loadServer() {
    jest.resetModules();
    process.env.DATA_FILE = dataFile;
    process.env.AGENDA_ADMIN_PASSWORD = PASSWORD;
    return require('../server');
}

function writeDataFile(content) {
    fs.writeFileSync(dataFile, typeof content === 'string' ? content : JSON.stringify(content), 'utf8');
}

function readDataFile() {
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'icc-agenda-'));
    dataFile = path.join(tmpDir, 'nested', 'agenda.json');
    server = loadServer();
});

afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    delete process.env.DATA_FILE;
    delete process.env.AGENDA_ADMIN_PASSWORD;
});

describe('ensureDataFile', () => {
    test('creates the data file with default events when missing', () => {
        expect(fs.existsSync(dataFile)).toBe(false);

        server.ensureDataFile();

        expect(fs.existsSync(dataFile)).toBe(true);
        expect(readDataFile().events).toHaveLength(server.defaultEvents.length);
    });

    test('keeps an existing valid data file untouched', () => {
        fs.mkdirSync(path.dirname(dataFile), { recursive: true });
        writeDataFile({ events: [{ id: 'a', title: 'Culto', date: '2026-01-01T10:00:00', place: 'Sede' }] });

        server.ensureDataFile();

        expect(readDataFile().events).toEqual([
            { id: 'a', title: 'Culto', date: '2026-01-01T10:00:00', place: 'Sede' }
        ]);
    });

    test('restores defaults when the file has no events array', () => {
        fs.mkdirSync(path.dirname(dataFile), { recursive: true });
        writeDataFile({ events: 'nope' });

        server.ensureDataFile();

        expect(readDataFile().events).toHaveLength(server.defaultEvents.length);
    });

    test('restores defaults when the file is not valid JSON', () => {
        fs.mkdirSync(path.dirname(dataFile), { recursive: true });
        writeDataFile('{ not json');

        server.ensureDataFile();

        expect(readDataFile().events).toHaveLength(server.defaultEvents.length);
    });
});

describe('readEvents', () => {
    test('drops incomplete events and stringifies the remaining fields', () => {
        fs.mkdirSync(path.dirname(dataFile), { recursive: true });
        writeDataFile({
            events: [
                { id: 'ok', title: 'Culto', date: '2026-01-01T10:00:00', place: 'Sede' },
                { title: 'Sin fecha', place: 'Sede' },
                { title: 'Sin lugar', date: '2026-01-02T10:00:00' },
                null,
                { id: 5, title: 7, date: '2026-01-03T10:00:00', place: 9 }
            ]
        });

        const events = server.readEvents();

        expect(events).toHaveLength(2);
        expect(events[0]).toEqual({ id: 'ok', title: 'Culto', date: '2026-01-01T10:00:00', place: 'Sede' });
        expect(events[1]).toEqual({ id: 5, title: '7', date: '2026-01-03T10:00:00', place: '9' });
    });

    test('generates an id for events that do not have one', () => {
        fs.mkdirSync(path.dirname(dataFile), { recursive: true });
        writeDataFile({ events: [{ title: 'Culto', date: '2026-01-01T10:00:00', place: 'Sede' }] });

        const [event] = server.readEvents();

        expect(typeof event.id).toBe('string');
        expect(event.id).not.toHaveLength(0);
    });

    test('creates the data file when it does not exist yet', () => {
        const events = server.readEvents();

        expect(fs.existsSync(dataFile)).toBe(true);
        expect(events).toHaveLength(server.defaultEvents.length);
    });
});

describe('writeEvents', () => {
    test('persists the events wrapped in an events property', () => {
        fs.mkdirSync(path.dirname(dataFile), { recursive: true });
        const events = [{ id: 'a', title: 'Culto', date: '2026-01-01T10:00:00', place: 'Sede' }];

        server.writeEvents(events);

        expect(readDataFile()).toEqual({ events });
    });
});

describe('sortEvents', () => {
    test('sorts by ascending date without mutating the input', () => {
        const events = [
            { id: 'b', date: '2026-03-01T10:00:00' },
            { id: 'a', date: '2026-01-01T10:00:00' },
            { id: 'c', date: '2026-02-01T10:00:00' }
        ];

        const sorted = server.sortEvents(events);

        expect(sorted.map(e => e.id)).toEqual(['a', 'c', 'b']);
        expect(events.map(e => e.id)).toEqual(['b', 'a', 'c']);
    });
});

describe('isAuthorized', () => {
    test.each([
        [PASSWORD, true],
        [`  ${PASSWORD}  `, true],
        ['otra', false],
        ['', false],
        [undefined, false],
        [null, false],
        [123, false]
    ])('isAuthorized(%p) === %p', (password, expected) => {
        expect(server.isAuthorized(password)).toBe(expected);
    });
});

describe('GET /api/agenda/events', () => {
    test('returns the stored events sorted by date', async () => {
        fs.mkdirSync(path.dirname(dataFile), { recursive: true });
        writeDataFile({
            events: [
                { id: 'b', title: 'Segundo', date: '2026-03-01T10:00:00', place: 'Sede' },
                { id: 'a', title: 'Primero', date: '2026-01-01T10:00:00', place: 'Sede' }
            ]
        });

        const res = await request(server.app).get('/api/agenda/events');

        expect(res.status).toBe(200);
        expect(res.body.events.map(e => e.id)).toEqual(['a', 'b']);
    });
});

describe('POST /api/agenda/verify', () => {
    test('accepts the configured password', async () => {
        const res = await request(server.app).post('/api/agenda/verify').send({ password: PASSWORD });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ ok: true });
    });

    test('rejects a wrong password', async () => {
        const res = await request(server.app).post('/api/agenda/verify').send({ password: 'mala' });

        expect(res.status).toBe(401);
        expect(res.body).toEqual({ ok: false });
    });

    test('rejects a request without a body', async () => {
        const res = await request(server.app).post('/api/agenda/verify');

        expect(res.status).toBe(401);
    });
});

describe('POST /api/agenda/update-dates', () => {
    beforeEach(() => {
        fs.mkdirSync(path.dirname(dataFile), { recursive: true });
        writeDataFile({
            events: [
                { id: 'a', title: 'Primero', date: '2026-01-01T10:00:00', place: 'Sede' },
                { id: 'b', title: 'Segundo', date: '2026-03-01T10:00:00', place: 'Capilla' }
            ]
        });
    });

    test('updates only the dates of the given events and keeps them sorted', async () => {
        const res = await request(server.app)
            .post('/api/agenda/update-dates')
            .send({ password: PASSWORD, dates: [{ id: 'a', date: '2026-04-01T10:00:00' }] });

        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
        expect(res.body.events).toEqual([
            { id: 'b', title: 'Segundo', date: '2026-03-01T10:00:00', place: 'Capilla' },
            { id: 'a', title: 'Primero', date: '2026-04-01T10:00:00', place: 'Sede' }
        ]);
        expect(readDataFile().events.find(e => e.id === 'a').date).toBe('2026-04-01T10:00:00');
    });

    test('ignores ids that do not exist', async () => {
        const res = await request(server.app)
            .post('/api/agenda/update-dates')
            .send({ password: PASSWORD, dates: [{ id: 'zzz', date: '2026-04-01T10:00:00' }] });

        expect(res.status).toBe(200);
        expect(res.body.events.map(e => e.date)).toEqual(['2026-01-01T10:00:00', '2026-03-01T10:00:00']);
    });

    test('rejects an unauthorized request without touching the data file', async () => {
        const res = await request(server.app)
            .post('/api/agenda/update-dates')
            .send({ password: 'mala', dates: [{ id: 'a', date: '2026-04-01T10:00:00' }] });

        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: 'No autorizado' });
        expect(readDataFile().events.find(e => e.id === 'a').date).toBe('2026-01-01T10:00:00');
    });

    test.each([
        ['missing dates', { password: PASSWORD }],
        ['empty dates', { password: PASSWORD, dates: [] }],
        ['dates not an array', { password: PASSWORD, dates: { id: 'a' } }]
    ])('returns 400 when %s', async (_label, body) => {
        const res = await request(server.app).post('/api/agenda/update-dates').send(body);

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: 'Datos incompletos' });
    });
});

describe('static and fallback routes', () => {
    test('serves index.html for unknown routes', async () => {
        const res = await request(server.app).get('/ruta/inexistente');

        expect(res.status).toBe(200);
        expect(res.text).toContain('<html');
    });
});
