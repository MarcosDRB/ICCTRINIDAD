/**
 * @jest-environment jsdom
 */

const SCRIPT_PATH = require.resolve('../scripts.js');

const CONTACT_MARKUP = `
    <header><nav><ul><li><a href="#">Inicio</a></li></ul></nav></header>
    <button id="menuBtn">Menu</button>
    <section class="reveal">Bloque</section>
    <form id="contactWhatsAppForm" data-whatsapp="+57 (300) 123-4567">
        <input id="contactName" name="name" value="Ana" required />
        <input id="contactEmail" name="email" type="email" value="ana@example.com" />
        <input id="contactCountry" name="country" value="Colombia" />
        <input id="contactTopic" name="topic" value="Salud" />
        <textarea id="contactMessage" name="message">Oren por mi familia</textarea>
        <input id="contactConsent" name="consent" type="checkbox" checked />
        <button id="showSendOptions" type="submit">Enviar</button>
    </form>
    <div id="sendOptionsModal" class="hidden">
        <div id="sendOptionsModalBox">
            <button id="sendWhatsApp">WhatsApp</button>
            <button id="sendEmail">Correo</button>
            <button id="closeSendModal">Cancelar</button>
        </div>
    </div>
    <div class="home-pdf-gallery-slot">Historia</div>
`;

// jsdom keeps a single document per test file, so the DOMContentLoaded listener
// registered by the script is captured and invoked directly instead of dispatching
// the event, which would also re-run the listeners of previous test cases.
function loadScripts(markup) {
    document.body.innerHTML = markup;
    jest.resetModules();

    let onReady;
    const addEventListener = jest
        .spyOn(document, 'addEventListener')
        .mockImplementation((type, listener) => {
            if (type === 'DOMContentLoaded') onReady = listener;
        });

    require(SCRIPT_PATH);
    addEventListener.mockRestore();

    expect(typeof onReady).toBe('function');
    onReady();
}

function el(id) {
    return document.getElementById(id);
}

beforeEach(() => {
    jest.useFakeTimers();
    window.alert = jest.fn();
    window.open = jest.fn();
    window.scrollTo = jest.fn();
    jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
    document.body.innerHTML = '';
});

describe('mobile menu', () => {
    test('toggles the nav list open and closed', () => {
        loadScripts(CONTACT_MARKUP);
        const nav = document.querySelector('header nav ul');

        el('menuBtn').click();
        expect(nav.classList.contains('mobile-open')).toBe(true);

        el('menuBtn').click();
        expect(nav.classList.contains('mobile-open')).toBe(false);
    });
});

describe('back to top button', () => {
    test('is appended to the body and scrolls to the top when clicked', () => {
        loadScripts(CONTACT_MARKUP);
        const back = document.querySelector('.back-to-top');

        expect(back).not.toBeNull();

        back.click();

        expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    });

    test('shows itself only after scrolling past 300px', () => {
        loadScripts(CONTACT_MARKUP);
        const back = document.querySelector('.back-to-top');

        window.scrollY = 500;
        window.dispatchEvent(new window.Event('scroll'));
        expect(back.classList.contains('show')).toBe(true);

        window.scrollY = 10;
        window.dispatchEvent(new window.Event('scroll'));
        expect(back.classList.contains('show')).toBe(false);
    });
});

describe('reveal animations', () => {
    test('marks reveal elements inside the viewport as visible', () => {
        loadScripts(CONTACT_MARKUP);

        expect(document.querySelector('.reveal').classList.contains('visible')).toBe(true);
    });
});

describe('send options modal', () => {
    test('opens when the form is valid and consent is checked', () => {
        loadScripts(CONTACT_MARKUP);
        const modal = el('sendOptionsModal');

        el('showSendOptions').click();

        expect(modal.classList.contains('hidden')).toBe(false);
        expect(modal.classList.contains('flex')).toBe(true);
    });

    test('does not open and warns when consent is not checked', () => {
        loadScripts(CONTACT_MARKUP);
        el('contactConsent').checked = false;

        el('showSendOptions').click();

        expect(window.alert).toHaveBeenCalledWith('Debes aceptar la Política de Tratamiento de Datos Personales.');
        expect(el('sendOptionsModal').classList.contains('hidden')).toBe(true);
    });

    test('does not open when the form is invalid', () => {
        loadScripts(CONTACT_MARKUP);
        const form = el('contactWhatsAppForm');
        form.checkValidity = jest.fn(() => false);
        form.reportValidity = jest.fn();

        el('showSendOptions').click();

        expect(form.reportValidity).toHaveBeenCalled();
        expect(el('sendOptionsModal').classList.contains('hidden')).toBe(true);
    });

    test('closes with the cancel button', () => {
        loadScripts(CONTACT_MARKUP);
        el('showSendOptions').click();

        el('closeSendModal').click();

        expect(el('sendOptionsModal').classList.contains('hidden')).toBe(true);
        expect(el('sendOptionsModal').classList.contains('flex')).toBe(false);
    });

    test('closes when clicking the backdrop but not the modal content', () => {
        loadScripts(CONTACT_MARKUP);
        const modal = el('sendOptionsModal');

        el('showSendOptions').click();
        el('sendOptionsModalBox').click();
        expect(modal.classList.contains('hidden')).toBe(false);

        modal.click();
        expect(modal.classList.contains('hidden')).toBe(true);
    });
});

describe('WhatsApp sending', () => {
    test('opens wa.me with the digits of the number and the encoded message', () => {
        loadScripts(CONTACT_MARKUP);

        el('sendWhatsApp').click();

        expect(window.open).toHaveBeenCalledTimes(1);
        const [url, target, features] = window.open.mock.calls[0];
        expect(target).toBe('_blank');
        expect(features).toBe('noopener');
        expect(url.startsWith('https://wa.me/573001234567?text=')).toBe(true);

        const text = decodeURIComponent(url.split('?text=')[1]);
        expect(text).toBe('Hola, soy Ana.\nCorreo: ana@example.com\nPaís: Colombia\nTema: Salud\nOren por mi familia');
    });

    test('omits the optional fields that are empty', () => {
        loadScripts(CONTACT_MARKUP);
        el('contactEmail').value = '';
        el('contactCountry').value = '';
        el('contactTopic').value = '';

        el('sendWhatsApp').click();

        const text = decodeURIComponent(window.open.mock.calls[0][0].split('?text=')[1]);
        expect(text).toBe('Hola, soy Ana.\nOren por mi familia');
    });

    test('warns and does nothing when no number is configured', () => {
        loadScripts(CONTACT_MARKUP.replace('data-whatsapp="+57 (300) 123-4567"', ''));

        el('sendWhatsApp').click();

        expect(window.alert).toHaveBeenCalledWith('No hay un número de WhatsApp configurado.');
        expect(window.open).not.toHaveBeenCalled();
    });

    test('closes the modal after opening WhatsApp', () => {
        loadScripts(CONTACT_MARKUP);
        el('showSendOptions').click();

        el('sendWhatsApp').click();

        expect(el('sendOptionsModal').classList.contains('hidden')).toBe(true);
    });
});

describe('email sending', () => {
    test('posts the form to FormSubmit, resets it and closes the modal on success', async () => {
        global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ success: 'true' }) });
        loadScripts(CONTACT_MARKUP);
        el('showSendOptions').click();

        const button = el('sendEmail');
        const form = el('contactWhatsAppForm');
        jest.spyOn(form, 'reset');

        button.click();
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();

        expect(global.fetch).toHaveBeenCalledWith(
            'https://formsubmit.co/ajax/comunicaciones.icclatrinidad@gmail.com',
            expect.objectContaining({ method: 'POST', body: expect.any(FormData) })
        );
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('¡Mensaje enviado exitosamente!'));
        expect(form.reset).toHaveBeenCalled();
        expect(el('sendOptionsModal').classList.contains('hidden')).toBe(true);
        expect(button.disabled).toBe(false);
        expect(button.innerHTML).toBe('Correo');
    });

    test('keeps the form data and warns when FormSubmit responds with an error', async () => {
        global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, text: async () => JSON.stringify({ error: 'nope' }) });
        loadScripts(CONTACT_MARKUP);
        el('showSendOptions').click();

        el('sendEmail').click();
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();

        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Hubo un error al enviar el mensaje.'));
        expect(el('sendOptionsModal').classList.contains('hidden')).toBe(false);
        expect(el('sendEmail').disabled).toBe(false);
    });

    test('warns when FormSubmit returns a success status with a non-JSON body', async () => {
        global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '<html>oops</html>' });
        loadScripts(CONTACT_MARKUP);
        el('showSendOptions').click();

        el('sendEmail').click();
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();

        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('No pudimos confirmar el envío del mensaje.'));
        expect(el('sendOptionsModal').classList.contains('hidden')).toBe(false);
        expect(el('sendEmail').disabled).toBe(false);
    });

    test('warns about a connection error when fetch rejects', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('offline'));
        loadScripts(CONTACT_MARKUP);

        el('sendEmail').click();
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();

        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Error de conexión.'));
        expect(el('sendEmail').disabled).toBe(false);
    });
});

describe('history gallery slots', () => {
    test('become clickable and navigate to historias.html', () => {
        delete window.location;
        window.location = { href: '' };
        loadScripts(CONTACT_MARKUP);
        const slot = document.querySelector('.home-pdf-gallery-slot');

        expect(slot.style.cursor).toBe('pointer');

        slot.click();

        expect(window.location.href).toBe('historias.html');
    });
});

describe('pages without the contact form', () => {
    test('loads without throwing when the optional elements are missing', () => {
        expect(() => loadScripts('<header><nav><ul></ul></nav></header>')).not.toThrow();
        expect(document.querySelector('.back-to-top')).not.toBeNull();
    });
});
