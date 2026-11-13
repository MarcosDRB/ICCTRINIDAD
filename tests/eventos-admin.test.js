/**
 * @jest-environment jsdom
 */

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
    global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ events: [makeEvent()] })
    });
    window.DatabaseAdmin = {
        login: jest.fn().mockResolvedValue({ ok: true }),
        logout: jest.fn().mockResolvedValue({ ok: true }),
        saveImage: jest.fn().mockResolvedValue({ path: '/api/images/123e4567-e89b-12d3-a456-426614174000' }),
        request: jest.fn().mockImplementation(async (url, options) => ({
            ok: true,
            event: { ...makeEvent(), ...JSON.parse(options.body) }
        }))
    };
});

afterEach(() => {
    document.body.innerHTML = '';
    delete URL.createObjectURL;
    delete URL.revokeObjectURL;
    delete window.DatabaseAdmin;
    jest.restoreAllMocks();
});

describe('administración de eventos con MySQL', () => {
    test('carga eventos desde la API y mantiene visible el acceso', async () => {
        loadAdminScript();
        await flushPromises();

        expect(global.fetch).toHaveBeenCalledWith('/api/agenda/events');
        expect(document.querySelector('#eventsGrid').textContent).toContain('Encuentro familiar');
        expect(document.querySelector('#openEventAdmin').hidden).toBe(false);
    });

    test('inicia sesión y guarda los cambios mediante la API', async () => {
        loadAdminScript();
        await flushPromises();

        document.querySelector('#openEventAdmin').click();
        document.querySelector('#eventAdminPassword').value = 'clave-de-prueba';
        document.querySelector('#eventAdminLogin').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await flushPromises();

        expect(document.querySelector('#eventAdminAuthenticated').hidden).toBe(false);
        expect(window.DatabaseAdmin.login).toHaveBeenCalledWith('clave-de-prueba');
        expect(document.querySelector('[data-edit-event="event-1"]')).not.toBeNull();

        document.querySelector('[data-edit-event="event-1"]').click();
        document.querySelector('#eventTitleInput').value = 'Encuentro actualizado';
        document.querySelector('#eventDateInput').value = '2026-10-12';
        document.querySelector('#eventEditorForm').reportValidity = jest.fn(() => true);
        document.querySelector('#eventEditorForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await flushPromises();

        expect(window.DatabaseAdmin.request).toHaveBeenCalledWith(
            '/api/agenda/events/event-1',
            expect.objectContaining({
                method: 'PUT',
                body: expect.stringContaining('Encuentro actualizado')
            })
        );
        expect(document.querySelector('#eventAdminStatus').textContent).toContain('guardados en la base de datos');
        expect(document.querySelector('#eventsGrid').textContent).toContain('Encuentro actualizado');
    });

    test('muestra errores de autenticación sin ocultar el acceso', async () => {
        window.DatabaseAdmin.login.mockRejectedValue(new Error('La clave no es correcta.'));
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
