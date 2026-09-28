'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  // Only these specifically checked game surfaces may opt into cross-origin
  // framing. Arbitrary manifest entries cannot grant themselves embedding.
  const EMBED_GAMES = new Set([
    'https://sae-anewgam.vercel.app/ball'
  ]);
  const canEmbed = experience => new URL(experience.url).origin === location.origin
    || (experience.embed === true && EMBED_GAMES.has(experience.url));
  let experiences = [], selected = 0, featured = 0, loading = false;
  let scrollFrame = 0, deferredInstall = null, noteTimer;
  let playOpener = null, playTimer = null, sameOriginWorld = true;
  const carousel = $('carousel');
  const text = (tag, className, value) => {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = value;
    return element;
  };
  const dateLabel = value => {
    const parsed = new Date(value);
    return typeof value === 'string' && Number.isFinite(parsed.getTime())
      ? new Intl.DateTimeFormat(undefined, {month: 'short', day: 'numeric', year: 'numeric'}).format(parsed)
      : null;
  };
  function safeURL(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      const url = new URL(value, location.href);
      return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
    } catch { return null; }
  }
  function current(index, scroll = true) {
    if (!experiences.length) return;
    selected = Math.max(0, Math.min(experiences.length - 1, index));
    $('position').textContent = `${selected + 1} / ${experiences.length}`;
    $('previous').disabled = selected === 0;
    $('next').disabled = selected === experiences.length - 1;
    [...$('selectors').children].forEach((button, i) => button.setAttribute('aria-pressed', String(i === selected)));
    if (scroll) {
      const card = carousel.children[selected];
      carousel.scrollTo({left: card.offsetLeft - carousel.children[0].offsetLeft, behavior: reduced.matches ? 'instant' : 'smooth'});
    }
  }
  function home(event) {
    event.preventDefault();
    current(featured);
    $('experiences').scrollIntoView({behavior: reduced.matches ? 'instant' : 'smooth', block: 'start'});
  }
  $('home').addEventListener('click', home);
  $('footer-home').addEventListener('click', home);
  function closeWorld() {
    clearTimeout(playTimer);
    $('play-frame').src = 'about:blank';
    $('play-overlay').close();
    document.body.classList.remove('playing');
    playOpener?.focus({preventScroll: true});
    playOpener = null;
  }
  function openWorld(experience, opener) {
    if (!canEmbed(experience)) return;
    playOpener = opener;
    sameOriginWorld = new URL(experience.url).origin === location.origin;
    $('play-hint').textContent = 'Opening your world… Home is always available.';
    clearTimeout(playTimer);
    playTimer = setTimeout(() => {
      $('play-hint').textContent = 'Taking a while? Try Open in browser, or return Home.';
    }, 12000);
    $('play-title').textContent = experience.title;
    $('play-frame').title = `Playing ${experience.title}`;
    $('play-browser').href = experience.url;
    $('play-frame').src = experience.url;
    document.body.classList.add('playing');
    $('play-overlay').showModal();
    $('play-home').focus();
  }
  $('play-home').onclick = closeWorld;
  $('play-overlay').addEventListener('cancel', event => { event.preventDefault(); closeWorld(); });
  $('play-frame').addEventListener('load', () => {
    if (!$('play-overlay').open) return;
    clearTimeout(playTimer);
    $('play-hint').textContent = sameOriginWorld
      ? 'Home or Escape returns to your shelf. Blank page? Try Open in browser.'
      : 'Worlds / Home returns to your shelf. Blank page? Try Open in browser.';
    try {
      // Same-origin documents retain an Escape route even while the frame has focus.
      $('play-frame').contentWindow.addEventListener('keydown', event => {
        if (event.key === 'Escape' && $('play-overlay').open) {
          event.preventDefault(); closeWorld();
        }
      }, true);
    } catch { /* Explicitly allowed external games keep the visible Home button; their documents are never inspected. */ }
  });
  $('previous').onclick = () => current(selected - 1);
  $('next').onclick = () => current(selected + 1);
  carousel.addEventListener('keydown', event => {
    if (event.target !== carousel) return;
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      current(event.key === 'Home' ? 0 : event.key === 'End' ? experiences.length - 1 : selected + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  carousel.addEventListener('scroll', () => {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(() => {
      if (!experiences.length) return;
      const first = carousel.children[0].offsetLeft;
      let nearest = 0, distance = Infinity;
      [...carousel.children].forEach((card, index) => {
        const difference = Math.abs(card.offsetLeft - first - carousel.scrollLeft);
        if (difference < distance) { nearest = index; distance = difference; }
      });
      current(nearest, false);
    });
  }, {passive: true});
  function render() {
    carousel.replaceChildren();
    $('selectors').replaceChildren();
    experiences.forEach((experience, index) => {
      const card = text('article', 'experience-card', '');
      card.setAttribute('aria-roledescription', 'slide');
      card.setAttribute('aria-label', `${index + 1} of ${experiences.length}: ${experience.title}`);
      if (experience.image) {
        const image = document.createElement('img');
        image.className = 'card-image'; image.alt = ''; image.src = experience.image;
        image.loading = index === featured ? 'eager' : 'lazy'; image.referrerPolicy = 'no-referrer';
        image.onerror = () => image.remove();
        card.append(image);
      }
      card.append(text('span', 'card-shade', ''), text('span', 'card-orbit', ''));
      const badges = text('div', 'card-badges', '');
      if (index === featured) badges.append(text('span', 'badge featured', 'Latest featured'));
      badges.append(text('span', 'badge', experience.kind || 'A place to explore'));
      card.append(badges);
      const content = text('div', 'card-content', '');
      content.append(text('p', 'card-kicker', experience.kicker || 'FOLLOW YOUR CURIOSITY'));
      content.append(text('h3', 'card-title', experience.title));
      content.append(text('p', 'card-description', experience.description));
      const bottom = text('div', 'card-bottom', '');
      const owned = canEmbed(experience);
      const link = text('a', 'open-world', owned ? 'Play here' : 'Open in browser');
      link.href = experience.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', owned ? `Play ${experience.title} here; Home returns to the shelf` : `Open ${experience.title} in a new browser tab`);
      link.append(text('span', '', owned ? '→' : '↗'));
      if (owned) link.addEventListener('click', event => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault(); openWorld(experience, link);
      });
      const checked = text('p', 'checked', dateLabel(experience.verified_at) ? 'Last checked' : 'Check date not provided');
      if (dateLabel(experience.verified_at)) checked.append(text('span', '', dateLabel(experience.verified_at)));
      bottom.append(link, checked); content.append(bottom); card.append(content); carousel.append(card);
      const button = text('button', 'selector', experience.title);
      button.type = 'button'; button.setAttribute('aria-pressed', 'false');
      button.onclick = () => current(index);
      $('selectors').append(button);
    });
    requestAnimationFrame(() => {
      current(featured, false);
      const card = carousel.children[featured];
      carousel.scrollTo({left: card.offsetLeft - carousel.children[0].offsetLeft, behavior: 'instant'});
    });
  }
  async function load() {
    if (loading) return;
    loading = true; $('refresh').disabled = true;
    $('load-status').textContent = 'Opening the collection…';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch('./play-room-data.json', {cache: 'no-store', credentials: 'omit', redirect: 'error', signal: controller.signal});
      if (!response.ok) throw new Error('Collection unavailable');
      const document = await response.json();
      if (!document || !Array.isArray(document.experiences)) throw new Error('Collection format unavailable');
      const seen = new Set();
      const entries = document.experiences.slice(0, 30).flatMap(entry => {
        if (!entry || typeof entry.id !== 'string' || seen.has(entry.id) || typeof entry.title !== 'string') return [];
        const url = safeURL(entry.url);
        if (!url) return [];
        seen.add(entry.id);
        return [{...entry, url, image: safeURL(entry.image), title: entry.title.slice(0, 120),
          description: typeof entry.description === 'string' ? entry.description.slice(0, 500) : '',
          kicker: typeof entry.kicker === 'string' ? entry.kicker.slice(0, 100) : '',
          kind: typeof entry.kind === 'string' ? entry.kind.slice(0, 60) : ''}];
      });
      if (!entries.length) throw new Error('No experiences published');
      experiences = entries;
      featured = experiences.findIndex(entry => entry.id === document.featured_id);
      if (featured < 0) {
        featured = 0;
        experiences.forEach((entry, i) => {
          if ((Date.parse(entry.verified_at) || 0) > (Date.parse(experiences[featured].verified_at) || 0)) featured = i;
        });
      }
      render();
      $('load-status').textContent = 'The latest featured world is ready. Check dates describe the saved collection, not a live availability test.';
      $('updated').textContent = dateLabel(document.updated_at) ? `Shelf updated ${dateLabel(document.updated_at)}` : '';
    } catch {
      $('load-status').textContent = experiences.length
        ? 'Could not refresh. The shelf shown is from the last successful load in this page.'
        : 'The shelf is unavailable right now. Reconnect and refresh, or stay with the seed garden below.';
      if (!experiences.length) {
        const empty = $('empty-card');
        if (empty) empty.querySelector('p').textContent = 'The collection could not be read. The seed garden still works here, without a connection.';
      }
    } finally {
      clearTimeout(timeout); loading = false; $('refresh').disabled = false;
    }
  }
  $('refresh').onclick = load;
  load();

  // A local sensory toy. Nothing is persisted or sent anywhere.
  const canvas = $('seed-canvas'), context = canvas.getContext('2d');
  let width = 1, height = 1, seeds = [], paused = reduced.matches, lastPoint = null, drawing = false;
  let animation = 0;
  const colors = ['#dfc38b', '#b8d5b5', '#d7e1c9', '#8abdb4'];
  function draw(now = performance.now()) {
    if (!context) return;
    context.clearRect(0, 0, width, height);
    seeds.forEach(seed => {
      const age = paused ? 1 : Math.min(1, (now - seed.born) / 850);
      const x = seed.x * width, y = seed.y * height;
      const sway = paused ? 0 : Math.sin(now / 1500 + seed.phase) * 3;
      context.strokeStyle = seed.color; context.lineWidth = 1; context.globalAlpha = .5;
      context.beginPath(); context.moveTo(x, height + 6);
      context.bezierCurveTo(x - 18, height * .72, x + sway + 20, y + 25, x + sway, height + (y - height) * age);
      context.stroke();
      context.globalAlpha = .9;
      for (let petal = 0; petal < 5; petal++) {
        const angle = petal * Math.PI * 2 / 5 + seed.phase;
        context.beginPath();
        context.ellipse(x + sway + Math.cos(angle) * seed.size * age, y + Math.sin(angle) * seed.size * age,
          Math.max(.1, seed.size * .5 * age), Math.max(.1, seed.size * age), angle, 0, Math.PI * 2);
        context.stroke();
      }
      context.fillStyle = seed.color; context.beginPath(); context.arc(x + sway, y, 1.8, 0, Math.PI * 2); context.fill();
    });
    context.globalAlpha = 1;
  }
  function tick(now) { draw(now); if (!paused && !document.hidden) animation = requestAnimationFrame(tick); }
  function animate() { cancelAnimationFrame(animation); draw(); if (!paused && !document.hidden) animation = requestAnimationFrame(tick); }
  function addSeed(x, y) {
    seeds.push({x: Math.max(.02, Math.min(.98, x)), y: Math.max(.06, Math.min(.87, y)),
      color: colors[seeds.length % colors.length], size: 3 + Math.random() * 5, phase: Math.random() * Math.PI * 2, born: performance.now()});
    if (seeds.length > 180) seeds.shift();
    draw();
  }
  function resize() {
    const bounds = canvas.getBoundingClientRect();
    width = bounds.width; height = bounds.height;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    if (context) context.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw();
  }
  function point(event) {
    const bounds = canvas.getBoundingClientRect();
    const next = {x: event.clientX - bounds.left, y: event.clientY - bounds.top};
    if (!lastPoint || Math.hypot(next.x - lastPoint.x, next.y - lastPoint.y) > 15) {
      addSeed(next.x / bounds.width, next.y / bounds.height); lastPoint = next;
    }
  }
  canvas.addEventListener('pointerdown', event => { if (event.button !== 0) return; drawing = true; lastPoint = null; canvas.setPointerCapture(event.pointerId); point(event); });
  canvas.addEventListener('pointermove', event => { if (drawing) point(event); });
  function finish() { drawing = false; lastPoint = null; }
  canvas.addEventListener('pointerup', finish); canvas.addEventListener('pointercancel', finish); canvas.addEventListener('lostpointercapture', finish);
  $('plant').onclick = () => { addSeed(.1 + Math.random() * .8, .14 + Math.random() * .58); $('seed-status').textContent = 'A seed planted, just for this moment. This canvas does not run work or change any systems.'; };
  $('clear').onclick = () => { seeds = []; draw(); $('seed-status').textContent = 'A fresh patch of quiet. Your garden is held only in this page.'; };
  function motion() { $('motion').textContent = paused ? 'Resume motion' : 'Pause motion'; $('motion').setAttribute('aria-pressed', String(paused)); animate(); }
  $('motion').onclick = () => { paused = !paused; motion(); };
  reduced.addEventListener('change', event => { paused = event.matches; motion(); });
  document.addEventListener('visibilitychange', animate);
  new ResizeObserver(resize).observe(canvas);
  [(.12), .25, .43, .56, .71, .86].forEach((x, i) => addSeed(x, .35 + (i % 3) * .14));
  resize(); motion();

  function note(message) {
    $('install-note').textContent = message; $('install-note').hidden = false;
    clearTimeout(noteTimer); noteTimer = setTimeout(() => { $('install-note').hidden = true; }, 14000);
  }
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredInstall = event; $('install').textContent = 'Install this room ↗'; });
  window.addEventListener('appinstalled', () => { deferredInstall = null; $('install').textContent = 'Room installed ✓'; note('Your room now has a place on your home screen.'); });
  $('install').onclick = async () => {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) {
      note('Bookmark this page to keep your way home. Home-screen installation needs a secure HTTPS address or localhost.'); return;
    }
    try {
      await navigator.serviceWorker.register('./play-room-sw.js', {scope: './'});
      if (deferredInstall) {
        await deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null;
      } else {
        note('The room’s static shell is being prepared for offline use. To add it to your home screen, use your browser’s Install option, or Share → Add to Home Screen. The live shelf and other worlds need a connection.');
      }
    } catch { note('Offline setup could not finish. You can still bookmark this room and use it while connected.'); }
  };
})();
