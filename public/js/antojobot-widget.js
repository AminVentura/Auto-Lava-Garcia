/**
 * Antojos Bot — widget flotante para antojosbarlounge.com.
 * Cerebro: https://antojosreserva.antojosbarlounge.com/api/chat (dev: localhost:4499).
 * Custom element + canvas WhatsApp. Sin JWT. sessionStorage solo sessionId.
 */
(function () {
  'use strict';
  var SESSION_KEY = 'antojos_sid';
  var MAX = 2500;

  function hostName() {
    return location.hostname;
  }

  function onShopSite() {
    var host = hostName();
    return host === 'antojosbarlounge.com' || host === 'www.antojosbarlounge.com';
  }

  function shouldSkip() {
    var host = hostName();
    var path = location.pathname || '';
    if (host === 'admin.antojosbarlounge.com') return true;
    if (path.indexOf('/admin') === 0 || path.indexOf('/ops') === 0 || path.indexOf('/sign-in') === 0 || path.indexOf('/embed') === 0) return true;
    return false;
  }

  function apiUrl() {
    if (window.ANTOJOBOT_API) return String(window.ANTOJOBOT_API);
    var host = hostName();
    if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:4499/api/chat';
    if (host.indexOf('antojosreserva') !== -1 || host.indexOf('antojos-reserva') !== -1 || host.indexOf('menu.antojosbarlounge.com') !== -1) return '/api/chat';
    return 'https://antojos-reserva.vercel.app/api/chat';
  }

  function embedUrl() {
    return apiUrl().replace(/\/api\/chat$/, '/embed');
  }

  function sessionId() {
    try {
      var id = sessionStorage.getItem(SESSION_KEY);
      if (id && /^[a-zA-Z0-9_-]{8,80}$/.test(id)) return id;
      id = (crypto.randomUUID && crypto.randomUUID().replace(/-/g, '').slice(0, 24)) || 's' + Date.now();
      sessionStorage.setItem(SESSION_KEY, id);
      return id;
    } catch (e) {
      return 's' + Date.now();
    }
  }

  function injectCss() {
    if (document.getElementById('antojobot-styles')) return;
    var s = document.createElement('style');
    s.id = 'antojobot-styles';
    s.textContent =
      '.antojobot-root{position:fixed;z-index:2147483000;right:max(0.75rem,env(safe-area-inset-right));bottom:' +
      (onShopSite()
        ? 'calc(8.75rem + env(safe-area-inset-bottom, 0px))'
        : 'max(0.75rem, env(safe-area-inset-bottom, 0px))') +
      ';font-family:Outfit,Segoe UI,system-ui,sans-serif}' +
      '.antojobot-launcher{width:56px;height:56px;border:1px solid #c9a227;border-radius:50%;background:#0d3b4c;color:#c9a227;font-weight:700;font-size:9px;line-height:1.15;letter-spacing:.02em;cursor:pointer;box-shadow:0 10px 28px rgba(0,0,0,.35);padding:4px}' +
      '.antojobot-panel{width:min(22.5rem,calc(100vw - 1.25rem));height:min(34rem,calc(100dvh - 5.5rem));max-height:calc(100dvh - 5.5rem);display:flex;flex-direction:column;background:#075e54;color:#fff;border-radius:16px;overflow:hidden;box-shadow:0 16px 40px rgba(0,0,0,.4)}' +
      '.antojobot-panel[hidden]{display:none!important}' +
      '.antojobot-head{display:flex;justify-content:space-between;align-items:center;padding:.7rem .85rem;background:#128c7e}' +
      '.antojobot-title{margin:0;font-weight:700;font-size:.95rem}' +
      '.antojobot-sub{margin:0;font-size:.72rem;color:#d7fff3}' +
      '.antojobot-x{border:0;background:transparent;color:#fff;font-size:1.4rem;cursor:pointer;min-width:44px;min-height:44px}' +
      '.antojobot-chips{display:flex;flex-wrap:wrap;gap:.3rem;padding:.45rem .6rem}' +
      '.antojobot-chips button{border:0;border-radius:999px;background:#0b3d36;color:#d7fff3;padding:.3rem .55rem;cursor:pointer;font:inherit;font-size:.75rem;min-height:36px}' +
      '.antojobot-log{flex:1;overflow-y:auto;padding:.65rem;display:flex;flex-direction:column;gap:.4rem;background:#0e4a43}' +
      '.antojobot-msg{max-width:92%;margin:0;padding:.5rem .6rem;border-radius:8px;font-size:.85rem;line-height:1.35;white-space:pre-wrap;word-break:break-word}' +
      '.antojobot-msg--assistant{align-self:flex-start;background:#fff;color:#111}' +
      '.antojobot-msg--user{align-self:flex-end;background:#dcf8c6;color:#111}' +
      '.antojobot-form{display:flex;gap:.35rem;padding:.55rem;background:#0b3d36}' +
      '.antojobot-form textarea{flex:1;min-width:0;min-height:44px;max-height:7rem;border:0;border-radius:12px;padding:.55rem .7rem;font:inherit;font-size:16px;resize:vertical}' +
      '.antojobot-form button{border:0;border-radius:999px;background:#c9a227;color:#0a0a0a;font-weight:700;padding:.55rem .75rem;cursor:pointer;min-height:44px}';
    document.head.appendChild(s);
  }

  function el(tag, cls) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }

  function init() {
    if (shouldSkip()) return;
    if (document.getElementById('antojobot-root')) return;
    injectCss();
    var root = el('div', 'antojobot-root');
    root.id = 'antojobot-root';
    var launcher = el('button', 'antojobot-launcher');
    launcher.type = 'button';
    launcher.textContent = 'Antojos Bot';
    launcher.setAttribute('aria-label', 'Abrir Antojos Bot');
    var panel = el('div', 'antojobot-panel');
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Antojos Bot');
    var head = el('header', 'antojobot-head');
    var titles = el('div');
    var h = el('p', 'antojobot-title');
    h.textContent = 'Antojos Bot';
    var sub = el('p', 'antojobot-sub');
    sub.textContent = 'Lavado o comida · pago en local';
    titles.appendChild(h);
    titles.appendChild(sub);
    var close = el('button', 'antojobot-x');
    close.type = 'button';
    close.textContent = '×';
    close.setAttribute('aria-label', 'Cerrar');
    head.appendChild(titles);
    head.appendChild(close);
    var chips = el('div', 'antojobot-chips');
    ['Lavado', 'Comida', 'Menú'].forEach(function (c) {
      var b = el('button');
      b.type = 'button';
      b.textContent = c;
      b.addEventListener('click', function () {
        send(c);
      });
      chips.appendChild(b);
    });
    var log = el('div', 'antojobot-log');
    function bubble(role, text) {
      var p = el('p', 'antojobot-msg antojobot-msg--' + role);
      p.textContent = text;
      log.appendChild(p);
      log.scrollTop = log.scrollHeight;
    }
    bubble('assistant', '¡Hola! 👋 Soy Antojos Bot. ¿Lavado o comida?\nPago en oficina / caja. Cero cobro por chat.');
    var form = el('form', 'antojobot-form');
    var area = document.createElement('textarea');
    area.maxLength = MAX;
    area.placeholder = 'Escribe o pega el bloque…';
    area.setAttribute('aria-label', 'Mensaje');
    var sendBtn = el('button');
    sendBtn.type = 'submit';
    sendBtn.textContent = 'Enviar';
    form.appendChild(area);
    form.appendChild(sendBtn);
    panel.appendChild(head);
    panel.appendChild(chips);
    panel.appendChild(log);
    panel.appendChild(form);
    root.appendChild(panel);
    root.appendChild(launcher);
    document.body.appendChild(root);

    var sending = false;
    function send(text) {
      var message = String(text || '').trim();
      if (!message || sending) return;
      sending = true;
      sendBtn.disabled = true;
      bubble('user', message);
      area.value = '';
      fetch(apiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message, sessionId: sessionId() }),
      })
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          bubble('assistant', data.message || data.error || 'No pude responder.');
        })
        .catch(function () {
          bubble('assistant', 'Sin conexión. Intenta otra vez.');
        })
        .then(function () {
          sending = false;
          sendBtn.disabled = false;
        });
    }

    function toggle(open) {
      panel.hidden = !open;
      launcher.hidden = open;
    }
    launcher.addEventListener('click', function () {
      toggle(true);
    });
    close.addEventListener('click', function () {
      toggle(false);
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      send(area.value);
    });
    window.ANTOJOBOT_EMBED = embedUrl;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
