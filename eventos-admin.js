document.addEventListener('DOMContentLoaded', () => {
    const eventsGrid = document.getElementById('eventsGrid');
    const openAdminButton = document.getElementById('openEventAdmin');
    const adminPanel = document.getElementById('eventAdminPanel');
    const closeAdminButton = document.getElementById('closeEventAdmin');
    const adminLogin = document.getElementById('eventAdminLogin');
    const adminPasswordInput = document.getElementById('eventAdminPassword');
    const adminAuthenticated = document.getElementById('eventAdminAuthenticated');
    const adminStatus = document.getElementById('eventAdminStatus');
    const adminError = document.getElementById('eventAdminError');
    const logoutButton = document.getElementById('eventAdminLogout');
    const editorOverlay = document.getElementById('eventEditorOverlay');
    const editorForm = document.getElementById('eventEditorForm');
    const editorTitle = document.getElementById('eventTitleInput');
    const editorDate = document.getElementById('eventDateInput');
    const editorTime = document.getElementById('eventTimeInput');
    const editorDescription = document.getElementById('eventDescriptionInput');
    const editorImage = document.getElementById('eventImageInput');
    const removeImage = document.getElementById('removeEventImage');
    const imagePreview = document.getElementById('eventImagePreview');
    const editorError = document.getElementById('eventEditorError');
    const closeEditorButton = document.getElementById('closeEventEditor');
    const cancelEditorButton = document.getElementById('cancelEventEdit');

    if (!eventsGrid || !openAdminButton || !adminPanel || !editorForm) return;

    const allowedThemes = new Set(['kids', 'seminar', 'leaders', 'volunteers', 'baby', 'luminacion']);
    let events = [];
    let adminPassword = '';
    let editingEventId = '';
    let newImageData = '';

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[character]);
    }

    function formatDate(value) {
        const datePart = String(value || '').slice(0, 10);
        const [year, month, day] = datePart.split('-').map(Number);
        if (!year || !month || !day) return 'Fecha por confirmar';
        return new Intl.DateTimeFormat('es-CO', {
            day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC'
        }).format(new Date(Date.UTC(year, month - 1, day)));
    }

    function formatTime(event) {
        const time = event.time || '';
        if (time) return time;
        if (!time && String(event.date).includes('T')) {
            const legacyTime = String(event.date).split('T')[1].slice(0, 5);
            const [hoursText, minutes] = legacyTime.split(':');
            const hours = Number(hoursText);
            if (Number.isInteger(hours) && hours <= 23 && minutes) {
                return `${hours % 12 || 12}:${minutes} ${hours >= 12 ? 'p. m.' : 'a. m.'}`;
            }
            return legacyTime;
        }
        return 'Todo el día';
    }

    function safeImageSource(value) {
        if (typeof value !== 'string') return '';
        if (/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) return value;
        if (value.startsWith('media/') && !value.split('/').includes('..')) return value;
        return '';
    }

    function renderEvent(event) {
        const theme = allowedThemes.has(event.theme) ? event.theme : 'default';
        const image = safeImageSource(event.image);
        const poster = image
            ? `<div class="quienes-event-poster quienes-event-poster--image"><img class="quienes-event-poster-image" src="${escapeHtml(image)}" alt="Afiche de ${escapeHtml(event.title)}" /></div>`
            : `<div class="quienes-event-poster quienes-event-poster--${theme}">
                    <p class="quienes-event-poster-label">${escapeHtml(event.posterLabel || 'Evento ICC')}</p>
                    <h4 class="quienes-event-poster-title">${escapeHtml(event.title)}</h4>
                    <p class="quienes-event-poster-date">${escapeHtml(formatDate(event.date))}</p>
                </div>`;
        const description = escapeHtml(event.description || 'Pronto compartiremos más información sobre este evento.');
        const editButton = adminPassword
            ? `<button class="quienes-event-edit" type="button" data-edit-event="${escapeHtml(event.id)}">Editar tarjeta</button>`
            : '';

        return `<article class="quienes-event-card">
            ${poster}
            <h4 class="quienes-event-card-title">${escapeHtml(event.title)}</h4>
            <p class="quienes-event-card-meta">Fecha: ${escapeHtml(formatDate(event.date))}</p>
            <p class="quienes-event-card-meta">Hora: ${escapeHtml(formatTime(event))}</p>
            <details class="quienes-event-details">
                <summary class="quienes-event-link"><span>Más información</span><span>Menos información</span></summary>
                <p class="quienes-event-description">${description}</p>
            </details>
            ${editButton}
        </article>`;
    }

    function renderEvents() {
        eventsGrid.innerHTML = events.map(renderEvent).join('');
    }

    function setAdminError(message) {
        adminError.textContent = message;
        adminError.hidden = !message;
    }

    function setEditorError(message) {
        editorError.textContent = message;
        editorError.hidden = !message;
    }

    function closeEditor() {
        editorOverlay.hidden = true;
        editorForm.reset();
        editingEventId = '';
        newImageData = '';
        imagePreview.removeAttribute('src');
        imagePreview.hidden = true;
        setEditorError('');
    }

    function openEditor(event) {
        editingEventId = String(event.id);
        editorTitle.value = event.title;
        editorDate.value = String(event.date).slice(0, 10);
        editorTime.value = event.time || (String(event.date).includes('T') ? String(event.date).split('T')[1].slice(0, 5) : '');
        editorDescription.value = event.description || '';
        editorImage.value = '';
        removeImage.checked = false;
        newImageData = '';
        const image = safeImageSource(event.image);
        imagePreview.src = image;
        imagePreview.hidden = !image;
        setEditorError('');
        editorOverlay.hidden = false;
        editorTitle.focus();
    }

    async function loadEvents() {
        let eventsLoaded = false;

        try {
            const response = await fetch('agenda.json');
            if (!response.ok) throw new Error('No fue posible cargar la agenda.');
            const data = await response.json();
            events = Array.isArray(data.events) ? data.events : [];
            renderEvents();
            eventsLoaded = true;
        } catch (error) {
            events = [];
        }

        try {
            const response = await fetch('/api/agenda/events');
            if (!response.ok) throw new Error('No hay una API de agenda disponible.');
            const data = await response.json();
            events = Array.isArray(data.events) ? data.events : [];
            renderEvents();
            eventsLoaded = true;
            return;
        } catch (error) {
            const adminActions = document.querySelector('.event-admin-actions');
            if (adminActions) adminActions.hidden = true;
            adminPanel.hidden = true;
        }

        if (!eventsLoaded) {
            eventsGrid.innerHTML = '<p class="event-admin-error">No se pudieron cargar los eventos. Revisa la conexión e inténtalo de nuevo.</p>';
        } else if (!events.length) {
            eventsGrid.innerHTML = '<p class="event-admin-error">No hay eventos publicados.</p>';
        }
    }

    openAdminButton.addEventListener('click', () => {
        adminPanel.hidden = !adminPanel.hidden;
        openAdminButton.setAttribute('aria-expanded', String(!adminPanel.hidden));
        if (!adminPanel.hidden && adminPassword) {
            adminLogin.hidden = true;
            adminAuthenticated.hidden = false;
        } else if (!adminPanel.hidden) {
            adminLogin.hidden = false;
            adminAuthenticated.hidden = true;
            adminPasswordInput.focus();
        }
    });

    closeAdminButton.addEventListener('click', () => {
        adminPanel.hidden = true;
        openAdminButton.setAttribute('aria-expanded', 'false');
    });

    adminLogin.addEventListener('submit', async event => {
        event.preventDefault();
        setAdminError('');
        const password = adminPasswordInput.value;
        try {
            const response = await fetch('/api/agenda/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            if (!response.ok) throw new Error('La clave no es correcta.');
            adminPassword = password;
            adminPasswordInput.value = '';
            adminLogin.hidden = true;
            adminAuthenticated.hidden = false;
            adminStatus.textContent = 'Modo de edición activado. Puedes editar cada tarjeta.';
            renderEvents();
        } catch (error) {
            setAdminError(error.message || 'No se pudo validar la clave.');
        }
    });

    logoutButton.addEventListener('click', () => {
        adminPassword = '';
        adminLogin.hidden = false;
        adminAuthenticated.hidden = true;
        adminPanel.hidden = true;
        openAdminButton.setAttribute('aria-expanded', 'false');
        renderEvents();
    });

    eventsGrid.addEventListener('click', event => {
        const editButton = event.target.closest('[data-edit-event]');
        if (!editButton || !adminPassword) return;
        const selectedEvent = events.find(item => String(item.id) === editButton.dataset.editEvent);
        if (selectedEvent) openEditor(selectedEvent);
    });

    editorImage.addEventListener('change', () => {
        const [file] = editorImage.files || [];
        if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
            editorImage.value = '';
            setEditorError('Selecciona una imagen JPG, PNG o WebP de máximo 5 MB.');
            return;
        }

        const reader = new FileReader();
        reader.addEventListener('load', () => {
            newImageData = String(reader.result || '');
            imagePreview.src = newImageData;
            imagePreview.hidden = false;
            removeImage.checked = false;
            setEditorError('');
        });
        reader.addEventListener('error', () => setEditorError('No se pudo leer la imagen seleccionada.'));
        reader.readAsDataURL(file);
    });

    removeImage.addEventListener('change', () => {
        if (removeImage.checked) {
            newImageData = '';
            editorImage.value = '';
            imagePreview.hidden = true;
        }
    });

    editorForm.addEventListener('submit', async event => {
        event.preventDefault();
        if (!editorForm.reportValidity()) return;
        setEditorError('');
        const submitButton = editorForm.querySelector('[type="submit"]');
        const payload = {
            password: adminPassword,
            title: editorTitle.value.trim(),
            date: editorDate.value,
            time: editorTime.value,
            description: editorDescription.value.trim()
        };
        if (newImageData) payload.image = newImageData;
        else if (removeImage.checked) payload.image = '';

        submitButton.disabled = true;
        try {
            const response = await fetch(`/api/agenda/events/${encodeURIComponent(editingEventId)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (response.status === 401) {
                adminPassword = '';
                adminLogin.hidden = false;
                adminAuthenticated.hidden = true;
                renderEvents();
                throw new Error('La sesión expiró. Ingresa nuevamente la clave.');
            }
            if (!response.ok) throw new Error(result.error || 'No se pudo guardar el evento.');

            const eventIndex = events.findIndex(item => String(item.id) === String(result.event.id));
            if (eventIndex !== -1) events[eventIndex] = result.event;
            renderEvents();
            closeEditor();
            adminStatus.textContent = 'Cambios guardados. Ya están visibles para todos.';
        } catch (error) {
            setEditorError(error.message || 'No se pudo guardar el evento.');
        } finally {
            submitButton.disabled = false;
        }
    });

    [closeEditorButton, cancelEditorButton].forEach(button => button.addEventListener('click', closeEditor));
    editorOverlay.addEventListener('click', event => {
        if (event.target === editorOverlay) closeEditor();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !editorOverlay.hidden) closeEditor();
    });

    loadEvents();
});