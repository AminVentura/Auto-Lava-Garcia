/**
 * Auto Lava Garcia & Antojos Bar Lounge - Main JS
 */

document.addEventListener('DOMContentLoaded', () => {
    initMobileNav();
    initScrollEffects();
    initExpandDetailsLabels();
    initReservarForm();
    initPedidoForm();
    initFooterLastUpdated();
    initGalleryLightbox();
    initAdSenseSlots();
    initDynamicOffers();
    initDynamicMenu();
    initDynamicWashServices();
});

const GITHUB_DATA_BASE = 'https://raw.githubusercontent.com/AminVentura/Auto-Lava-Garcia/main';

/** Texto del summary en bloques <details> de información del local */
function initExpandDetailsLabels() {
    const expandLabel = 'Ampliar texto';
    const collapseLabel = 'Contraer texto';

    document.querySelectorAll('.info-expand-details').forEach((det) => {
        const label = det.querySelector('.info-expand-summary__text');
        if (!label) return;

        const sync = () => {
            label.textContent = det.open ? collapseLabel : expandLabel;
        };

        det.addEventListener('toggle', sync);
        sync();
    });
}

/**
 * AdSense: sin huecos vacíos. Solo se muestra el bloque cuando hay slot numérico real
 * y el anuncio se renderiza (iframe). Placeholder XXXXXXXX = sin push ni espacio.
 */
function initAdSenseSlots() {
    document.querySelectorAll('.ad-container').forEach((container) => {
        const ins = container.querySelector('ins.adsbygoogle');
        if (!ins) return;

        const slot = (ins.getAttribute('data-ad-slot') || '').trim();
        const slotOk = /^\d+$/.test(slot);

        if (!slotOk) {
            container.classList.add('ad-container--inactive');
            return;
        }

        container.classList.add('ad-container--pending');

        const reveal = () => {
            container.classList.remove('ad-container--pending');
            container.classList.add('ad-container--visible');
        };

        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch {
            container.classList.remove('ad-container--pending');
            container.classList.add('ad-container--inactive');
            return;
        }

        const hasRenderedAd = () =>
            Boolean(ins.querySelector('iframe')) || ins.offsetHeight > 24;

        if (hasRenderedAd()) {
            reveal();
            return;
        }

        const mo = new MutationObserver(() => {
            if (hasRenderedAd()) {
                reveal();
                mo.disconnect();
            }
        });
        mo.observe(ins, { childList: true, subtree: true });

        const t = window.setInterval(() => {
            if (hasRenderedAd()) {
                reveal();
                window.clearInterval(t);
                mo.disconnect();
            }
        }, 400);

        window.setTimeout(() => {
            window.clearInterval(t);
            mo.disconnect();
            if (!hasRenderedAd()) {
                container.classList.remove('ad-container--pending');
                container.classList.add('ad-container--inactive');
            }
        }, 20000);
    });
}

function dataSourceCandidates(url) {
    if (!url.startsWith('/data/')) return [url];
    return [
        GITHUB_DATA_BASE + url + '?v=' + Date.now(),
        url
    ];
}

async function backfillOfferImages(remoteData, localUrl) {
    const offers = Array.isArray(remoteData?.ofertas) ? remoteData.ofertas : [];
    const hasMissingImages = offers.some((offer) => !String(offer.imagen_base64 || '').trim());
    if (!hasMissingImages) return remoteData;

    try {
        const response = await fetch(localUrl, {
            cache: 'no-store',
            headers: { 'accept': 'application/json' }
        });
        if (!response.ok) return remoteData;
        const localData = await response.json();
        const localImages = new Map(
            (localData.ofertas || [])
                .filter((offer) => offer.id && String(offer.imagen_base64 || '').trim())
                .map((offer) => [offer.id, offer.imagen_base64])
        );

        return {
            ...remoteData,
            ofertas: offers.map((offer) => ({
                ...offer,
                imagen_base64: String(offer.imagen_base64 || '').trim() || localImages.get(offer.id) || ''
            }))
        };
    } catch {
        return remoteData;
    }
}

function hasSuspiciousPesoPrice(item) {
    return ['precio_centavos', 'precio_min_centavos', 'precio_max_centavos'].some((key) => (
        typeof item?.[key] === 'number' && item[key] > 0 && item[key] < 1000
    ));
}

async function backfillStaticPrices(remoteData, localUrl, collectionKey) {
    const remoteItems = Array.isArray(remoteData?.[collectionKey]) ? remoteData[collectionKey] : [];
    if (!remoteItems.some(hasSuspiciousPesoPrice)) return remoteData;

    try {
        const response = await fetch(localUrl, {
            cache: 'no-store',
            headers: { 'accept': 'application/json' }
        });
        if (!response.ok) return remoteData;
        const localData = await response.json();
        const localById = new Map((localData[collectionKey] || []).map((item) => [item.id, item]));
        const priceKeys = ['precio_centavos', 'precio_min_centavos', 'precio_max_centavos'];

        return {
            ...remoteData,
            [collectionKey]: remoteItems.map((item) => {
                const localItem = localById.get(item.id);
                if (!localItem) return item;
                const nextItem = { ...item };
                priceKeys.forEach((key) => {
                    if (
                        typeof item[key] === 'number' &&
                        item[key] > 0 &&
                        item[key] < 1000 &&
                        Number.isInteger(localItem[key]) &&
                        localItem[key] >= 1000
                    ) {
                        nextItem[key] = localItem[key];
                    }
                });
                return nextItem;
            })
        };
    } catch {
        return remoteData;
    }
}

async function fetchJson(url) {
    let lastError;
    for (const candidate of dataSourceCandidates(url)) {
        try {
            const response = await fetch(candidate, {
                cache: 'no-store',
                headers: { 'accept': 'application/json' }
            });
            if (!response.ok) throw new Error('No se pudo cargar ' + candidate);
            const data = await response.json();
            if (url === '/data/ofertas.json' && candidate !== url) {
                return backfillOfferImages(data, url);
            }
            if (url === '/data/lavado_precios.json' && candidate !== url) {
                return backfillStaticPrices(data, url, 'servicios');
            }
            if (url === '/data/menu_restaurante.json' && candidate !== url) {
                return backfillStaticPrices(data, url, 'articulos');
            }
            return data;
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError || new Error('No se pudo cargar ' + url);
}

function formatOfferDate(value) {
    const isoValue = /^\d{2}\/\d{2}\/\d{4}$/.test(value) ? rdDateToIso(value) : value;
    return new Date(isoValue + 'T12:00:00').toLocaleDateString('es-DO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    })[char]);
}

function rdDateToIso(value) {
    const match = String(value || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return '';
    return match[3] + '-' + match[2] + '-' + match[1];
}

function parseRdDate(value, endOfDay) {
    const iso = rdDateToIso(value);
    if (!iso) return null;
    return new Date(iso + (endOfDay ? 'T23:59:59' : 'T00:00:00'));
}

function isStaticOfferActive(offer, now = new Date()) {
    if (!offer.publicada) return false;
    const start = parseRdDate(offer.fecha_inicio, false);
    const end = parseRdDate(offer.fecha_fin, true);
    if (!start || !end) return false;
    return start <= now && now <= end;
}

function formatStaticPrice(service) {
    if (service.etiqueta) return service.etiqueta;
    const centsToPesos = (cents) => {
        const pesos = Number(cents || 0) / 100;
        return pesos.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    if (Number.isInteger(service.precio_centavos)) return 'RD$' + centsToPesos(service.precio_centavos);
    if (Number.isInteger(service.precio_min_centavos) && Number.isInteger(service.precio_max_centavos)) {
        return 'RD$' + centsToPesos(service.precio_min_centavos) + '-' + centsToPesos(service.precio_max_centavos);
    }
    if (Number.isInteger(service.precio_min_centavos)) return 'RD$' + centsToPesos(service.precio_min_centavos) + '+';
    return 'Consultar en oficina';
}

async function initDynamicOffers() {
    const grid = document.querySelector('[data-offers-grid]');
    if (!grid) return;

    try {
        const data = await fetchJson('/data/ofertas.json');
        const offers = (data.ofertas || [])
            .filter((offer) => isStaticOfferActive(offer))
            .sort((a, b) => (a.orden || 0) - (b.orden || 0) || String(a.titulo || '').localeCompare(String(b.titulo || ''), 'es'));
        if (offers.length === 0) {
            grid.innerHTML = '<p class="ofertas-antojos__empty">Pregunta por el plato del día y las ofertas disponibles en caja.</p>';
            return;
        }

        grid.innerHTML = offers.map((offer) => {
            const title = escapeHtml(offer.titulo);
            const description = escapeHtml(offer.descripcion || '');
            const image = String(offer.imagen_base64 || '').trim();
            const message = encodeURIComponent('Hola, quiero ordenar o preguntar por esta oferta: ' + offer.titulo + '\nhttps://antojosbarlounge.com/#ofertas-antojos');
            return (
                '<article class="oferta-card">' +
                    (image
                        ? '<img src="' + image + '" alt="' + title + '" loading="lazy" decoding="async">'
                        : '<div class="oferta-card__image-placeholder" aria-hidden="true">Antojos</div>') +
                    '<div class="oferta-card__body">' +
                        '<span class="oferta-card__badge">Oferta por tiempo limitado</span>' +
                        '<h4 class="oferta-card__title">' + title + '</h4>' +
                        '<p class="oferta-card__description">' + description + '</p>' +
                        '<p class="oferta-card__date">Disponible hasta el ' + formatOfferDate(offer.fecha_fin) + '</p>' +
                        '<a class="oferta-card__cta" href="https://wa.me/18097941824?text=' + message + '" target="_blank" rel="noopener" aria-label="Ordenar por WhatsApp ' + title + '">Ordenar por WhatsApp</a>' +
                    '</div>' +
                '</article>'
            );
        }).join('');
    } catch (error) {
        grid.innerHTML = '<p class="ofertas-antojos__empty">Ofertas temporales no disponibles. Pregunta en caja.</p>';
    }
}

async function initDynamicMenu() {
    const menuGrid = document.querySelector('.menu-grid');
    const pedidoGrid = document.querySelector('.pedido-grid');
    if (!menuGrid) return;

    try {
        const data = await fetchJson('/data/menu_restaurante.json');
        const items = (data.articulos || [])
            .filter((item) => item.disponible)
            .sort((a, b) => (a.orden || 0) - (b.orden || 0) || String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'))
            .map((item) => ({ ...item, priceText: formatStaticPrice(item) }));
        if (items.length === 0) return;

        const grouped = items.reduce((acc, item) => {
            if (!acc[item.categoria]) acc[item.categoria] = [];
            acc[item.categoria].push(item);
            return acc;
        }, {});

        menuGrid.innerHTML = Object.entries(grouped).map(([category, entries]) => (
            '<div class="menu-category">' +
                '<h3>' + escapeHtml(category) + '</h3>' +
                '<ul>' +
                    entries.map((item) => '<li>' + escapeHtml(item.nombre) + '<span class="menu-price-dynamic"> · ' + escapeHtml(item.priceText) + '</span></li>').join('') +
                '</ul>' +
            '</div>'
        )).join('');

        if (pedidoGrid) {
            pedidoGrid.innerHTML = Object.entries(grouped)
                .filter(([category]) => category !== 'Mercancías')
                .map(([category, entries]) => (
                    '<div class="pedido-categoria">' +
                        '<h4>' + escapeHtml(category.replace('Antojos (', '').replace(')', '')) + '</h4>' +
                        '<div class="pedido-items">' +
                            entries.map((item) => '<label><input type="checkbox" name="pedido" value="' + escapeHtml(item.nombre) + '"> ' + escapeHtml(item.nombre) + '</label>').join('') +
                        '</div>' +
                    '</div>'
                )).join('');
        }
    } catch {
        // Static menu remains available if JSON cannot be loaded.
    }
}

async function initDynamicWashServices() {
    const select = document.getElementById('tipo-lavado');
    const servicesGrid = document.querySelector('#lavadero .services-grid');
    if (!select && !servicesGrid) return;

    try {
        const data = await fetchJson('/data/lavado_precios.json');
        const services = (data.servicios || [])
            .filter((service) => service.disponible)
            .sort((a, b) => (a.orden || 0) - (b.orden || 0) || String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'))
            .map((service) => ({ ...service, priceText: formatStaticPrice(service) }));
        if (services.length === 0) return;

        if (select) {
            const first = select.querySelector('option[value=""]');
            select.innerHTML = '';
            if (first) select.appendChild(first);

            services.forEach((service) => {
                const option = document.createElement('option');
                option.value = service.nombre + ' - ' + service.priceText;
                option.textContent = service.nombre + ' — ' + service.priceText;
                select.appendChild(option);
            });
        }

        if (servicesGrid) {
            const iconByCategory = {
                'Lavado Normal Exterior': '🚗',
                'Ofertas del Martes': '💰',
                'Lavado por Debajo': '⬇️',
                'Lavado del Motor': '🔧',
                'Servicios Premium': '✨'
            };
            const grouped = services.reduce((acc, service) => {
                if (!acc[service.categoria]) acc[service.categoria] = [];
                acc[service.categoria].push(service);
                return acc;
            }, {});

            servicesGrid.innerHTML = Object.entries(grouped).map(([category, entries]) => (
                '<article class="service-card">' +
                    '<div class="service-icon">' + (iconByCategory[category] || '📋') + '</div>' +
                    '<h3>' + escapeHtml(category) + '</h3>' +
                    '<ul class="price-list">' +
                        entries.map((service) => '<li><strong>' + escapeHtml(service.nombre) + ':</strong> ' + escapeHtml(service.priceText) + '</li>').join('') +
                    '</ul>' +
                '</article>'
            )).join('');
        }
    } catch {
        // Static reservation prices remain available if the API is not configured.
    }
}

/** Fecha de última modificación del HTML en formato RD (requiere atributo data-auto-date). */
function initFooterLastUpdated() {
    document.querySelectorAll('[data-auto-date]').forEach((el) => {
        const d = new Date(document.lastModified);
        if (Number.isNaN(d.getTime())) return;
        el.textContent =
            'Última actualización: ' +
            d.toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' });
    });
}

function initGalleryLightbox() {
    const root = document.getElementById('gallery-lightbox');
    const imgEl = root?.querySelector('.gallery-lightbox-img');
    const closeBtn = root?.querySelector('.gallery-lightbox-close');
    const triggers = document.querySelectorAll('.gallery-trigger');

    if (!root || !imgEl || !closeBtn || triggers.length === 0) return;

    let lastFocus = null;

    const open = (src, alt) => {
        lastFocus = document.activeElement;
        imgEl.src = src;
        imgEl.alt = alt || '';
        root.hidden = false;
        document.body.style.overflow = 'hidden';
        closeBtn.focus();
    };

    const close = () => {
        root.hidden = true;
        imgEl.removeAttribute('src');
        imgEl.alt = '';
        document.body.style.overflow = '';
        if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
        lastFocus = null;
    };

    triggers.forEach((btn) => {
        btn.addEventListener('click', () => {
            const picture = btn.querySelector('img');
            if (!picture?.src) return;
            open(picture.currentSrc || picture.src, picture.alt || '');
        });
    });

    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        close();
    });

    root.addEventListener('click', (e) => {
        if (e.target === root) close();
    });

    imgEl.addEventListener('click', (e) => e.stopPropagation());

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !root.hidden) close();
    });
}

function initMobileNav() {
    const toggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (!toggle || !navLinks) return;

    toggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        toggle.classList.toggle('active');
        document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
    });

    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            toggle.classList.remove('active');
            document.body.style.overflow = '';
        });
    });
}

function initScrollEffects() {
    const header = document.querySelector('.header');
    if (!header || window.innerWidth < 768) return;

    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        if (currentScroll > 100 && currentScroll > lastScroll) {
            header.style.transform = 'translateY(-100%)';
        } else {
            header.style.transform = 'translateY(0)';
        }
        lastScroll = currentScroll;
    }, { passive: true });
}

const WHATSAPP_LAVADERO = '18097941824';
const WHATSAPP_ANTOJOS = '18097941824';

/**
 * Genera enlace de Google Calendar para que la administración pueda guardar el evento y poner alarma.
 * @param {string} title - Título del evento
 * @param {string} dateStr - Fecha YYYY-MM-DD
 * @param {string} timeStr - Hora HH:MM
 * @param {string} details - Descripción del evento
 * @param {number} durationMinutes - Duración en minutos (default 60)
 * @returns {string} URL de Google Calendar
 */
function buildCalendarLink(title, dateStr, timeStr, details, durationMinutes = 60) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const [h, min] = timeStr.split(':').map(Number);
    const start = new Date(y, m - 1, d, h, min, 0);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    const format = (dt) => dt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '').slice(0, 15) + 'Z';
    const startStr = format(start);
    const endStr = format(end);
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: title,
        dates: `${startStr}/${endStr}`,
        details: details || ''
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function initReservarForm() {
    const btn = document.getElementById('btn-reservar-whatsapp');
    const fechaInput = document.getElementById('fecha');
    if (!btn) return;

    if (fechaInput) {
        const today = new Date().toISOString().split('T')[0];
        fechaInput.setAttribute('min', today);
    }

    btn.addEventListener('click', () => {
        const tipoLavado = document.getElementById('tipo-lavado')?.value;
        const fecha = document.getElementById('fecha')?.value;
        const hora = document.getElementById('hora')?.value;
        const placa = document.getElementById('placa')?.value;
        const descVehiculo = document.getElementById('desc-vehiculo')?.value;

        if (!tipoLavado || !fecha || !hora || !placa || !descVehiculo) {
            alert('Por favor complete todos los campos obligatorios.');
            return;
        }

        const fechaFormato = new Date(fecha + 'T12:00:00').toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const detallesReserva = `Servicio: ${tipoLavado}\nPlaca: ${placa}\nVehículo: ${descVehiculo}\n\nReserva enviada desde la web`;
        const calendarLink = buildCalendarLink(
            `Reserva Lavado - ${placa} - ${tipoLavado.split(' - ')[0]}`,
            fecha,
            hora,
            detallesReserva,
            60
        );
        const mensaje = `*RESERVA DE LAVADO - Auto Lava Garcia*\n\n` +
            `🚗 *Servicio:* ${tipoLavado}\n` +
            `📅 *Fecha:* ${fechaFormato}\n` +
            `🕐 *Hora:* ${hora}\n` +
            `🔢 *Placa:* ${placa}\n` +
            `📝 *Vehículo:* ${descVehiculo}\n\n` +
            `📅 _Administración: guardar en calendario y poner alarma:_\n${calendarLink}\n\n` +
            `_Reserva enviada desde la web_`;

        const url = `https://wa.me/${WHATSAPP_LAVADERO}?text=${encodeURIComponent(mensaje)}`;
        window.open(url, '_blank');
    });
}

function initPedidoForm() {
    const btn = document.getElementById('btn-pedido-whatsapp');
    const recogerFechaInput = document.getElementById('recoger-fecha');
    if (!btn) return;

    if (recogerFechaInput) {
        const today = new Date().toISOString().split('T')[0];
        recogerFechaInput.setAttribute('min', today);
    }

    btn.addEventListener('click', () => {
        const checkboxes = document.querySelectorAll('#form-pedido input[name="pedido"]:checked');
        const instrucciones = document.getElementById('instrucciones')?.value || '';
        const recogerFecha = document.getElementById('recoger-fecha')?.value || '';
        const recogerHora = document.getElementById('recoger-hora')?.value || '';

        if (checkboxes.length === 0) {
            alert('Por favor seleccione al menos un plato.');
            return;
        }

        const items = Array.from(checkboxes).map(cb => `• ${cb.value}`).join('\n');
        let mensaje = `*PEDIDO - Antojos Bar Lounge* _(recoger en el lugar, pago en caja)_\n\n` +
            `🍽️ *Mi pedido:*\n${items}\n`;

        if (instrucciones.trim()) {
            mensaje += `\n📋 *Instrucciones:* ${instrucciones}\n`;
        }
        if (recogerFecha && recogerHora) {
            const fechaFormato = new Date(recogerFecha + 'T12:00:00').toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            mensaje += `\n🕐 *Recoger:* ${fechaFormato} a las ${recogerHora}\n`;
            const detallesPedido = `Pedido para recoger:\n${items}${instrucciones.trim() ? '\nInstrucciones: ' + instrucciones : ''}\n\nEnviado desde la web`;
            const calendarLink = buildCalendarLink(
                'Pedido Antojos - Recoger',
                recogerFecha,
                recogerHora,
                detallesPedido,
                30
            );
            mensaje += `\n📅 _Administración: guardar en calendario y poner alarma:_\n${calendarLink}\n`;
        }
        mensaje += `\n_Enviado desde la web_`;

        const url = `https://wa.me/${WHATSAPP_ANTOJOS}?text=${encodeURIComponent(mensaje)}`;
        window.open(url, '_blank');
    });
}
