// Sjellja e ftesës në shfletues: zarfi, muzika, animacionet, numërimi, RSVP, QR.
(function () {
  var cfg = window.__INV || {};
  var body = document.body;
  var audio = document.getElementById('bgm');
  var mbtn = document.getElementById('musicBtn');
  var musicStateKey = 'leaders-music-state-v2';
  var invitationOpenedKey = 'leaders-invitation-opened-v1';
  var musicShouldPlay = false;
  var lastKnownMusicTime = 0;
  var navigationStateSaved = false;
  var musicState = { playing: false, activeSrc: '', tracks: {} };

  function readSession(key) {
    try { return window.sessionStorage.getItem(key); } catch (e) { return null; }
  }

  function writeSession(key, value) {
    try { window.sessionStorage.setItem(key, value); } catch (e) {}
  }

  function readMusicState() {
    var saved = readSession(musicStateKey);
    if (!saved) return null;
    try {
      var state = JSON.parse(saved);
      if (typeof state.playing !== 'boolean' || !state.tracks || typeof state.tracks !== 'object') return null;
      return state;
    } catch (e) { return null; }
  }

  function normalizeMusicSrc(src) {
    if (!src) return '';
    try { return new URL(src, window.location.href).pathname; } catch (e) { return src; }
  }

  function currentMusicSrc() {
    if (!audio) return '';
    return normalizeMusicSrc(audio.getAttribute('src') || audio.currentSrc);
  }

  function savedTrackTime(src, includeElapsed) {
    var track = musicState.tracks[normalizeMusicSrc(src)];
    if (!track || !Number.isFinite(track.currentTime)) return 0;
    var elapsed = includeElapsed && musicState.playing && track.savedAt
      ? Math.max(0, (Date.now() - track.savedAt) / 1000)
      : 0;
    return Math.max(0, track.currentTime + elapsed);
  }

  function saveMusicState(playing, currentTime) {
    if (!audio) return;
    var src = currentMusicSrc();
    musicState.playing = typeof playing === 'boolean' ? playing : musicShouldPlay;
    musicState.activeSrc = src;
    musicState.tracks[src] = {
      currentTime: Number.isFinite(currentTime)
        ? currentTime
        : (Number.isFinite(audio.currentTime) ? audio.currentTime : lastKnownMusicTime),
      savedAt: Date.now()
    };
    writeSession(musicStateKey, JSON.stringify(musicState));
  }

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

  function setupHeroVideo() {
    var heroVideo = document.querySelector('.hero-video');
    if (!heroVideo) return;
    if (reducedMotion) {
      heroVideo.removeAttribute('autoplay');
      heroVideo.pause();
    } else heroVideo.play().catch(function () {});
  }
  setupHeroVideo();

  function seekMusic(startTime) {
    if (!audio || !Number.isFinite(startTime)) return;
    var applyTime = function () {
      var nextTime = Math.max(0, startTime);
      if (Number.isFinite(audio.duration) && audio.duration > 0) nextTime %= audio.duration;
      audio.currentTime = nextTime;
      lastKnownMusicTime = nextTime;
    };
    if (audio.readyState >= 1) applyTime();
    else audio.addEventListener('loadedmetadata', applyTime, { once: true });
  }

  function syncMusicVideo(startTime) {
    if (!audio || !Number.isFinite(startTime)) return;
    var selector = audio.getAttribute('data-sync-video');
    var video = selector && document.querySelector(selector);
    if (!video) return;
    var applyTime = function () {
      var nextTime = Math.max(0, startTime);
      if (Number.isFinite(video.duration) && video.duration > 0) nextTime %= video.duration;
      video.currentTime = nextTime;
      if (!reducedMotion) video.play().catch(function () {});
    };
    if (video.readyState >= 1) applyTime();
    else video.addEventListener('loadedmetadata', applyTime, { once: true });
  }

  function playMusic(startTime) {
    if (!audio) return;
    musicShouldPlay = true;
    audio.volume = 0.7;
    var nextTime = Number.isFinite(startTime) ? startTime : audio.currentTime;
    seekMusic(nextTime);
    syncMusicVideo(nextTime);
    audio.play().then(function () {
      mbtn && mbtn.classList.add('on');
      saveMusicState(true);
    }).catch(function () {});
  }

  function setMusicSource(src) {
    var nextSrc = normalizeMusicSrc(src);
    if (!audio || !nextSrc || currentMusicSrc() === nextSrc) return;
    saveMusicState(undefined, lastKnownMusicTime);
    var shouldResume = musicShouldPlay;
    audio.pause();
    audio.setAttribute('src', nextSrc);
    lastKnownMusicTime = savedTrackTime(nextSrc, false);
    audio.load();
    if (shouldResume) playMusic(lastKnownMusicTime);
    else {
      seekMusic(lastKnownMusicTime);
      saveMusicState(false, lastKnownMusicTime);
    }
  }

  if (mbtn) mbtn.addEventListener('click', function () {
    if (audio.paused) playMusic();
    else { musicShouldPlay = false; audio.pause(); mbtn.classList.remove('on'); saveMusicState(false); }
  });

  // Route болон track бүрийн тоглосон секунд, асаалттай төлөвийг хадгална.
  if (audio) {
    var savedMusicState = readMusicState();
    if (savedMusicState) {
      musicState = savedMusicState;
      musicShouldPlay = savedMusicState.playing;
      var initialSrc = currentMusicSrc();
      var initialTime = savedTrackTime(initialSrc, savedMusicState.activeSrc === initialSrc);
      if (musicShouldPlay) playMusic(initialTime);
      else seekMusic(initialTime);
    }

    var lastMusicSave = 0;
    audio.addEventListener('timeupdate', function () {
      lastKnownMusicTime = audio.currentTime;
      if (Date.now() - lastMusicSave < 1000) return;
      lastMusicSave = Date.now();
      saveMusicState();
    });

    document.addEventListener('click', function (e) {
      var link = e.target.closest && e.target.closest('a[href]');
      if (!link || link.target === '_blank') return;
      var target = new URL(link.href, window.location.href);
      if (target.origin === window.location.origin && target.pathname !== window.location.pathname) {
        lastKnownMusicTime = audio.currentTime;
        saveMusicState(undefined, lastKnownMusicTime);
        navigationStateSaved = true;
      }
    }, true);
    window.addEventListener('pagehide', function () {
      if (!navigationStateSaved) saveMusicState(undefined, lastKnownMusicTime);
    });
  }

  function setupMusicContext(sourceAudio) {
    if (!audio || !sourceAudio) return;
    var syncVideo = sourceAudio.getAttribute('data-sync-video');
    if (syncVideo) audio.setAttribute('data-sync-video', syncVideo);
    else audio.removeAttribute('data-sync-video');
    setMusicSource(sourceAudio.getAttribute('src'));
  }
  setupMusicContext(audio);

  // Mobile navigation: үндсэн холбоосууд + бусад хэсгийн burger drawer.
  var mobileNavController;
  function setupMobileNav() {
    if (mobileNavController) mobileNavController.abort();
    mobileNavController = new AbortController();
    var signal = mobileNavController.signal;
    var mobileNav = document.querySelector('.mobile-nav');
    if (!mobileNav) return;
    var navLinks = [].slice.call(mobileNav.querySelectorAll('a[href^="#"]'));
    var menuToggle = mobileNav.querySelector('.mobile-menu-toggle');
    var menuPanel = mobileNav.querySelector('.mobile-menu-panel');
    var menuBackdrop = mobileNav.querySelector('.mobile-menu-backdrop');
    var menuClose = mobileNav.querySelector('.mobile-menu-close');
    var sectionIds = ['top', 'artists', 'program', 'location'];
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
    menuToggle.addEventListener('click', function () { setMenu(!mobileNav.classList.contains('is-open')); }, { signal: signal });
    menuBackdrop.addEventListener('click', function () { setMenu(false, true); }, { signal: signal });
    menuClose.addEventListener('click', function () { setMenu(false, true); }, { signal: signal });
    navLinks.forEach(function (link) {
      link.addEventListener('click', function () { setMenu(false, Boolean(link.closest('.mobile-menu-panel'))); }, { signal: signal });
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
    }, { signal: signal });
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
      menuToggle.classList.toggle('is-contextual', ['program', 'location'].indexOf(currentId) !== -1);
    };
    var navTicking = false;
    window.addEventListener('scroll', function () {
      if (navTicking) return;
      navTicking = true;
      window.requestAnimationFrame(function () { updateNav(); navTicking = false; });
    }, { passive: true, signal: signal });
    window.addEventListener('resize', function () {
      updateNav();
      if (window.innerWidth > 720 && mobileNav.classList.contains('is-open')) setMenu(false);
    }, { signal: signal });
    updateNav();
  }
  setupMobileNav();

  // Animacionet kur seksionet hyjnë në ekran
  var reveal = function () {
    var items = [].slice.call(document.querySelectorAll('.rv:not(.in)'));
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
      writeSession(invitationOpenedKey, '1');
      body.classList.add('opened'); playMusic(0);
      setTimeout(reveal, 1500);
      setTimeout(function () { env.remove(); }, 2500);
    };
    if (readSession(invitationOpenedKey) === '1') {
      env.remove(); body.classList.add('opened'); reveal();
    } else {
      env.addEventListener('click', open);
      env.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    }
  } else { body.classList.add('opened'); reveal(); }

  // Numërimi mbrapsht
  var countdownTimer;
  function setupCountdown() {
    if (countdownTimer) clearInterval(countdownTimer);
    var cd = document.querySelector('[data-cd]');
    if (!cd) return;
    var target = new Date(cd.getAttribute('data-cd')).getTime();
    var u = {}; ['d', 'h', 'm', 's'].forEach(function (k) { u[k] = cd.querySelector('[data-u="' + k + '"]'); });
    var tick = function () {
      var diff = Math.max(0, target - Date.now());
      u.d.textContent = Math.floor(diff / 864e5);
      u.h.textContent = String(Math.floor(diff / 36e5) % 24).padStart(2, '0');
      u.m.textContent = String(Math.floor(diff / 6e4) % 60).padStart(2, '0');
      u.s.textContent = String(Math.floor(diff / 1e3) % 60).padStart(2, '0');
    };
    tick(); countdownTimer = setInterval(tick, 1000);
  }
  setupCountdown();

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

  // Дотоод route-уудыг document reload хийхгүй сольж, нэг audio элементийг тасралтгүй хадгална.
  var softNavigationPending = false;
  function normalizeRoute(pathname) {
    var path = pathname.replace(/\/index\.html$/, '/');
    if (path === '/artists') return '/artists/';
    if (path === '/menu') return '/menu/';
    if (path === '/tickets') return '/tickets/';
    return path;
  }
  function isSoftRoute(pathname) {
    var path = normalizeRoute(pathname);
    return path === '/' || path === '/artists/' || path === '/menu/' || path === '/tickets/';
  }
  function updateDescription(nextDocument) {
    var current = document.querySelector('meta[name="description"]');
    var next = nextDocument.querySelector('meta[name="description"]');
    if (current && next) current.setAttribute('content', next.getAttribute('content') || '');
  }
  function finishSoftNavigation(target, nextDocument, replaceHistory) {
    var currentMain = document.querySelector('main');
    var currentNav = document.querySelector('.mobile-nav');
    var nextMain = nextDocument.querySelector('main');
    var nextNav = nextDocument.querySelector('.mobile-nav');
    if (!currentMain || !currentNav || !nextMain || !nextNav) throw new Error('Incomplete route document');

    currentMain.replaceWith(nextMain);
    currentNav.replaceWith(nextNav);
    document.title = nextDocument.title;
    updateDescription(nextDocument);
    body.className = nextDocument.body.className;
    body.classList.remove('has-env', 'mobile-menu-open');
    body.classList.add('opened');
    body.removeAttribute('aria-busy');

    var destination = normalizeRoute(target.pathname) + target.search + target.hash;
    if (!replaceHistory) window.history.pushState({ softRoute: true }, '', destination);
    navigationStateSaved = false;
    setupMobileNav();
    setupHeroVideo();
    setupMusicContext(nextDocument.querySelector('#bgm'));
    setupCountdown();
    reveal();

    if (target.hash) {
      window.requestAnimationFrame(function () {
        var section = document.getElementById(decodeURIComponent(target.hash.slice(1)));
        if (section) section.scrollIntoView();
      });
    } else window.scrollTo(0, 0);
  }
  function softNavigate(url, replaceHistory) {
    if (softNavigationPending) return;
    softNavigationPending = true;
    body.setAttribute('aria-busy', 'true');
    var target = new URL(url, window.location.href);
    fetch(normalizeRoute(target.pathname) + target.search)
      .then(function (response) {
        if (!response.ok) throw new Error('Route request failed');
        return response.text();
      })
      .then(function (html) {
        var nextDocument = new DOMParser().parseFromString(html, 'text/html');
        finishSoftNavigation(target, nextDocument, replaceHistory);
      })
      .catch(function () {
        window.location.href = target.href;
      })
      .finally(function () {
        softNavigationPending = false;
        body.removeAttribute('aria-busy');
      });
  }
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var link = e.target.closest && e.target.closest('a[href]');
    if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
    var target = new URL(link.href, window.location.href);
    if (target.origin !== window.location.origin || !isSoftRoute(target.pathname)) return;
    var currentPath = normalizeRoute(window.location.pathname);
    var targetPath = normalizeRoute(target.pathname);
    if (currentPath === targetPath) {
      if (target.hash) return;
      e.preventDefault();
      navigationStateSaved = false;
      return;
    }
    e.preventDefault();
    softNavigate(target.href, false);
  });
  window.addEventListener('popstate', function () {
    if (isSoftRoute(window.location.pathname)) softNavigate(window.location.href, true);
  });
})();
