document.addEventListener('DOMContentLoaded', function () {

    // ===== Menú móvil =====
    const menuBtn = document.getElementById('menuBtn');
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            const nav = document.querySelector('header nav ul');
            if (nav) nav.classList.toggle('mobile-open');
        });
    }

    // ===== Botón volver arriba =====
    const back = document.createElement('button');
    back.className = 'back-to-top';
    back.innerHTML = '↑';
    document.body.appendChild(back);
    back.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) back.classList.add('show'); else back.classList.remove('show');
    });

    // ===== Reveal animations =====
    const revealItems = Array.from(document.querySelectorAll('.reveal'));
    function revealInViewport() {
        revealItems.forEach(el => {
            const r = el.getBoundingClientRect();
            if (r.top < window.innerHeight - 80) el.classList.add('visible');
        });
    }
    revealInViewport();
    setTimeout(revealInViewport, 700);
    window.addEventListener('scroll', revealInViewport);

    // ============================================
    // MODAL DE OPCIONES DE ENVÍO (WhatsApp / Correo)
    // ============================================
    const contactWhatsAppForm = document.getElementById('contactWhatsAppForm');
    const sendOptionsModal = document.getElementById('sendOptionsModal');
    const showSendOptionsBtn = document.getElementById('showSendOptions');
    const sendWhatsAppBtn = document.getElementById('sendWhatsApp');
    const sendEmailBtn = document.getElementById('sendEmail');
    const closeSendModalBtn = document.getElementById('closeSendModal');

    function closeSendModal() {
        if (sendOptionsModal) {
            sendOptionsModal.classList.add('hidden');
            sendOptionsModal.classList.remove('flex');
        }
    }

    // Mostrar modal al hacer clic en Enviar
    if (showSendOptionsBtn && contactWhatsAppForm) {
        showSendOptionsBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            if (!contactWhatsAppForm.checkValidity()) {
                contactWhatsAppForm.reportValidity();
                return;
            }

            const consentInput = document.getElementById('contactConsent');
            if (consentInput && !consentInput.checked) {
                alert('Debes aceptar la Política de Tratamiento de Datos Personales.');
                return;
            }

            if (sendOptionsModal) {
                sendOptionsModal.classList.remove('hidden');
                sendOptionsModal.classList.add('flex');
            }
        });
    }

    // Cerrar modal con botón Cancelar
    if (closeSendModalBtn) {
        closeSendModalBtn.addEventListener('click', closeSendModal);
    }

    // Enviar por WhatsApp
    if (sendWhatsAppBtn && contactWhatsAppForm) {
        sendWhatsAppBtn.addEventListener('click', function () {
            const target = String(contactWhatsAppForm.dataset.whatsapp || '').replace(/\D/g, '');
            const name = document.getElementById('contactName').value.trim();
            const email = document.getElementById('contactEmail').value.trim();
            const country = document.getElementById('contactCountry').value.trim();
            const topic = document.getElementById('contactTopic').value.trim();
            const message = document.getElementById('contactMessage').value.trim();

            if (!target) {
                alert('No hay un número de WhatsApp configurado.');
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

            closeSendModal();
        });
    }

    // Enviar por Correo (automático con FormSubmit via AJAX)
    if (sendEmailBtn && contactWhatsAppForm) {
        sendEmailBtn.addEventListener('click', async function () {
            const formData = new FormData(contactWhatsAppForm);

            const originalText = sendEmailBtn.innerHTML;
            sendEmailBtn.innerHTML = '⏳ Enviando...';
            sendEmailBtn.disabled = true;

            try {
                const response = await fetch('https://formsubmit.co/ajax/comunicaciones.icclatrinidad@gmail.com', {
                    method: 'POST',
                    headers: { 'Accept': 'application/json' },
                    body: formData
                });

                const result = await response.json();

                if (response.ok) {
                    alert('¡Mensaje enviado exitosamente!\n\nHemos recibido tu petición de oración. Dios te bendiga. - ICC La Trinidad');
                    contactWhatsAppForm.reset();
                    closeSendModal();
                } else {
                    alert('Hubo un error al enviar el mensaje.\n\nPor favor intenta de nuevo o usa la opción de WhatsApp.');
                    console.error('Error FormSubmit:', result);
                }
            } catch (error) {
                alert(' Error de conexión.\n\nPor favor intenta de nuevo o usa la opción de WhatsApp.');
                console.error('Error:', error);
            } finally {
                sendEmailBtn.innerHTML = originalText;
                sendEmailBtn.disabled = false;
            }
        });
    }

    // Cerrar modal al hacer clic fuera
    if (sendOptionsModal) {
        sendOptionsModal.addEventListener('click', function (e) {
            if (e.target === sendOptionsModal) {
                closeSendModal();
            }
        });
    }

});

// Hacer clickeables las imágenes de la galería de historias
document.querySelectorAll('.home-pdf-gallery-slot').forEach(slot => {
    slot.style.cursor = 'pointer';
    slot.addEventListener('click', function () {
        window.location.href = 'historias.html';
    });
});