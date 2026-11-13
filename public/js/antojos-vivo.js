/**
 * Datos en vivo del panel de Antojos (2026-11-09): carta con fotos y precios, promociones con fecha y feriados.
 * Los publica la dueña en antojosreserva.antojosbarlounge.com (/ops/carta) y se leen de /api/md/web, que solo
 * devuelve lo publicado. Si la API falla o la carta no está publicada, la página se queda como está.
 * Los huecos llevan data-carta-vivo, data-promos-vivo o data-feriados-vivo.
 */
(function () {
    'use strict';
    var API = 'https://antojosreserva.antojosbarlounge.com/api/md/web';
    var huecos = document.querySelectorAll('[data-carta-vivo],[data-promos-vivo],[data-feriados-vivo]');
    if (!huecos.length || !window.fetch) return;

    function esc(v) {
        return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function fotoSegura(url) {
        return typeof url === 'string' && /^https:\/\/[^\s"'<>]+$/.test(url) ? url : '';
    }
    function fecha(ymd) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd || '')) return '';
        return new Date(ymd + 'T12:00:00').toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' });
    }
    function mostrar(el, html) {
        el.innerHTML = html;
        el.hidden = false;
    }

    function pintarCarta(el, carta) {
        if (!carta || !Array.isArray(carta.productos) || !carta.productos.length) return;
        var cats = (carta.categorias || []).map(function (c) {
            var platos = carta.productos.filter(function (p) { return p.categoriaId === c.id; });
            if (!platos.length) return '';
            return '<div class="carta-vivo__cat"><h3>' + esc(c.nombre) + '</h3><ul class="carta-vivo__lista">' +
                platos.map(function (p) {
                    var foto = fotoSegura(p.fotoUrl);
                    return '<li class="carta-vivo__plato">' +
                        (foto ? '<img src="' + esc(foto) + '" alt="' + esc(p.nombre) + '" loading="lazy" decoding="async" width="320" height="240">' : '') +
                        '<div><strong>' + esc(p.nombre) + '</strong>' +
                        ' <span class="carta-vivo__precio">' + (p.baseTexto ? '<s>' + esc(p.baseTexto) + '</s> ' : '') + esc(p.precioTexto) + '</span>' +
                        (p.etiqueta ? ' <span class="carta-vivo__etiqueta">' + esc(p.etiqueta) + '</span>' : '') +
                        (p.descripcion ? '<p>' + esc(p.descripcion) + '</p>' : '') +
                        '</div></li>';
                }).join('') + '</ul></div>';
        }).join('');
        if (cats) mostrar(el, '<h2>La carta de hoy</h2><p class="carta-vivo__nota">Fotos y precios que publica la cafetería; se confirman en caja.</p>' + cats);
    }

    function pintarPromos(el, promos) {
        if (!Array.isArray(promos) || !promos.length) return;
        mostrar(el, '<ul class="promos-vivo">' + promos.map(function (p) {
            var cuando = [];
            if (p.desde) cuando.push('desde el ' + fecha(p.desde));
            if (p.hasta) cuando.push('hasta el ' + fecha(p.hasta));
            if (p.dias && p.dias.length) cuando.push('los ' + p.dias.join(', ').toLowerCase());
            if (p.horaIni && p.horaFin) cuando.push('de ' + p.horaIni + ' a ' + p.horaFin);
            return '<li><strong>' + esc(p.titulo) + '</strong> · ' + esc(p.detalle) + (cuando.length ? ' <span>(' + esc(cuando.join(', ')) + ')</span>' : '') + '</li>';
        }).join('') + '</ul>');
    }

    function pintarFeriados(el, feriados) {
        if (!Array.isArray(feriados) || !feriados.length) return;
        mostrar(el, '<h3>Feriados y días especiales</h3><ul class="feriados-vivo">' + feriados.slice(0, 24).map(function (f) {
            var partes = [];
            if (f.lavado) partes.push('lavadero: ' + f.lavado);
            if (f.cafeteria) partes.push('cafetería: ' + f.cafeteria);
            return '<li><strong>' + esc(fecha(f.fecha)) + '</strong>' + (f.nota ? ' (' + esc(f.nota) + ')' : '') + (partes.length ? ' · ' + esc(partes.join('; ')) : '') + '</li>';
        }).join('') + '</ul>');
    }

    fetch(API, { headers: { accept: 'application/json' }, credentials: 'omit' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
            if (!d) return;
            document.querySelectorAll('[data-carta-vivo]').forEach(function (el) { pintarCarta(el, d.carta); });
            document.querySelectorAll('[data-promos-vivo]').forEach(function (el) { pintarPromos(el, d.promos); });
            document.querySelectorAll('[data-feriados-vivo]').forEach(function (el) { pintarFeriados(el, d.feriados); });
        })
        .catch(function () { /* sin datos en vivo: la página ya tiene su contenido */ });
})();
