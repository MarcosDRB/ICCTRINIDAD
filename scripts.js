// scripts.js — interacciones mínimas para la plantilla
document.addEventListener('DOMContentLoaded', function () {
    // Leader modal (guarded)
    const leaderCards = document.querySelectorAll('.leader-card');
    const modal = document.getElementById('leaderModal');
    const modalName = document.getElementById('modalName');
    const modalRole = document.getElementById('modalRole');
    const modalBio = document.getElementById('modalBio');
    const closeModal = document.getElementById('closeModal');

    if (modal && closeModal && modalName && modalRole && modalBio && leaderCards.length) {
        leaderCards.forEach(card => {
            card.addEventListener('click', () => {
                const name = card.dataset.name;
                const role = card.dataset.role;
                const bio = card.dataset.bio;
                modalName.textContent = name;
                modalRole.textContent = role;
                modalBio.textContent = bio;
                modal.classList.remove('hidden');
                modal.classList.add('flex');
            });
        });

        closeModal.addEventListener('click', () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
        });
    }

    // Donation presets and form
    const presets = document.querySelectorAll('.preset');
    const amountInput = document.getElementById('amount');
    const donorName = document.getElementById('donorName');
    const donorEmail = document.getElementById('donorEmail');
    const summary = document.getElementById('summary');
    const donationForm = document.getElementById('donationForm');

    if (presets.length && amountInput && summary) {
        presets.forEach(btn => {
            btn.addEventListener('click', () => {
                amountInput.value = btn.dataset.amount;
                updateSummary();
            });
        });
    }

    function updateSummary() {
        const amt = amountInput && amountInput.value ? new Intl.NumberFormat('es-CO').format(amountInput.value) : '-';
        const name = donorName && donorName.value ? donorName.value : '-';
        if (summary) summary.textContent = `Monto: ${amt} | Donante: ${name}`;
    }

    [amountInput, donorName, donorEmail].forEach(el => el && el.addEventListener('input', updateSummary));

    if (donationForm) {
        donationForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const amt = Number(amountInput.value);
            if (!amt || amt <= 0) {
                alert('Ingrese un monto válido');
                return;
            }
            // Simulación de redirección a pasarela de pago
            alert(`Simulación: redirigiendo a pasarela de pago para ${new Intl.NumberFormat('es-CO').format(amt)} COP`);
            // En producción: llamada a backend -> crear session de pago (Stripe/PayU) -> redirigir
        });
    }

    // Simple mobile menu toggle (guarded)
    const menuBtn = document.getElementById('menuBtn');
    if (menuBtn) {
        menuBtn.setAttribute('aria-expanded', 'false');
        menuBtn.addEventListener('click', () => {
            const nav = document.querySelector('header nav ul');
            if (!nav) return;
            nav.classList.toggle('mobile-open');
            if (nav.classList.contains('mobile-open')) {
                nav.classList.remove('hidden');
                menuBtn.setAttribute('aria-expanded', 'true');
            } else {
                nav.classList.add('hidden');
                menuBtn.setAttribute('aria-expanded', 'false');
            }
        });

        document.querySelectorAll('header nav ul a').forEach(link => {
            link.addEventListener('click', () => {
                const nav = document.querySelector('header nav ul');
                if (!nav) return;
                nav.classList.remove('mobile-open');
                nav.classList.add('hidden');
                menuBtn.setAttribute('aria-expanded', 'false');
            });
        });
    }

    // Active nav link highlighting
    const navLinks = document.querySelectorAll('.nav-link');
    function setActiveNav() {
        const path = location.pathname.split('/').pop() || 'index.html';
        navLinks.forEach(a => {
            const href = a.getAttribute('href') || '';
            if (href === path || (href === 'index.html' && path === '')) {
                a.classList.add('active');
            } else {
                a.classList.remove('active');
            }
        });
    }
    if (navLinks.length) setActiveNav();

    // Back to top button
    const back = document.createElement('button');
    back.className = 'back-to-top';
    back.setAttribute('aria-label', 'Volver arriba');
    back.innerHTML = '↑';
    document.body.appendChild(back);
    back.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    const revealItems = Array.from(document.querySelectorAll('.reveal'));

    function revealInViewport() {
        revealItems.forEach(el => {
            const r = el.getBoundingClientRect();
            if (r.top < window.innerHeight - 80) el.classList.add('visible');
        });
    }

    function cascadeRevealOnLoad() {
        let step = 0;
        revealItems.forEach((el) => {
            const r = el.getBoundingClientRect();
            // Solo anima en cascada lo que ya está dentro del primer viewport.
            if (r.top < window.innerHeight - 20) {
                const delay = step * 120;
                setTimeout(() => {
                    el.classList.add('visible');
                }, delay);
                step += 1;
            }
        });
    }

    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) back.classList.add('show'); else back.classList.remove('show');
        revealInViewport();
    });

    // Activa animación inicial tipo cascada sin necesidad de scroll.
    cascadeRevealOnLoad();
    // Asegura que cualquier bloque cercano también entre visible tras la carga.
    setTimeout(revealInViewport, 700);

    // Image lightbox for .photo-card images
    const imageModal = document.getElementById('imageModal');
    const imageModalImg = imageModal ? imageModal.querySelector('img') : null;
    const imageModalCaption = imageModal ? imageModal.querySelector('.img-caption') : null;
    const closeImage = imageModal ? imageModal.querySelector('.close-image-modal') : null;
    if (imageModal && imageModalImg) {
        document.querySelectorAll('.photo-card img').forEach(img => {
            if (img.closest('.no-lightbox')) {
                img.style.cursor = 'default';
                return;
            }
            img.style.cursor = 'zoom-in';
            img.addEventListener('click', (e) => {
                imageModalImg.src = img.src;
                imageModalImg.alt = img.alt || '';
                if (imageModalCaption) imageModalCaption.textContent = img.alt || '';
                imageModal.classList.remove('hidden');
                imageModal.classList.add('flex');
            });
        });

        const closeImageModal = () => {
            imageModal.classList.add('hidden');
            imageModal.classList.remove('flex');
            imageModalImg.src = '';
            if (imageModalCaption) imageModalCaption.textContent = '';
        };

        if (closeImage) closeImage.addEventListener('click', closeImageModal);
        imageModal.addEventListener('click', (e) => {
            if (e.target === imageModal) closeImageModal();
        });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeImageModal(); });
    }

    // Newsletter form handler (simulated)
    document.querySelectorAll('.newsletter-form').forEach(f => {
        f.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = f.querySelector('input[name="email"]').value;
            if(!email) return alert('Ingrese un correo válido');
            alert(`Gracias — ${email} ha sido suscrito (simulación).`);
            f.reset();
        });
    });

    // Contact form -> WhatsApp
    const contactWhatsAppForm = document.getElementById('contactWhatsAppForm');
    if (contactWhatsAppForm) {
        contactWhatsAppForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const target = String(contactWhatsAppForm.dataset.whatsapp || '').replace(/\D/g, '');
            const nameInput = document.getElementById('contactName');
            const emailInput = document.getElementById('contactEmail');
            const countryInput = document.getElementById('contactCountry');
            const topicInput = document.getElementById('contactTopic');
            const messageInput = document.getElementById('contactMessage');
            const consentInput = document.getElementById('contactConsent');

            const name = (nameInput && nameInput.value ? nameInput.value : '').trim();
            const email = (emailInput && emailInput.value ? emailInput.value : '').trim();
            const country = (countryInput && countryInput.value ? countryInput.value : '').trim();
            const topic = (topicInput && topicInput.value ? topicInput.value : '').trim();
            const message = (messageInput && messageInput.value ? messageInput.value : '').trim();

            if (!target) {
                alert('No hay un número de WhatsApp configurado.');
                return;
            }
            if (!name || !message) {
                alert('Por favor completa tu nombre y mensaje.');
                return;
            }

            if (consentInput && !consentInput.checked) {
                alert('Debes aceptar la Política de Tratamiento de Datos Personales para enviar tu petición.');
                return;
            }

            const lines = [
                `Hola, soy ${name}.`,
                email ? `Correo: ${email}` : '',
                country ? `País: ${country}` : '',
                topic ? `Tema: ${topic}` : '',
                '',
                message
            ].filter(Boolean);

            const text = lines.join('\n');
            const whatsappUrl = `https://wa.me/${target}?text=${encodeURIComponent(text)}`;
            window.open(whatsappUrl, '_blank', 'noopener');
        });
    }

    /* ==== Agenda compartida (API) editable por pastor ==== */
    const AGENDA_API_BASE = '/api/agenda';
    const agendaList = document.getElementById('agendaList');
    const agendaAdminToggle = document.getElementById('agendaAdminToggle');
    const agendaAdminPanel = document.getElementById('agendaAdminPanel');
    const agendaDatesForm = document.getElementById('agendaDatesForm');
    const agendaDatesList = document.getElementById('agendaDatesList');
    const agendaDatesReset = document.getElementById('agendaDatesReset');
    const agendaSyncStatus = document.getElementById('agendaSyncStatus');

    let agendaEvents = [];
    let agendaAdminPassword = '';

    function setAgendaStatus(message, ok) {
        if (!agendaSyncStatus) return;
        agendaSyncStatus.textContent = message;
        agendaSyncStatus.classList.toggle('text-red-600', ok === false);
        agendaSyncStatus.classList.toggle('text-green-700', ok === true);
    }

    function sortedEvents(events) {
        return [...events].sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    async function fetchAgendaEvents() {
        const res = await fetch(`${AGENDA_API_BASE}/events`);
        if (!res.ok) throw new Error('No se pudo cargar la agenda');
        const data = await res.json();
        return Array.isArray(data.events) ? data.events : [];
    }

    async function verifyAgendaPassword(password) {
        const res = await fetch(`${AGENDA_API_BASE}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        return res.ok;
    }

    async function updateAgendaDates(dates) {
        const res = await fetch(`${AGENDA_API_BASE}/update-dates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: agendaAdminPassword, dates })
        });
        if (!res.ok) throw new Error('No se pudieron guardar las fechas');
        const data = await res.json();
        return data.events || [];
    }

    function renderAgenda() {
        if (!agendaList) return;
        const now = new Date();
        const upcoming = sortedEvents(agendaEvents).filter(e => new Date(e.date) >= now);
        agendaList.innerHTML = '';
        if (!upcoming.length) {
            agendaList.innerHTML = '<div class="text-sm text-muted">No hay eventos próximos por ahora.</div>';
            return;
        }
        upcoming.forEach(ev => {
            const d = new Date(ev.date);
            const item = document.createElement('div');
            item.className = 'agenda-item';
            item.innerHTML = `<time datetime="${ev.date}">${d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })} ${d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</time><div><strong>${ev.title}</strong><div class="text-sm text-muted">${ev.place}</div></div>`;
            agendaList.appendChild(item);
        });
    }


    function renderAgendaDatesEditor() {
        if (!agendaDatesList) return;
        agendaDatesList.innerHTML = '';
        const items = sortedEvents(agendaEvents);
        items.forEach((ev) => {
            const row = document.createElement('div');
            row.className = 'p-2 border rounded grid md:grid-cols-3 gap-2 items-center';
            const safeDate = typeof ev.date === 'string' ? ev.date.slice(0, 16) : '';
            row.innerHTML = `<div><strong>${ev.title}</strong><div class="text-sm text-muted">${ev.place}</div></div><div class="md:col-span-2"><input class="w-full" type="datetime-local" data-agenda-id="${ev.id}" value="${safeDate}" required /></div>`;
            agendaDatesList.appendChild(row);
        });
    }

    if (agendaAdminToggle && agendaAdminPanel) {
        agendaAdminToggle.addEventListener('click', async () => {
            if (!agendaAdminPassword) {
                const entered = prompt('Ingrese clave pastoral para editar la agenda:');
                if (!entered) return;
                const normalized = entered.trim();
                try {
                    const ok = await verifyAgendaPassword(normalized);
                    if (!ok) {
                        alert('Clave incorrecta.');
                        return;
                    }
                    agendaAdminPassword = normalized;
                } catch (err) {
                    alert('No hay conexion con el servidor de agenda. Abre la pagina desde http://localhost:3000/conocenos.html');
                    return;
                }
            }
            agendaAdminPanel.classList.toggle('hidden');
            renderAgendaDatesEditor();
        });
    }

    if (agendaDatesForm) {
        agendaDatesForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const dateInputs = Array.from(document.querySelectorAll('#agendaDatesList input[data-agenda-id]'));
            const dates = dateInputs.map(input => ({
                id: input.getAttribute('data-agenda-id'),
                date: input.value
            }));
            if (dates.some(d => !d.id || !d.date)) {
                alert('Verifica que todas las fechas estén completas.');
                return;
            }

            try {
                agendaEvents = await updateAgendaDates(dates);
                renderAgenda();
                renderAgendaDatesEditor();
                setAgendaStatus('Agenda actualizada y visible para todos.', true);
            } catch (err) {
                setAgendaStatus('No se pudo guardar. Verifica la clave o el servidor.', false);
            }
        });
    }

    if (agendaDatesReset) {
        agendaDatesReset.addEventListener('click', () => {
            renderAgendaDatesEditor();
        });
    }

    (async function initAgenda() {
        if (!agendaList) return;
        try {
            agendaEvents = await fetchAgendaEvents();
            renderAgenda();
            setAgendaStatus('Agenda sincronizada.', true);
        } catch (err) {
            setAgendaStatus('No se pudo conectar con la agenda compartida.', false);
            agendaList.innerHTML = '<div class="text-sm text-muted">Agenda no disponible temporalmente.</div>';
        }
    })();

    /* ==== Testimonials carousel ==== */
    const testimonials = [
        { text: 'Esta iglesia cambió mi vida. Encontré comunidad y propósito.', author: 'Ana' },
        { text: 'El ministerio de jóvenes ayudó a mi hijo a crecer en su fe.', author: 'Carlos' },
        { text: 'Mucha calidez y servicio; un lugar para toda la familia.', author: 'María' }
    ];
    let testiIndex = 0;
    const testiContainer = document.getElementById('testiContainer');
    const prevTesti = document.getElementById('prevTesti');
    const nextTesti = document.getElementById('nextTesti');

    function showTesti(i){
        if(!testiContainer) return;
        const t = testimonials[i];
        testiContainer.innerHTML = `<blockquote class="text-sm">"${t.text}"</blockquote><div class="testi-author">— ${t.author}</div>`;
    }
    if(testimonials.length && testiContainer){
        showTesti(testiIndex);
        let rotate = setInterval(()=>{ testiIndex = (testiIndex+1)%testimonials.length; showTesti(testiIndex); }, 5000);
        if(prevTesti) prevTesti.addEventListener('click', ()=>{ testiIndex = (testiIndex-1+testimonials.length)%testimonials.length; showTesti(testiIndex); });
        if(nextTesti) nextTesti.addEventListener('click', ()=>{ testiIndex = (testiIndex+1)%testimonials.length; showTesti(testiIndex); });
        // Pause rotation on hover
        testiContainer.addEventListener('mouseenter', ()=> clearInterval(rotate));
        testiContainer.addEventListener('mouseleave', ()=> rotate = setInterval(()=>{ testiIndex = (testiIndex+1)%testimonials.length; showTesti(testiIndex); }, 5000));
    }

});
