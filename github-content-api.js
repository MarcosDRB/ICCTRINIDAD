(() => {
    const repository = 'MarcosDRB/ICCTRINIDAD';
    const branch = 'main';
    const apiRoot = 'https://api.github.com';
    let token = '';

    function requestHeaders() {
        return {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${token}`,
            'X-GitHub-Api-Version': '2022-11-28'
        };
    }

    async function request(url, options = {}) {
        const response = await fetch(url, {
            ...options,
            headers: { ...requestHeaders(), ...options.headers }
        });
        let result = {};
        try {
            result = await response.json();
        } catch (error) {
            result = {};
        }
        if (response.status === 401) token = '';
        if (!response.ok) {
            throw new Error(result.message || `GitHub respondió con error ${response.status}.`);
        }
        return result;
    }

    function encodePath(filePath) {
        return filePath.split('/').map(encodeURIComponent).join('/');
    }

    function decodeBase64(value) {
        const binary = atob(value.replace(/\s/g, ''));
        const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
        return new TextDecoder().decode(bytes);
    }

    function encodeBase64(value) {
        const bytes = new TextEncoder().encode(value);
        let binary = '';
        const chunkSize = 0x8000;
        for (let offset = 0; offset < bytes.length; offset += chunkSize) {
            binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
        }
        return btoa(binary);
    }

    async function readFile(filePath) {
        const file = await request(
            `${apiRoot}/repos/${repository}/contents/${encodePath(filePath)}?ref=${branch}`
        );
        if (file.type !== 'file' || typeof file.content !== 'string') {
            throw new Error('GitHub no devolvió un archivo editable.');
        }
        return { content: decodeBase64(file.content), sha: file.sha };
    }

    async function authenticate(candidateToken) {
        token = candidateToken.trim();
        try {
            const [user, repo] = await Promise.all([
                request(`${apiRoot}/user`),
                request(`${apiRoot}/repos/${repository}`)
            ]);
            const permissions = repo.permissions || {};
            if (!(permissions.push || permissions.admin || permissions.maintain)) {
                throw new Error('El token no tiene permiso de escritura en este repositorio.');
            }
            return user.login;
        } catch (error) {
            token = '';
            throw error;
        }
    }

    async function saveFile(filePath, content, message, expectedContent) {
        if (!token) throw new Error('La sesión de GitHub expiró. Vuelve a conectarte.');
        const currentFile = await readFile(filePath);
        if (expectedContent !== undefined && currentFile.content !== expectedContent) {
            throw new Error('Este archivo cambió en GitHub desde que lo abriste. Recarga la página antes de guardar.');
        }
        if (currentFile.content === content) return { unchanged: true };

        return request(`${apiRoot}/repos/${repository}/contents/${encodePath(filePath)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                content: encodeBase64(content),
                sha: currentFile.sha,
                branch
            })
        });
    }

    async function saveImage(dataUrl, originalName) {
        const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
        if (!match) throw new Error('La imagen seleccionada no tiene un formato compatible.');
        const extension = match[1] === 'jpeg' ? 'jpg' : match[1];
        const baseName = String(originalName || 'imagen')
            .replace(/\.[^.]+$/, '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9_-]/g, '-')
            .replace(/-+/g, '-')
            .slice(0, 40) || 'imagen';
        const filePath = `media/admin-uploads/${Date.now()}-${baseName}.${extension}`;
        await request(`${apiRoot}/repos/${repository}/contents/${encodePath(filePath)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: `Agrega imagen: ${baseName}`,
                content: match[2],
                branch
            })
        });
        return filePath;
    }

    window.GitHubContent = {
        authenticate,
        readFile,
        saveFile,
        saveImage,
        clearSession() {
            token = '';
        }
    };
})();