/**
 * Auto Lava Garcia & Antojos Bar Lounge - Main JS
 */

document.addEventListener('DOMContentLoaded', () => {
    initMobileNav();
    initScrollEffects();
    initReservarForm();
    initPedidoForm();
});

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
