/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');
const SCRIPT_PATH = require.resolve('../eventos-admin.js');

const ADMIN_MARKUP = `
    <div id="eventsGrid"></div>
    <button id="openEventAdmin"></button>
    <section id="eventAdminPanel" hidden>
        <button id="closeEventAdmin"></button>
        <form id="eventAdminLogin">
            <input id="eventAdminPassword" />
            <button type="submit">Ingresar</button>
        </form>
        <div id="eventAdminAuthenticated" hidden>
            <p id="eventAdminStatus"></p>
            <button id="eventAdminLogout"></button>
        </div>
        <p id="eventAdminError" hidden></p>
    </section>
    <div id="eventEditorOverlay" hidden>
        <form id="eventEditorForm">
            <input id="eventTitleInput" />
            <input id="eventDateInput" />
            <input id="eventTimeInput" />
            <textarea id="eventDescriptionInput"></textarea>
            <input id="eventImageInput" type="file" />
            <input id="removeEventImage" type="checkbox" />
            <img id="eventImagePreview" hidden />
            <p id="eventEditorError" hidden></p>
            <button id="closeEventEditor" type="button"></button>
            <button id="cancelEventEdit" type="button"></button>
            <button type="submit">Guardar</button>
        </form>
    </div>
`;

function loadAdminScript() {
    document.body.innerHTML = ADMIN_MARKUP;
    jest.resetModules();

    let onReady;
    const addEventListener = jest
        .spyOn(document, 'addEventListener')
        .mockImplementation((type, listener) => {
            if (type === 'DOMContentLoaded') onReady = listener;
        });

    require(SCRIPT_PATH);
    addEventListener.mockRestore();
    onReady();
}

function makeEvent() {
    return {
        id: 'event-1',
        title: 'Encuentro familiar',
        date: '2026-10-11',
        time: '9:00 a. m.',
        description: 'Una reunión para la comunidad.',
        image: '',
        theme: 'baby'
    };
}

async function flushPromises() {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
}

beforeEach(() => {
    window.history.replaceState({}, '', '/ICCTRINIDAD/eventos.html');
    global.fetch = jest.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ events: [makeEvent()] }) })
        .mockRejectedValueOnce(new Error('GitHub Pages no tiene API de agenda'));
});

afterEach(() => {
    document.body.innerHTML = '';
    delete URL.createObjectURL;
    delete URL.revokeObjectURL;
    jest.restoreAllMocks();
});

describe('administración de eventos en GitHub Pages', () => {
    test('mantiene visible el acceso y carga la agenda estática sin API', async () => {
        loadAdminScript();
        await flushPromises();

        expect(document.querySelector('#eventsGrid').textContent).toContain('Encuentro familiar');
        expect(document.querySelector('#openEventAdmin').hidden).toBe(false);
    });

    test('acepta la clave y permite descargar la agenda modificada', async () => {
        const createObjectURL = jest.fn().mockReturnValue('blob:agenda');
        Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
        Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: jest.fn() });
        jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
        loadAdminScript();
        await flushPromises();

        document.querySelector('#openEventAdmin').click();
        const passwordInput = document.querySelector('#eventAdminPassword');
        passwordInput.value = 'TRINIDAD2026';
        document.querySelector('#eventAdminLogin').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await flushPromises();

        expect(document.querySelector('#eventAdminAuthenticated').hidden).toBe(false);
        expect(document.querySelector('[data-edit-event="event-1"]')).not.toBeNull();

        document.querySelector('[data-edit-event="event-1"]').click();
        document.querySelector('#eventTitleInput').value = 'Encuentro actualizado';
        document.querySelector('#eventDateInput').value = '2026-10-12';
        document.querySelector('#eventEditorForm').reportValidity = jest.fn(() => true);
        document.querySelector('#eventEditorForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await flushPromises();

        expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
        expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
        expect(document.querySelector('#eventAdminStatus').textContent).toContain('Se descargó agenda.json');
        expect(document.querySelector('#eventsGrid').textContent).toContain('Encuentro actualizado');
    });

    test('rechaza una clave incorrecta sin ocultar el botón de acceso', async () => {
        loadAdminScript();
        await flushPromises();

        document.querySelector('#openEventAdmin').click();
        document.querySelector('#eventAdminPassword').value = 'incorrecta';
        document.querySelector('#eventAdminLogin').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await flushPromises();

        expect(document.querySelector('#eventAdminError').textContent).toBe('La clave no es correcta.');
        expect(document.querySelector('#openEventAdmin').hidden).toBe(false);
    });
});