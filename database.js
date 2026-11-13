const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

const editablePages = ['predicas', 'liderazgo', 'grupos', 'testimonios'];
let pool;

function getPool() {
    if (!pool) {
        const missing = ['DB_HOST', 'DB_USER', 'DB_NAME'].filter(name => !process.env[name]);
        if (missing.length) {
            throw new Error(`Faltan variables de conexión a MySQL: ${missing.join(', ')}`);
        }

        pool = mysql.createPool({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT || 3306),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
    }

    return pool;
}

function eventFromRow(row) {
    return {
        id: row.id,
        title: row.title,
        date: row.event_date,
        place: row.place,
        time: row.event_time,
        description: row.description,
        image: row.image,
        theme: row.theme,
        posterLabel: row.poster_label
    };
}

function readSeedEvents() {
    const seedPath = path.join(__dirname, 'agenda.json');
    const parsed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    if (!parsed || !Array.isArray(parsed.events)) {
        throw new Error('agenda.json no contiene una lista de eventos válida para inicializar MySQL.');
    }
    return parsed.events;
}

function readSeedPage(pageKey) {
    const html = fs.readFileSync(path.join(__dirname, `${pageKey}.html`), 'utf8');
    const match = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
    if (!match) throw new Error(`No se encontró el contenido <main> de ${pageKey}.html.`);
    return match[1];
}

async function initializeDatabase() {
    const connection = await getPool().getConnection();
    try {
        await connection.query(`
            CREATE TABLE IF NOT EXISTS agenda_events (
                id VARCHAR(64) PRIMARY KEY,
                title VARCHAR(160) NOT NULL,
                event_date VARCHAR(32) NOT NULL,
                place VARCHAR(200) NOT NULL DEFAULT '',
                event_time VARCHAR(80) NOT NULL DEFAULT '',
                description TEXT NOT NULL,
                image TEXT NOT NULL,
                theme VARCHAR(40) NOT NULL DEFAULT '',
                poster_label VARCHAR(120) NOT NULL DEFAULT '',
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);
        await connection.query(`
            CREATE TABLE IF NOT EXISTS editable_pages (
                page_key VARCHAR(40) PRIMARY KEY,
                content_html MEDIUMTEXT NOT NULL,
                revision INT NOT NULL DEFAULT 1,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);
        await connection.query(`
            CREATE TABLE IF NOT EXISTS admin_images (
                id CHAR(36) PRIMARY KEY,
                mime_type VARCHAR(30) NOT NULL,
                image_data MEDIUMBLOB NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const [eventRows] = await connection.query('SELECT COUNT(*) AS count FROM agenda_events');
        if (Number(eventRows[0].count) === 0) {
            for (const event of readSeedEvents()) {
                if (!event || !event.id || !event.title || !event.date) continue;
                await connection.execute(
                    `INSERT IGNORE INTO agenda_events
                        (id, title, event_date, place, event_time, description, image, theme, poster_label)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        String(event.id), String(event.title), String(event.date), String(event.place || ''),
                        String(event.time || ''), String(event.description || ''), String(event.image || ''),
                        String(event.theme || ''), String(event.posterLabel || '')
                    ]
                );
            }
        }

        for (const pageKey of editablePages) {
            await connection.execute(
                'INSERT IGNORE INTO editable_pages (page_key, content_html) VALUES (?, ?)',
                [pageKey, readSeedPage(pageKey)]
            );
        }
    } finally {
        connection.release();
    }
}

async function getEvents() {
    const [rows] = await getPool().execute(
        `SELECT id, title, event_date, place, event_time, description, image, theme, poster_label
         FROM agenda_events ORDER BY event_date, id`
    );
    return rows.map(eventFromRow);
}

async function updateEvent(id, event) {
    const [result] = await getPool().execute(
        `UPDATE agenda_events
         SET title = ?, event_date = ?, event_time = ?, description = ?, image = COALESCE(?, image)
         WHERE id = ?`,
        [event.title, event.date, event.time, event.description, event.image ?? null, id]
    );
    if (!result.affectedRows) return null;
    const [rows] = await getPool().execute(
        `SELECT id, title, event_date, place, event_time, description, image, theme, poster_label
         FROM agenda_events WHERE id = ?`,
        [id]
    );
    return rows[0] ? eventFromRow(rows[0]) : null;
}

async function getPage(pageKey) {
    const [rows] = await getPool().execute(
        'SELECT content_html, revision FROM editable_pages WHERE page_key = ?',
        [pageKey]
    );
    return rows[0] ? { contentHtml: rows[0].content_html, revision: rows[0].revision } : null;
}

async function savePage(pageKey, contentHtml, expectedRevision) {
    const [result] = await getPool().execute(
        `UPDATE editable_pages SET content_html = ?, revision = revision + 1
         WHERE page_key = ? AND revision = ?`,
        [contentHtml, pageKey, expectedRevision]
    );
    return result.affectedRows > 0;
}

async function saveImage(mimeType, imageData) {
    const id = crypto.randomUUID();
    await getPool().execute(
        'INSERT INTO admin_images (id, mime_type, image_data) VALUES (?, ?, ?)',
        [id, mimeType, imageData]
    );
    return id;
}

async function getImage(id) {
    const [rows] = await getPool().execute(
        'SELECT mime_type, image_data FROM admin_images WHERE id = ?',
        [id]
    );
    return rows[0] || null;
}

async function closeDatabase() {
    if (!pool) return;
    const currentPool = pool;
    pool = undefined;
    await currentPool.end();
}

module.exports = {
    editablePages,
    initializeDatabase,
    getEvents,
    updateEvent,
    getPage,
    savePage,
    saveImage,
    getImage,
    closeDatabase
};
