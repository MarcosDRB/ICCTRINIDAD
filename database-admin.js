(() => {
    async function request(url, options = {}) {
        const response = await fetch(url, {
            ...options,
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        let result = {};
        try {
            result = await response.json();
        } catch (error) {
            result = {};
        }

        if (!response.ok) {
            throw new Error(result.error || `El servidor respondió con error ${response.status}.`);
        }
        return result;
    }

    window.DatabaseAdmin = {
        request,
        login(password) {
            return request('/api/admin/login', {
                method: 'POST',
                body: JSON.stringify({ password })
            });
        },
        logout() {
            return request('/api/admin/logout', { method: 'POST' });
        },
        saveImage(dataUrl) {
            return request('/api/admin/images', {
                method: 'POST',
                body: JSON.stringify({ dataUrl })
            });
        }
    };
})();
