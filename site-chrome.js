/**
 * Cabecera y pie de página compartidos.
 *
 * Cada página incluye los marcadores `<div data-site-header></div>`,
 * `<div data-site-footer></div>` y, donde aplica, `<div data-leader-modal></div>`
 * y `<div data-image-modal></div>`; este script los reemplaza por el mismo markup
 * en todo el sitio y marca el enlace de la página actual.
 */
(function () {
    'use strict';

    var BRAND = {
        home: 'index.html',
        name: 'Iglesia Comunidad Cristiana La Trinidad',
        tagline: 'Adorar · Crecer · Servir',
        logo: 'media/BRANDING - ICC LA TRINIDAD/1.png',
        logoAlt: 'Logo ICC La Trinidad'
    };

    var CONTACT = {
        address: 'CLL 81 # 18D-21, 2do Piso, Los Almendros',
        email: 'c.c.latrinidad@hotmail.com'
    };

    var NAV_LINKS = [
        { href: 'index.html', label: 'Inicio' },
        { href: 'conocenos.html', label: 'Conócenos' },
        { href: 'eventos.html', label: 'Eventos' },
        { href: 'predicas.html', label: 'Prédicas' },
        { href: 'liderazgo.html', label: 'Liderazgo' },
        { href: 'grupos.html', label: 'Grupos' },
        { href: 'testimonios.html', label: 'Testimonios' },
        { href: 'historias.html', label: 'Historias' },
        { href: 'diezmos.html', label: 'Diezmos' }
    ];

    var SOCIAL_LINKS = [
        {
            name: 'facebook',
            title: 'Facebook',
            href: 'https://www.facebook.com/comunidad.latrinidad',
            svg: '<svg viewBox="0 0 24 24" fill="#1877F2" xmlns="http://www.w3.org/2000/svg">' +
                '<path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.026 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.971H15.83c-1.491 0-1.956.931-1.956 1.886v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />' +
                '</svg>'
        },
        {
            name: 'instagram',
            title: 'Instagram',
            href: 'https://www.instagram.com/icc.latrinidad',
            svg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
                '<defs><linearGradient id="igGrad" x1="0" y1="0" x2="1" y2="1">' +
                '<stop offset="0%" stop-color="#f58529" />' +
                '<stop offset="25%" stop-color="#dd2a7b" />' +
                '<stop offset="55%" stop-color="#8134af" />' +
                '<stop offset="75%" stop-color="#515bd4" />' +
                '<stop offset="100%" stop-color="#3897f0" />' +
                '</linearGradient></defs>' +
                '<path fill="url(#igGrad)" d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.336 3.608 1.311.975.975 1.249 2.242 1.311 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.336 2.633-1.311 3.608-.975.975-2.242 1.249-3.608 1.311-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.336-3.608-1.311-.975-.975-1.249-2.242-1.311-3.608C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.85c.062-1.366.336-2.633 1.311-3.608.975-.975 2.242-1.249 3.608-1.311C8.416 2.175 8.796 2.163 12 2.163zm0 1.802c-3.148 0-3.521.012-4.763.069-1.151.052-1.776.245-2.192.407-.551.215-.944.472-1.357.885-.413.413-.67.806-.885 1.357-.162.416-.355 1.041-.407 2.192-.057 1.242-.069 1.615-.069 4.763s.012 3.521.069 4.763c.052 1.151.245 1.776.407 2.192.215.551.472.944.885 1.357.413.413.806.67 1.357.885.416.162 1.041.355 2.192.407 1.242.057 1.615.069 4.763.069s3.521-.012 4.763-.069c1.151-.052 1.776-.245 2.192-.407.551-.215.944-.472 1.357-.885.413-.413.67-.806.885-1.357.162-.416.355-1.041.407-2.192.057-1.242.069-1.615.069-4.763s-.012-3.521-.069-4.763c-.052-1.151-.245-1.776-.407-2.192-.215-.551-.472-.944-.885-1.357-.413-.413-.806-.67-1.357-.885-.416-.162-1.041-.355-2.192-.407-1.242-.057-1.615-.069-4.763-.069zm0 2.474a5.561 5.561 0 100 11.122 5.561 5.561 0 000-11.122zm0 9.167a3.606 3.606 0 110-7.212 3.606 3.606 0 010 7.212zm7.097-9.393a1.3 1.3 0 11-2.6 0 1.3 1.3 0 012.6 0z" />' +
                '</svg>'
        },
        {
            name: 'youtube',
            title: 'YouTube',
            href: 'https://youtube.com/@icc.latrinidad',
            svg: '<svg viewBox="0 0 24 24" fill="#FF0000" xmlns="http://www.w3.org/2000/svg">' +
                '<path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.87.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />' +
                '</svg>'
        }
    ];

    function currentPage() {
        var file = window.location.pathname.split('/').pop();
        return file ? file : 'index.html';
    }

    function navMarkup() {
        var active = currentPage();
        return NAV_LINKS.map(function (link) {
            var classes = 'nav-link hover:underline' + (link.href === active ? ' active' : '');
            var current = link.href === active ? ' aria-current="page"' : '';
            return '<li><a class="' + classes + '" href="' + link.href + '"' + current + '>' + link.label + '</a></li>';
        }).join('');
    }

    function headerMarkup() {
        return '<header class="brand-bg text-white home-topbar">' +
            '<div class="max-w-6xl mx-auto flex items-center justify-between p-4 home-topbar-inner">' +
            '<a href="' + BRAND.home + '" class="flex items-center gap-3 home-brand-link" aria-label="Inicio ICC La Trinidad">' +
            '<img src="' + BRAND.logo + '" alt="' + BRAND.logoAlt + '" class="h-16 w-16 object-contain rounded" />' +
            '<div>' +
            '<h1 class="text-xl font-semibold">' + BRAND.name + '</h1>' +
            '<p class="text-sm opacity-75">' + BRAND.tagline + '</p>' +
            '</div>' +
            '</a>' +
            '<nav>' +
            '<ul class="hidden md:flex gap-6 items-center">' + navMarkup() + '</ul>' +
            '</nav>' +
            '<button id="menuBtn" class="md:hidden p-2 border rounded" type="button" aria-label="Abrir menú">Menú</button>' +
            '</div>' +
            '</header>';
    }

    function socialMarkup() {
        return SOCIAL_LINKS.map(function (social, index) {
            var style = index === 0 ? '' : ' style="margin-left:8px"';
            return '<a class="social-btn" href="' + social.href + '" aria-label="' + social.name + '"' +
                ' title="' + social.title + '"' + style + '>' + social.svg + '</a>';
        }).join('');
    }

    function footerMarkup() {
        return '<footer class="site-footer">' +
            '<div class="max-w-6xl mx-auto text-center">' +
            '<div class="text-sm">' + BRAND.name + ' - Todos los derechos reservados</div>' +
            '<div class="text-sm mt-2">📍 ' + CONTACT.address + ' | ' + CONTACT.email + '</div>' +
            '<div class="social-icons mt-3">' + socialMarkup() + '</div>' +
            '</div>' +
            '</footer>';
    }

    function imageModalMarkup() {
        return '<div id="imageModal" class="fixed inset-0 bg-black/60 hidden items-center justify-center p-4">' +
            '<div class="img-frame bg-white rounded shadow">' +
            '<button class="close-image-modal float-right p-2" type="button">Cerrar</button>' +
            '<img src="" alt="" />' +
            '<div class="img-caption"></div>' +
            '</div>' +
            '</div>';
    }

    function leaderModalMarkup() {
        return '<div id="leaderModal" class="fixed inset-0 bg-black/50 hidden items-center justify-center p-4">' +
            '<div class="bg-white rounded shadow max-w-lg w-full p-6">' +
            '<button id="closeModal" class="float-right" type="button">Cerrar</button>' +
            '<h4 id="modalName" class="text-xl font-semibold"></h4>' +
            '<div id="modalRole" class="text-sm text-gray-600"></div>' +
            '<p id="modalBio" class="mt-4 text-sm"></p>' +
            '</div>' +
            '</div>';
    }

    function mount(selector, markup) {
        var placeholder = document.querySelector(selector);
        if (placeholder) placeholder.outerHTML = markup;
    }

    function render() {
        mount('[data-site-header]', headerMarkup());
        mount('[data-site-footer]', footerMarkup());
        mount('[data-leader-modal]', leaderModalMarkup());
        mount('[data-image-modal]', imageModalMarkup());
    }

    window.SiteChrome = {
        BRAND: BRAND,
        CONTACT: CONTACT,
        NAV_LINKS: NAV_LINKS,
        SOCIAL_LINKS: SOCIAL_LINKS,
        headerMarkup: headerMarkup,
        footerMarkup: footerMarkup,
        leaderModalMarkup: leaderModalMarkup,
        imageModalMarkup: imageModalMarkup,
        render: render
    };

    // Se pinta de inmediato cuando los marcadores ya existen (script al final del
    // body) y, si no, al terminar de cargar el documento.
    render();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', render);
    }
})();
