/**
 * @jest-environment jsdom
 */

const API_PATH = require.resolve('../database-admin.js');
const PAGE_EDITOR_PATH = require.resolve('../database-page-editor.js');

function jsonResponse(body, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => body
    };
}

function loadPageEditor(markup) {
    document.body.innerHTML = markup;
    jest.resetModules();
    let onReady;
    const addEventListener = jest
        .spyOn(document, 'addEventListener')
        .mockImplementation((type, listener) => {
            if (type === 'DOMContentLoaded') onReady = listener;
        });
    require(PAGE_EDITOR_PATH);
    addEventListener.mockRestore();
    return onReady();
}

async function flushPromises() {
    for (let index = 0; index < 8; index += 1) await Promise.resolve();
}

beforeEach(() => {
    global.fetch = jest.fn();
});

afterEach(() => {
    document.body.innerHTML = '';
    delete window.DatabaseAdmin;
    jest.restoreAllMocks();
});

describe('API de administración de base de datos', () => {
    test('inicia sesión y envía cookies de la misma procedencia', async () => {
        global.fetch.mockResolvedValueOnce(jsonResponse({ ok: true }));
        jest.resetModules();
        require(API_PATH);

        await window.DatabaseAdmin.login('clave-admin');

        expect(global.fetch).toHaveBeenCalledWith('/api/admin/login', expect.objectContaining({
            method: 'POST',
            credentials: 'same-origin',
            body: JSON.stringify({ password: 'clave-admin' })
        }));
    });

    test('propaga errores del servidor para que el panel los muestre', async () => {
        global.fetch.mockResolvedValueOnce(jsonResponse({ error: 'Sesión expirada.' }, 401));
        jest.resetModules();
        require(API_PATH);

        await expect(window.DatabaseAdmin.request('/api/pages/predicas'))
            .rejects.toThrow('Sesión expirada.');
    });
});

describe('editor de páginas guardadas en MySQL', () => {
    test('carga contenido de la base de datos y guarda solo si la revisión coincide', async () => {
        const pageMarkup = `
            <main><section><h2>Prédicas</h2><p>Texto inicial</p></section></main>
            <footer class="site-footer"><div class="max-w-6xl"></div></footer>
            <script data-file="predicas.html"></script>
        `;
        window.DatabaseAdmin = {
            request: jest.fn()
                .mockResolvedValueOnce({ contentHtml: '<section><h2>Prédicas</h2><p>Desde DB</p></section>', revision: 4 })
                .mockResolvedValueOnce({ ok: true, revision: 5 }),
            login: jest.fn().mockResolvedValue({ ok: true }),
            logout: jest.fn().mockResolvedValue({ ok: true }),
            saveImage: jest.fn().mockResolvedValue({ path: '/api/images/123e4567-e89b-12d3-a456-426614174000' })
        };
        await loadPageEditor(pageMarkup);
        await flushPromises();

        expect(document.querySelector('main').textContent).toContain('Desde DB');
        const control = document.querySelector('.github-editor-tools');
        control.querySelector('.github-editor-trigger').click();
        const login = control.querySelector('.github-editor-login');
        login.elements.adminPassword.value = 'clave-admin';
        login.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await flushPromises();

        control.querySelector('.github-editor-start').click();
        document.querySelector('main p').textContent = 'Texto actualizado';
        control.querySelector('.github-editor-save').click();
        await flushPromises();

        expect(window.DatabaseAdmin.login).toHaveBeenCalledWith('clave-admin');
        expect(window.DatabaseAdmin.request.mock.calls[1][0]).toBe('/api/pages/predicas');
        expect(window.DatabaseAdmin.request.mock.calls[1][1].method).toBe('PUT');
        const saveBody = JSON.parse(window.DatabaseAdmin.request.mock.calls[1][1].body);
        expect(saveBody.contentHtml).toContain('Texto actualizado');
        expect(saveBody.expectedRevision).toBe(4);
        expect(control.querySelector('.github-editor-status').textContent).toContain('guardados en la base de datos');
    });

    test('conserva el diseño publicado cuando la versión de la base de datos alteró su estructura', async () => {
        window.DatabaseAdmin = {
            request: jest.fn().mockResolvedValue({
                contentHtml: '<section><h2>Solo un título</h2></section>',
                revision: 3
            })
        };
        await loadPageEditor(`
            <main><section class="layout"><h2>Prédicas</h2><p>Diseño original</p></section></main>
            <footer class="site-footer"><div class="max-w-6xl"></div></footer>
            <script data-file="predicas.html"></script>
        `);

        expect(document.querySelector('main').textContent).toContain('Diseño original');
        expect(document.querySelector('main .layout')).not.toBeNull();
        expect(document.querySelector('.github-editor-error').textContent)
            .toContain('Se conservó la versión del sitio');
    });

    test('sube las imágenes del editor al almacenamiento de la base de datos', async () => {
        const originalFileReader = global.FileReader;
        class FileReaderStub {
            addEventListener(type, callback) {
                if (type === 'load') this.onLoad = callback;
            }
            readAsDataURL() {
                this.result = 'data:image/png;base64,aGVsbG8=';
                this.onLoad();
            }
        }
        window.FileReader = FileReaderStub;
        window.DatabaseAdmin = {
            request: jest.fn().mockResolvedValue({ contentHtml: '<img src="media/old.png">', revision: 1 }),
            login: jest.fn().mockResolvedValue({ ok: true }),
            saveImage: jest.fn().mockResolvedValue({ path: '/api/images/123e4567-e89b-12d3-a456-426614174000' })
        };
        await loadPageEditor(`
            <main><img src="media/old.png"></main>
            <footer class="site-footer"><div class="max-w-6xl"></div></footer>
            <script data-file="grupos.html"></script>
        `);
        await flushPromises();

        const control = document.querySelector('.github-editor-tools');
        control.querySelector('.github-editor-trigger').click();
        control.querySelector('.github-editor-login').elements.adminPassword.value = 'clave';
        control.querySelector('.github-editor-login').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await flushPromises();
        control.querySelector('.github-editor-start').click();
        const main = document.querySelector('main');
        Object.defineProperty(main, 'isContentEditable', { configurable: true, value: true });
        main.querySelector('img').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

        const input = control.querySelector('.github-editor-image-input');
        Object.defineProperty(input, 'files', { configurable: true, value: [{ type: 'image/png', size: 5, name: 'foto.png' }] });
        input.dispatchEvent(new Event('change'));
        await flushPromises();

        expect(window.DatabaseAdmin.saveImage).toHaveBeenCalledWith('data:image/png;base64,aGVsbG8=');
        expect(document.querySelector('main img').getAttribute('src'))
            .toBe('/api/images/123e4567-e89b-12d3-a456-426614174000');
        window.FileReader = originalFileReader;
    });
});
