(() => {
    const currentScript = document.currentScript || document.querySelector('script[data-file]');
    const pageFile = currentScript && currentScript.dataset.file;
    const adminPassword = 'TRINIDAD2026';

    if (!pageFile) return;

    document.addEventListener('DOMContentLoaded', () => {
        const main = document.querySelector('main');
        const footer = document.querySelector('.site-footer .max-w-6xl');
        if (!main || !footer || !window.GitHubContent) return;

        const controls = document.createElement('section');
        controls.className = 'github-editor-tools';
        controls.innerHTML = `
            <button class="github-editor-trigger" type="button" aria-expanded="false">Administrar contenido</button>
            <div class="github-editor-panel" hidden>
                <form class="github-editor-login">
                    <label>Clave de administración
                        <input name="adminPassword" type="password" autocomplete="current-password" required />
                    </label>
                    <label>Token fine-grained de GitHub
                        <input name="githubToken" type="password" autocomplete="off" required />
                    </label>
                    <p class="github-editor-hint">El token necesita acceso a este repositorio y Contents: Read and write. <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Crear token fine-grained</a>. Solo se conserva mientras esta página está abierta.</p>
                    <button class="github-editor-action" type="submit">Conectar</button>
                </form>
                <div class="github-editor-session" hidden>
                    <p class="github-editor-status" role="status"></p>
                    <div class="github-editor-buttons">
                        <button class="github-editor-action github-editor-start" type="button">Editar página</button>
                        <button class="github-editor-action github-editor-save" type="button" hidden>Guardar en GitHub</button>
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
        let initialMainContent = '';
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

        trigger.addEventListener('click', () => {
            panel.hidden = !panel.hidden;
            trigger.setAttribute('aria-expanded', String(!panel.hidden));
        });

        login.addEventListener('submit', async event => {
            event.preventDefault();
            setError('');
            const password = login.elements.adminPassword.value;
            if (password !== adminPassword) {
                setError('La clave de administración no es correcta.');
                return;
            }

            const connectButton = login.querySelector('[type="submit"]');
            connectButton.disabled = true;
            try {
                const username = await window.GitHubContent.authenticate(login.elements.githubToken.value);
                login.reset();
                login.hidden = true;
                session.hidden = false;
                status.textContent = `Conectado como ${username}. Los cambios se guardarán en ${pageFile}.`;
            } catch (connectError) {
                setError(connectError.message || 'No se pudo conectar con GitHub.');
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
            reader.addEventListener('load', () => {
                window.GitHubContent.saveImage(String(reader.result || ''), file.name)
                    .then(filePath => {
                        selectedImage.setAttribute('src', filePath);
                        imageInput.value = '';
                        setError('');
                    })
                    .catch(uploadError => setError(uploadError.message || 'No se pudo subir la imagen a GitHub.'));
            });
            reader.addEventListener('error', () => setError('No se pudo leer la imagen seleccionada.'));
            reader.readAsDataURL(file);
        });

        saveButton.addEventListener('click', async () => {
            setError('');
            saveButton.disabled = true;
            try {
                const remoteFile = await window.GitHubContent.readFile(pageFile);
                const remoteDocument = new DOMParser().parseFromString(remoteFile.content, 'text/html');
                const remoteMain = remoteDocument.querySelector('main');
                if (!remoteMain) throw new Error('No se encontró el contenido principal del archivo en GitHub.');
                if (remoteMain.innerHTML !== initialMainContent) {
                    throw new Error('La página cambió en GitHub desde que la abriste. Recárgala antes de guardar para no sobrescribir trabajo reciente.');
                }

                remoteMain.innerHTML = main.innerHTML;
                const updatedPage = `<!doctype html>\n${remoteDocument.documentElement.outerHTML}\n`;
                await window.GitHubContent.saveFile(
                    pageFile,
                    updatedPage,
                    `Actualiza contenido de ${pageFile}`,
                    remoteFile.content
                );
                initialMainContent = main.innerHTML;
                setEditing(false);
                status.textContent = `Cambios guardados en GitHub. Pages publicará ${pageFile} en unos minutos.`;
            } catch (saveError) {
                setError(saveError.message || 'No se pudo guardar la página en GitHub.');
            } finally {
                saveButton.disabled = false;
            }
        });

        cancelButton.addEventListener('click', () => window.location.reload());
        logoutButton.addEventListener('click', () => {
            if (main.isContentEditable) {
                window.location.reload();
                return;
            }
            window.GitHubContent.clearSession();
            login.hidden = false;
            session.hidden = true;
            setError('');
        });
    });
})();