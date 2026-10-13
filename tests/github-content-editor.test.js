/**
 * @jest-environment jsdom
 */

const API_PATH = require.resolve('../github-content-api.js');
const PAGE_EDITOR_PATH = require.resolve('../github-page-editor.js');
const { TextDecoder, TextEncoder } = require('util');

function jsonResponse(body, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => body
    };
}

function encoded(value) {
    return Buffer.from(value, 'utf8').toString('base64');
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
    onReady();
}

async function flushPromises() {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
}

beforeEach(() => {
    global.TextDecoder = TextDecoder;
    global.TextEncoder = TextEncoder;
    global.fetch = jest.fn();
});

afterEach(() => {
    document.body.innerHTML = '';
    delete window.GitHubContent;
    jest.restoreAllMocks();
});

describe('GitHub Contents API', () => {
    test('autentica al usuario y guarda un archivo con el SHA remoto', async () => {
        const originalContent = '{"events":[]}';
        global.fetch
            .mockResolvedValueOnce(jsonResponse({ login: 'admin-icc' }))
            .mockResolvedValueOnce(jsonResponse({ permissions: { push: true } }))
            .mockResolvedValueOnce(jsonResponse({
                type: 'file',
                sha: 'file-sha',
                content: encoded(originalContent)
            }))
            .mockResolvedValueOnce(jsonResponse({ commit: { sha: 'commit-sha' } }));

        jest.resetModules();
        require(API_PATH);
        await expect(window.GitHubContent.authenticate('ghp_example')).resolves.toBe('admin-icc');
        const result = await window.GitHubContent.saveFile('agenda.json', '{"events":[1]}', 'Actualiza agenda', originalContent);

        expect(result.commit.sha).toBe('commit-sha');
        expect(global.fetch.mock.calls[3][1].method).toBe('PUT');
        expect(JSON.parse(global.fetch.mock.calls[3][1].body)).toMatchObject({
            message: 'Actualiza agenda',
            sha: 'file-sha',
            branch: 'main'
        });
        expect(global.fetch.mock.calls.every(([, options]) => options.headers.Authorization === 'Bearer ghp_example')).toBe(true);
        expect(localStorage.length).toBe(0);
        expect(sessionStorage.length).toBe(0);
    });

    test('no sobrescribe si otro editor cambió el archivo', async () => {
        const currentContent = '{"events":[{"title":"Cambio reciente"}]}';
        global.fetch
            .mockResolvedValueOnce(jsonResponse({ login: 'admin-icc' }))
            .mockResolvedValueOnce(jsonResponse({ permissions: { push: true } }))
            .mockResolvedValueOnce(jsonResponse({
                type: 'file',
                sha: 'new-sha',
                content: encoded(currentContent)
            }));

        jest.resetModules();
        require(API_PATH);
        await window.GitHubContent.authenticate('ghp_example');
        await expect(window.GitHubContent.saveFile('agenda.json', '{}', 'Actualiza agenda', '{}'))
            .rejects.toThrow('cambió en GitHub');
        expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    test('sube imágenes a media/ como archivo independiente', async () => {
        global.fetch
            .mockResolvedValueOnce(jsonResponse({ login: 'admin-icc' }))
            .mockResolvedValueOnce(jsonResponse({ permissions: { push: true } }))
            .mockResolvedValueOnce(jsonResponse({ content: { path: 'media/admin-uploads/image.png' } }));

        jest.resetModules();
        require(API_PATH);
        await window.GitHubContent.authenticate('ghp_example');
        const filePath = await window.GitHubContent.saveImage('data:image/png;base64,aGVsbG8=', 'foto niños.png');

        expect(filePath).toMatch(/^media\/admin-uploads\/\d+-foto-ninos\.png$/);
        expect(JSON.parse(global.fetch.mock.calls[2][1].body)).toMatchObject({
            content: 'aGVsbG8=',
            branch: 'main'
        });
    });
});

describe('editor de páginas estáticas', () => {
    test('añade el control al footer y guarda el main editado en el archivo configurado', async () => {
        const source = '<!doctype html><html><head><title>Prédicas</title></head><body><main><section><h2>Prédicas</h2><p>Texto inicial</p></section></main></body></html>';
        window.GitHubContent = {
            authenticate: jest.fn().mockResolvedValue('admin-icc'),
            readFile: jest.fn().mockResolvedValue({ content: source, sha: 'page-sha' }),
            saveFile: jest.fn().mockResolvedValue({ commit: { sha: 'saved-sha' } }),
            clearSession: jest.fn()
        };
        loadPageEditor(`<main><section><h2>Prédicas</h2><p>Texto inicial</p></section></main><footer class="site-footer"><div class="max-w-6xl"></div></footer><script data-file="predicas.html"></script>`);

        const control = document.querySelector('.github-editor-tools');
        expect(control.parentElement.className).toContain('max-w-6xl');
        control.querySelector('.github-editor-trigger').click();
        const login = control.querySelector('.github-editor-login');
        login.elements.adminPassword.value = 'TRINIDAD2026';
        login.elements.githubToken.value = 'ghp_example';
        login.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await flushPromises();

        control.querySelector('.github-editor-start').click();
        document.querySelector('main p').textContent = 'Texto actualizado';
        control.querySelector('.github-editor-save').click();
        await flushPromises();

        expect(window.GitHubContent.authenticate).toHaveBeenCalledWith('ghp_example');
        expect(window.GitHubContent.saveFile).toHaveBeenCalledWith(
            'predicas.html',
            expect.stringContaining('Texto actualizado'),
            'Actualiza contenido de predicas.html',
            source
        );
        expect(control.querySelector('.github-editor-status').textContent).toContain('guardados en GitHub');
    });
});