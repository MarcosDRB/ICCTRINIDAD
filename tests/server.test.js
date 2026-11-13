const request = require('supertest');

const PASSWORD = 'CLAVE_TEST_SEGURA';
let server;
let events;
let pages;
let images;
let database;

function loadServer() {
    jest.resetModules();
    process.env.AGENDA_ADMIN_PASSWORD = PASSWORD;
    process.env.ADMIN_SESSION_SECRET = 'secreto-de-prueba-largo';
    server = require('../server');
    server.app.locals.database = database;
}

function createDatabase() {
    events = [{
        id: 'event-1',
        title: 'Culto',
        date: '2026-01-01',
        place: 'Sede',
        time: '',
        description: '',
        image: '',
        theme: '',
        posterLabel: ''
    }];
    pages = new Map([['predicas', { contentHtml: '<section>Contenido</section>', revision: 1 }]]);
    images = new Map();
    database = {
        getEvents: jest.fn(async () => events),
        updateEvent: jest.fn(async (id, changes) => {
            const index = events.findIndex(event => event.id === id);
            if (index < 0) return null;
            events[index] = { ...events[index], ...changes };
            return events[index];
        }),
        getPage: jest.fn(async key => pages.get(key) || null),
        savePage: jest.fn(async (key, contentHtml, expectedRevision) => {
            const current = pages.get(key);
            if (!current || current.revision !== expectedRevision) return false;
            pages.set(key, { contentHtml, revision: current.revision + 1 });
            return true;
        }),
        saveImage: jest.fn(async (mimeType, imageData) => {
            const id = '123e4567-e89b-12d3-a456-426614174000';
            images.set(id, { mime_type: mimeType, image_data: imageData });
            return id;
        }),
        getImage: jest.fn(async id => images.get(id) || null)
    };
}

async function login() {
    return request(server.app).post('/api/admin/login').send({ password: PASSWORD });
}

beforeEach(() => {
    createDatabase();
    loadServer();
});

afterEach(() => {
    delete process.env.AGENDA_ADMIN_PASSWORD;
    delete process.env.ADMIN_SESSION_SECRET;
    jest.resetModules();
});

describe('GET /api/agenda/events', () => {
    test('returns events from the database', async () => {
        const response = await request(server.app).get('/api/agenda/events');

        expect(response.status).toBe(200);
        expect(response.body.events).toEqual(events);
        expect(database.getEvents).toHaveBeenCalledTimes(1);
    });
});

describe('administrative session', () => {
    test('starts a signed HttpOnly session with the configured password', async () => {
        const response = await login();

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ ok: true });
        expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
        expect(response.headers['set-cookie'][0]).toContain('SameSite=Strict');
    });

    test('rejects an incorrect password', async () => {
        const response = await request(server.app)
            .post('/api/admin/login')
            .send({ password: 'incorrecta' });

        expect(response.status).toBe(401);
    });

    test('rejects an unauthenticated write', async () => {
        const response = await request(server.app)
            .put('/api/agenda/events/event-1')
            .send({ title: 'Nuevo', date: '2026-01-02', time: '', description: '' });

        expect(response.status).toBe(401);
        expect(database.updateEvent).not.toHaveBeenCalled();
    });
});

describe('PUT /api/agenda/events/:id', () => {
    test('persists valid event edits after logging in', async () => {
        const agent = request.agent(server.app);
        const loginResponse = await agent.post('/api/admin/login').send({ password: PASSWORD });
        expect(loginResponse.status).toBe(200);

        const response = await agent.put('/api/agenda/events/event-1').send({
            title: 'Culto actualizado',
            date: '2026-02-02',
            time: '10:00 a. m.',
            description: 'Nueva información'
        });

        expect(response.status).toBe(200);
        expect(response.body.event.title).toBe('Culto actualizado');
        expect(database.updateEvent).toHaveBeenCalledWith('event-1', expect.objectContaining({
            title: 'Culto actualizado',
            date: '2026-02-02',
            image: undefined
        }));
    });

    test('rejects invalid date values', async () => {
        const agent = request.agent(server.app);
        await agent.post('/api/admin/login').send({ password: PASSWORD });

        const response = await agent.put('/api/agenda/events/event-1').send({
            title: 'Culto',
            date: '2026-02-30',
            time: '',
            description: ''
        });

        expect(response.status).toBe(400);
        expect(database.updateEvent).not.toHaveBeenCalled();
    });
});

describe('page content API', () => {
    test('returns saved content and its revision for an editable page', async () => {
        const response = await request(server.app).get('/api/pages/predicas');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ contentHtml: '<section>Contenido</section>', revision: 1 });
    });

    test('does not expose pages outside the editable allowlist', async () => {
        const response = await request(server.app).get('/api/pages/index');

        expect(response.status).toBe(404);
        expect(database.getPage).not.toHaveBeenCalled();
    });

    test('saves page changes only when the revision still matches', async () => {
        const agent = request.agent(server.app);
        await agent.post('/api/admin/login').send({ password: PASSWORD });

        const response = await agent.put('/api/pages/predicas').send({
            contentHtml: '<section>Actualizado</section>',
            expectedRevision: 1
        });
        const conflict = await agent.put('/api/pages/predicas').send({
            contentHtml: '<section>Antiguo</section>',
            expectedRevision: 1
        });

        expect(response.status).toBe(200);
        expect(response.body.revision).toBe(2);
        expect(conflict.status).toBe(409);
        expect(pages.get('predicas').contentHtml).toBe('<section>Actualizado</section>');
    });
});

describe('database image API', () => {
    test('stores uploaded image bytes and serves them by id', async () => {
        const agent = request.agent(server.app);
        await agent.post('/api/admin/login').send({ password: PASSWORD });

        const upload = await agent.post('/api/admin/images')
            .send({ dataUrl: 'data:image/png;base64,aGVsbG8=' });
        const image = await request(server.app).get(upload.body.path);

        expect(upload.status).toBe(201);
        expect(upload.body.path).toBe('/api/images/123e4567-e89b-12d3-a456-426614174000');
        expect(image.status).toBe(200);
        expect(image.headers['content-type']).toContain('image/png');
        expect(image.body).toEqual(Buffer.from('hello'));
    });

    test('rejects unsupported image data', async () => {
        const agent = request.agent(server.app);
        await agent.post('/api/admin/login').send({ password: PASSWORD });

        const response = await agent.post('/api/admin/images')
            .send({ dataUrl: 'data:image/svg+xml;base64,PHN2Zz4=' });

        expect(response.status).toBe(400);
        expect(database.saveImage).not.toHaveBeenCalled();
    });
});

describe('validation helpers', () => {
    test.each([
        ['2026-01-01', true],
        ['2026-02-30', false],
        ['01-01-2026', false]
    ])('validDate(%s) is %s', (date, expected) => {
        expect(server.validDate(date)).toBe(expected);
    });

    test.each([
        ['media/evento.png', true],
        ['/api/images/123e4567-e89b-12d3-a456-426614174000', true],
        ['../secreto', false],
        ['javascript:alert(1)', false]
    ])('validImagePath(%s) is %s', (image, expected) => {
        expect(server.validImagePath(image)).toBe(expected);
    });
});
