// Sjellja e ftesës në shfletues: zarfi, muzika, animacionet, numërimi, RSVP, QR.
(function () {
  var cfg = window.__INV || {};
  var body = document.body;
  var audio = document.getElementById('bgm');
  var mbtn = document.getElementById('musicBtn');

  // Yjet dhe flokët e borës ndajnë një shtresë globale në të gjithë faqen.
  var globalFx = document.getElementById('globalFx');
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (globalFx && window.Snowflakes && !reducedMotion) {
    new window.Snowflakes({
      container: globalFx,
      color: '#fff',
      count: window.innerWidth < 600 ? 24 : 36,
      minOpacity: 0.28,
      maxOpacity: 0.8,
      minSize: 9,
      maxSize: 24,
      rotation: true,
      speed: 0.7,
      wind: true,
      zIndex: 1,
      autoResize: true
    });
  }

  // Angel Event hero footage: эхний 13 секундыг тасралтгүй давтана.
  var heroVideo = document.querySelector('.hero-video[data-loop-end]');
  if (heroVideo) {
    var heroLoopEnd = Number(heroVideo.getAttribute('data-loop-end')) || 13;
    if (reducedMotion) {
      heroVideo.removeAttribute('autoplay');
      heroVideo.pause();
    } else {
      heroVideo.addEventListener('timeupdate', function () {
        if (heroVideo.currentTime >= heroLoopEnd) {
          heroVideo.currentTime = 0;
          heroVideo.play().catch(function () {});
        }
      });
      heroVideo.addEventListener('ended', function () {
        heroVideo.currentTime = 0;
        heroVideo.play().catch(function () {});
      });
      heroVideo.play().catch(function () {});
    }
  }

  function playMusic() {
    if (!audio) return;
    audio.volume = 0.7;
    audio.play().then(function () { mbtn && mbtn.classList.add('on'); }).catch(function () {});
  }
  if (mbtn) mbtn.addEventListener('click', function () {
    if (audio.paused) playMusic(); else { audio.pause(); mbtn.classList.remove('on'); }
  });

  // Mobile navigation: үндсэн хоёр холбоос + бусад хэсгийн burger drawer.
  var mobileNav = document.querySelector('.mobile-nav');
  if (mobileNav) {
    var navLinks = [].slice.call(mobileNav.querySelectorAll('a[href^="#"]'));
    var menuToggle = mobileNav.querySelector('.mobile-menu-toggle');
    var menuPanel = mobileNav.querySelector('.mobile-menu-panel');
    var menuBackdrop = mobileNav.querySelector('.mobile-menu-backdrop');
    var menuClose = mobileNav.querySelector('.mobile-menu-close');
    var sectionIds = ['top', 'artists', 'tickets', 'program', 'location'];
    var setMenu = function (open, restoreFocus) {
      mobileNav.classList.toggle('is-open', open);
      document.body.classList.toggle('mobile-menu-open', open);
      menuToggle.setAttribute('aria-expanded', String(open));
      menuPanel.setAttribute('aria-hidden', String(!open));
      if (open) {
        menuPanel.removeAttribute('inert');
        setTimeout(function () { menuClose.focus(); }, 50);
      } else {
        menuPanel.setAttribute('inert', '');
        if (restoreFocus) menuToggle.focus();
      }
    };
    menuToggle.addEventListener('click', function () { setMenu(!mobileNav.classList.contains('is-open')); });
    menuBackdrop.addEventListener('click', function () { setMenu(false, true); });
    menuClose.addEventListener('click', function () { setMenu(false, true); });
    navLinks.forEach(function (link) {
      link.addEventListener('click', function () { setMenu(false, Boolean(link.closest('.mobile-menu-panel'))); });
    });
    document.addEventListener('keydown', function (e) {
      if (!mobileNav.classList.contains('is-open')) return;
      if (e.key === 'Escape') { setMenu(false, true); return; }
      if (e.key === 'Tab') {
        var focusable = [].slice.call(menuPanel.querySelectorAll('a,button'));
        var first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    var updateNav = function () {
      var currentId = 'top';
      var marker = window.scrollY + window.innerHeight * 0.42;
      sectionIds.forEach(function (id) {
        var section = document.getElementById(id);
        if (section && section.offsetTop <= marker) currentId = id;
      });
      navLinks.forEach(function (link) {
        if (link.getAttribute('href') === '#' + currentId) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
      menuToggle.classList.toggle('is-contextual', ['tickets', 'program', 'location'].indexOf(currentId) !== -1);
    };
    var navTicking = false;
    window.addEventListener('scroll', function () {
      if (navTicking) return;
      navTicking = true;
      window.requestAnimationFrame(function () { updateNav(); navTicking = false; });
    }, { passive: true });
    window.addEventListener('resize', function () {
      updateNav();
      if (window.innerWidth > 720 && mobileNav.classList.contains('is-open')) setMenu(false);
    });
    updateNav();
  }

  // Animacionet kur seksionet hyjnë në ekran
  var items = [].slice.call(document.querySelectorAll('.rv'));
  var reveal = function () {
    if (!('IntersectionObserver' in window)) { items.forEach(function (el) { el.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (el, i) {
      if (el.closest('.hero')) { setTimeout(function () { el.classList.add('in'); }, 150 + i * 160); }
      else io.observe(el);
    });
  };

  var env = document.getElementById('envelope');
  if (env) {
    var opened = false;
    var open = function () {
      if (opened) return; opened = true;
      body.classList.add('opened'); playMusic();
      setTimeout(reveal, 1500);
      setTimeout(function () { env.remove(); }, 2500);
    };
    env.addEventListener('click', open);
    env.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  } else { body.classList.add('opened'); reveal(); }

  // Numërimi mbrapsht
  var cd = document.querySelector('[data-cd]');
  if (cd) {
    var target = new Date(cd.getAttribute('data-cd')).getTime();
    var u = {}; ['d', 'h', 'm', 's'].forEach(function (k) { u[k] = cd.querySelector('[data-u="' + k + '"]'); });
    var tick = function () {
      var diff = Math.max(0, target - Date.now());
      u.d.textContent = Math.floor(diff / 864e5);
      u.h.textContent = String(Math.floor(diff / 36e5) % 24).padStart(2, '0');
      u.m.textContent = String(Math.floor(diff / 6e4) % 60).padStart(2, '0');
      u.s.textContent = String(Math.floor(diff / 1e3) % 60).padStart(2, '0');
    };
    tick(); setInterval(tick, 1000);
  }

  // QR i hyrjes
  var qrEl = document.querySelector('[data-qr]');
  if (qrEl) import('/js/qr.js').then(function (m) { m.drawQR(qrEl, qrEl.dataset.qr, { dark: '#111' }); }).catch(function () {});

  // RSVP
  var form = document.querySelector('.rsvp-form');
  if (form) {
    var msg = form.querySelector('.rsvp-msg'), btn = form.querySelector('button[type=submit]');
    var guestsRow = form.querySelector('.guests-row');
    form.querySelectorAll('input[name=attending]').forEach(function (r) {
      r.addEventListener('change', function () { guestsRow.style.display = form.attending.value === '1' ? '' : 'none'; });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (cfg.mode !== 'live' || !form.dataset.endpoint) { msg.textContent = msg.dataset.prev; return; }
      btn.disabled = true; btn.textContent = btn.dataset.sending;
      var fd = new FormData(form), payload = {};
      fd.forEach(function (v, k) { payload[k] = v; });
      if (cfg.code) payload.code = cfg.code;
      fetch(form.dataset.endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
        .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
        .then(function () {
          msg.textContent = payload.attending === '1' ? msg.dataset.ok : msg.dataset.no;
          form.classList.add('done');
        })
        .catch(function () { msg.textContent = msg.dataset.err; btn.disabled = false; btn.textContent = btn.dataset.send; });
    });
  }

  // Galeria: shiko fotot në ekran të plotë
  var phs = document.querySelectorAll('.gal .ph');
  if (phs.length) {
    var srcs = Array.prototype.map.call(phs, function (a) { return a.getAttribute('href'); });
    var cur = 0, box = document.createElement('div');
    box.className = 'lb'; box.setAttribute('role', 'dialog');
    box.innerHTML = '<img alt=""><button class="x" type="button" aria-label="Хаах">✕</button>' + (srcs.length > 1 ? '<button class="pv" type="button" aria-label="Өмнөх">‹</button><button class="nx" type="button" aria-label="Дараах">›</button>' : '') + '<div class="ct"></div>';
    document.body.appendChild(box);
    var img = box.querySelector('img'), ct = box.querySelector('.ct');
    var show = function (i) { cur = (i + srcs.length) % srcs.length; img.src = srcs[cur]; ct.textContent = srcs.length > 1 ? (cur + 1) + ' / ' + srcs.length : ''; box.classList.add('on'); };
    var close = function () { box.classList.remove('on'); };
    phs.forEach(function (a, i) { a.addEventListener('click', function (e) { e.preventDefault(); show(i); }); });
    box.addEventListener('click', function (e) { if (e.target === box || e.target.classList.contains('x')) close(); });
    var pv = box.querySelector('.pv'), nx = box.querySelector('.nx');
    if (pv) { pv.addEventListener('click', function () { show(cur - 1); }); nx.addEventListener('click', function () { show(cur + 1); }); }
    document.addEventListener('keydown', function (e) { if (!box.classList.contains('on')) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1); });
    var sx = 0; box.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', function (e) { var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1)); });
  }
})();
