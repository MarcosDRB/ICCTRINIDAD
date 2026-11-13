(() => {
    const currentScript = document.currentScript || document.querySelector('script[data-file]');
    const pageFile = currentScript && currentScript.dataset.file;
    const pageKey = pageFile && pageFile.replace(/\.html$/i, '');

    if (!pageKey || !/^[a-z]+$/i.test(pageKey)) return;

    document.addEventListener('DOMContentLoaded', async () => {
        const main = document.querySelector('main');
        const footer = document.querySelector('.site-footer .max-w-6xl');
        if (!main || !footer || !window.DatabaseAdmin) return;

        function structureSignature(html) {
            const container = document.createElement('main');
            container.innerHTML = html;
            function describe(node) {
                return Array.from(node.children, child => ({
                    tag: child.tagName,
                    id: child.id,
                    className: child.className,
                    children: describe(child)
                }));
            }
            return JSON.stringify(describe(container));
        }

        const templateContent = main.innerHTML;
        const templateSignature = structureSignature(templateContent);
        let pageRevision = 0;
        let pageLoadError = '';
        try {
            const page = await window.DatabaseAdmin.request(`/api/pages/${encodeURIComponent(pageKey)}`);
            if (typeof page.contentHtml !== 'string' || !Number.isSafeInteger(page.revision)) {
                throw new Error('El servidor devolvió datos de página no válidos.');
            }
            if (structureSignature(page.contentHtml) !== templateSignature) {
                throw new Error('El contenido guardado no coincide con la estructura visual publicada. Se conservó la versión del sitio.');
            }
            main.innerHTML = page.contentHtml;
            pageRevision = page.revision;
        } catch (error) {
            pageLoadError = error.message || 'No se pudo cargar el contenido guardado.';
        }

        const controls = document.createElement('section');
        controls.className = 'github-editor-tools';
        controls.innerHTML = `
            <button class="github-editor-trigger" type="button" aria-expanded="false">Administrar contenido</button>
            <div class="github-editor-panel" hidden>
                <form class="github-editor-login">
                    <label>Clave de administración
                        <input name="adminPassword" type="password" autocomplete="current-password" required />
                    </label>
                    <p class="github-editor-hint">Los cambios se guardan en la base de datos del sitio.</p>
                    <button class="github-editor-action" type="submit">Iniciar sesión</button>
                </form>
                <div class="github-editor-session" hidden>
                    <p class="github-editor-status" role="status"></p>
                    <div class="github-editor-buttons">
                        <button class="github-editor-action github-editor-start" type="button">Editar página</button>
                        <button class="github-editor-action github-editor-save" type="button" hidden>Guardar cambios</button>
                        <button class="github-editor-action github-editor-cancel" type="button" hidden>Cancelar edición</button>
                        <button class="github-editor-logout" type="button">Cerrar sesión</button>
                    </div>
                    <input class="github-editor-image-input" type="file" accept="image/jpeg,image/png,image/webp" hidden />
                </div>
                <p class="github-editor-error" role="alert" hidden></p>
            </div>
        `;
        footer.append(controls);

        const trigger = controls.querySelector('.github-editor-trigger');
        const panel = controls.querySelector('.github-editor-panel');
        const login = controls.querySelector('.github-editor-login');
        const session = controls.querySelector('.github-editor-session');
        const status = controls.querySelector('.github-editor-status');
        const error = controls.querySelector('.github-editor-error');
        const startButton = controls.querySelector('.github-editor-start');
        const saveButton = controls.querySelector('.github-editor-save');
        const cancelButton = controls.querySelector('.github-editor-cancel');
        const logoutButton = controls.querySelector('.github-editor-logout');
        const imageInput = controls.querySelector('.github-editor-image-input');
        let initialMainContent = main.innerHTML;
        let selectedImage = null;

        function setError(message) {
            error.textContent = message;
            error.hidden = !message;
        }

        function setEditing(isEditing) {
            main.contentEditable = String(isEditing);
            main.classList.toggle('github-editor-editing', isEditing);
            startButton.hidden = isEditing;
            saveButton.hidden = !isEditing;
            cancelButton.hidden = !isEditing;
            status.textContent = isEditing
                ? 'Edita el texto directamente. Haz doble clic en una imagen o video para cambiarlo.'
                : status.textContent;
        }

        if (pageLoadError) setError(`No se pudo sincronizar el contenido con la base de datos: ${pageLoadError}`);

        trigger.addEventListener('click', () => {
            panel.hidden = !panel.hidden;
            trigger.setAttribute('aria-expanded', String(!panel.hidden));
        });

        login.addEventListener('submit', async event => {
            event.preventDefault();
            setError('');
            const connectButton = login.querySelector('[type="submit"]');
            connectButton.disabled = true;
            try {
                await window.DatabaseAdmin.login(login.elements.adminPassword.value);
                login.reset();
                login.hidden = true;
                session.hidden = false;
                status.textContent = `Sesión iniciada. Editando ${pageFile}; los cambios se guardarán en la base de datos.`;
            } catch (loginError) {
                setError(loginError.message || 'No se pudo iniciar sesión.');
            } finally {
                connectButton.disabled = false;
            }
        });

        startButton.addEventListener('click', () => {
            initialMainContent = main.innerHTML;
            setError('');
            setEditing(true);
        });

        main.addEventListener('click', event => {
            if (!main.isContentEditable) return;
            if (event.target.closest('a, button')) event.preventDefault();
        });

        main.addEventListener('dblclick', event => {
            if (!main.isContentEditable) return;
            const leaderCard = event.target.closest('.leader-card');
            if (leaderCard) {
                event.preventDefault();
                const name = window.prompt('Nombre de la persona:', leaderCard.dataset.name || '');
                if (name === null) return;
                const role = window.prompt('Cargo o función:', leaderCard.dataset.role || '');
                if (role === null) return;
                const bio = window.prompt('Descripción breve:', leaderCard.dataset.bio || '');
                if (bio === null) return;
                leaderCard.dataset.name = name.trim();
                leaderCard.dataset.role = role.trim();
                leaderCard.dataset.bio = bio.trim();
                return;
            }

            const image = event.target.closest('img');
            if (image) {
                event.preventDefault();
                selectedImage = image;
                imageInput.click();
                return;
            }

            const video = event.target.closest('iframe');
            if (video) {
                event.preventDefault();
                const nextSource = window.prompt('URL de inserción del video:', video.getAttribute('src') || '');
                if (nextSource === null) return;
                try {
                    const parsedUrl = new URL(nextSource.trim());
                    if (!['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com', 'player.vimeo.com'].includes(parsedUrl.hostname)) {
                        throw new Error('Usa un enlace de inserción de YouTube o Vimeo.');
                    }
                    video.setAttribute('src', parsedUrl.href);
                } catch (videoError) {
                    setError(videoError.message || 'La URL del video no es válida.');
                }
            }
        });

        imageInput.addEventListener('change', () => {
            const [file] = imageInput.files || [];
            if (!file || !selectedImage) return;
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
                imageInput.value = '';
                setError('Selecciona JPG, PNG o WebP de máximo 5 MB.');
                return;
            }

            const reader = new FileReader();
            reader.addEventListener('load', async () => {
                try {
                    const result = await window.DatabaseAdmin.saveImage(String(reader.result || ''));
                    selectedImage.setAttribute('src', result.path);
                    imageInput.value = '';
                    setError('');
                } catch (uploadError) {
                    setError(uploadError.message || 'No se pudo guardar la imagen en la base de datos.');
                }
            });
            reader.addEventListener('error', () => setError('No se pudo leer la imagen seleccionada.'));
            reader.readAsDataURL(file);
        });

        saveButton.addEventListener('click', async () => {
            setError('');
            if (structureSignature(main.innerHTML) !== templateSignature) {
                setError('No se guardaron los cambios porque alteran la estructura visual de la página. Conserva sus secciones y clases; puedes editar textos, imágenes y videos.');
                return;
            }
            saveButton.disabled = true;
            try {
                const result = await window.DatabaseAdmin.request(`/api/pages/${encodeURIComponent(pageKey)}`, {
                    method: 'PUT',
                    body: JSON.stringify({ contentHtml: main.innerHTML, expectedRevision: pageRevision })
                });
                pageRevision = result.revision;
                initialMainContent = main.innerHTML;
                setEditing(false);
                status.textContent = `Cambios de ${pageFile} guardados en la base de datos.`;
            } catch (saveError) {
                setError(saveError.message || 'No se pudo guardar la página.');
            } finally {
                saveButton.disabled = false;
            }
        });

        cancelButton.addEventListener('click', () => {
            main.innerHTML = initialMainContent;
            setEditing(false);
            setError('');
        });

        logoutButton.addEventListener('click', async () => {
            try {
                await window.DatabaseAdmin.logout();
                login.hidden = false;
                session.hidden = true;
                setError('');
            } catch (logoutError) {
                setError(logoutError.message || 'No se pudo cerrar la sesión.');
            }
        });
    });
})();
