document.addEventListener('DOMContentLoaded', async () => {
  // Authorization: require ?pw= to match SHA-256 of known secret.
  async function checkPwAuthorized() {
    try {
      const pw = new URLSearchParams(location.search).get('pw') || '';
      const enc = new TextEncoder().encode(pw);
      const buf = await crypto.subtle.digest('SHA-256', enc);
      const hex = Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      return (
        hex ===
        '8e9b3a0484ea612857971ba73f947471eb7f4ff33ae23adb0605a20629480e75'
      );
    } catch (e) {
      return false;
    }
  }

  const _authorized = await checkPwAuthorized();
  if (!_authorized) {
    // Render a fixed, non-flipping Unauthorized card that preserves widget size/background
    const widget = document.querySelector('.notion-widget') || document.body;
    widget.innerHTML = `
      <div style="width:100%;height:160px;padding:12px;border-radius:14px;display:flex;align-items:center;justify-content:center;">
        <div style="font-size:28px;font-weight:800;color:#b00020">Unauthorized</div>
      </div>
    `;
    // ensure audio controls are not present
    const playBtn = widget.querySelector('#play-word');
    if (playBtn) playBtn.style.display = 'none';
    const player = widget.querySelector('#audio-player-word');
    if (player) player.removeAttribute('src');
    // stop further initialization
    return;
  }
  // audio elements and control buttons
  const wordPlayer = document.getElementById('audio-player-word');
  const btnWord = document.getElementById('play-word');
  const imageEl = document.getElementById('word-image');

  // try loading words.json from same directory; no embedded fallback

  function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  async function loadEntry() {
    // default empty entry; rely solely on words.json
    let entry = { word: '', de: '', sampleSv: '', sampleDe: '' };
    try {
      const res = await fetch('words.json', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length) {
          const activeOnly = data.filter((d) => d.active);
          if (activeOnly && activeOnly.length) {
            entry = pickRandom(activeOnly);
          } else {
            console.debug('No active entries in words.json; no entry selected');
          }
        }
      }
    } catch (e) {
      // fetch may fail when opening file:// directly; no fallback
    }
    return entry;
  }

  const entry = await loadEntry();

  // populate the word card (first .flip-card with data-role=word)
  const wordCard = document.querySelector('.flip-card[data-role="word"]');
  if (wordCard) {
    wordCard.querySelector('.flip-card-front .word').textContent = entry.word;
    wordCard.querySelector('.flip-card-front .sample').textContent = entry.sampleSv;
    wordCard.querySelector('.flip-card-back .word').textContent = entry.de;
    wordCard.querySelector('.flip-card-back .sample').textContent = entry.sampleDe;
  }

  // single card holds both word and sample (front/back)

  // set image and audio sources
  if (imageEl) {
    // Inline external SVG and recolor it so individual files need not be edited.
    (async () => {
      try {
        const imgPath = `img/${sanitizeFilename(entry.category || entry.word)}.svg`;
        const res = await fetch(imgPath, { cache: 'no-store' });
        if (!res.ok) {
          imageEl.src = imgPath;
          return;
        }
        const svgText = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, 'image/svg+xml');
        const svg = doc.querySelector('svg');
        if (!svg) {
          imageEl.src = imgPath;
          return;
        }

        // Remove large/full-size background rects so the SVG has no own background
        try {
          const vb = (svg.getAttribute('viewBox') || '').trim().split(/\s+/);
          let vbW = vb.length === 4 ? parseFloat(vb[2]) : null;
          let vbH = vb.length === 4 ? parseFloat(vb[3]) : null;
          if ((!vbW || !vbH) && svg.getAttribute('width') && svg.getAttribute('height')) {
            const w = svg.getAttribute('width').replace(/px$/, '');
            const h = svg.getAttribute('height').replace(/px$/, '');
            vbW = vbW || parseFloat(w) || null;
            vbH = vbH || parseFloat(h) || null;
          }

          const rects = Array.from(svg.querySelectorAll('rect'));
          rects.forEach((r) => {
            const f = (r.getAttribute('fill') || '').toLowerCase();
            const id = (r.id || '').toLowerCase();
            const cls = (r.getAttribute('class') || '').toLowerCase();
            const style = (r.getAttribute('style') || '').toLowerCase();

            // heuristics: remove rects that look like backgrounds
            const looksLikeBg = id.includes('bg') || cls.includes('bg') || style.includes('background');

            const rx = parseFloat(r.getAttribute('x') || '0');
            const ry = parseFloat(r.getAttribute('y') || '0');
            const rw = parseFloat(r.getAttribute('width') || '0');
            const rh = parseFloat(r.getAttribute('height') || '0');

            const coversView = vbW && vbH && (Math.abs(rx) <= 1 && Math.abs(ry) <= 1 && rw >= vbW * 0.9 && rh >= vbH * 0.9);

            if (looksLikeBg || coversView) {
              r.remove();
            }
          });
        } catch (e) {
          // if anything goes wrong, ignore and continue
        }

        // Recolor gradient stops (if present) to a lila variant
        const stops = svg.querySelectorAll('stop');
        if (stops && stops.length) {
          stops.forEach((s, i) => {
            s.setAttribute('stop-color', i === 0 ? '#f6eef9' : '#f0d8f0');
          });
        }

        // Target color (darker lila-pink)
        const newFill = '#b1538f';

        // Replace explicit fills (but keep gradient references)
        svg.querySelectorAll('[fill]').forEach((el) => {
          const f = el.getAttribute('fill');
          if (!f) return;
          if (f.startsWith('url(')) return;
          if (f === 'none') return;
          el.setAttribute('fill', newFill);
        });

        // Ensure common shape/text elements get the new fill if not set
        svg.querySelectorAll('path,circle,rect,ellipse,text').forEach((el) => {
          if (!el.getAttribute('fill')) el.setAttribute('fill', newFill);
        });

        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.style.display = 'block';
        svg.style.background = 'transparent';

        imageEl.replaceWith(svg);
      } catch (err) {
        // Fallback to using the image src directly
        const imgPath = `img/${sanitizeFilename(entry.category || entry.word)}.svg`;
        imageEl.src = imgPath;
      }
    })();
  }
  // Build a normalized filename for the word audio (e.g. kärlek -> karlek.mp3)
  function sanitizeFilename(name) {
    if (!name) return 'word';
    // normalize and strip diacritics
    // decompose accented characters then remove combining marks (U+0300–U+036F)
    const s = name
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
    return s || 'word';
  }

  // ensure we don't preload unnecessary files and pick the correct audio file
  wordPlayer.preload = 'none';

  async function pickAudioFile() {
    const original = entry.word || '';
    const normalized = sanitizeFilename(original || 'word');
    const encoded = encodeURIComponent(original || '');
    const rawLower = (original || '').toLowerCase();
    const candidates = [];

    if (normalized) candidates.push(`audio/${normalized}.mp3`);
    if (encoded) candidates.push(`audio/${encoded}.mp3`);
    if (rawLower) candidates.push(`audio/${rawLower}.mp3`);
    // do not rely on audio paths in JSON; use normalized candidates only
    // final last-resort generic name (shouldn't usually be used)
    candidates.push('audio/word.mp3');

    console.debug('Audio lookup for word:', { original, normalized, candidates });

    for (const candidate of candidates) {
      // try encrypted variant first, then the plain candidate
      const probes = [
        candidate.endsWith('.enc') ? candidate : `${candidate}.enc`,
        candidate,
      ];
      for (const probe of probes) {
        try {
          const head = await fetch(probe, { method: 'HEAD', cache: 'no-store' });
          if (head.ok) {
            if (probe.endsWith('.enc')) {
              const urlKey = new URLSearchParams(location.search).get('pw');
              if (!urlKey) {
                console.warn('Found encrypted audio but no ?pw= provided:', probe);
                continue;
              }
              try {
                const got = await fetch(probe, { method: 'GET', cache: 'no-store' });
                if (!got.ok) break;
                const ab = await got.arrayBuffer();
                const decrypted = xorDecrypt(new Uint8Array(ab), urlKey);
                const blob = new Blob([decrypted.buffer], { type: 'audio/mpeg' });
                wordPlayer.src = URL.createObjectURL(blob);
                console.debug('Using decrypted audio from', probe);
                return;
              } catch (err) {
                console.warn('Failed to fetch/decrypt', probe, err);
                continue;
              }
            }
            // plain file
            wordPlayer.src = probe;
            console.debug('Using audio (HEAD):', probe);
            return;
          }
          if (head.status === 405) {
            const get = await fetch(probe, { method: 'GET', cache: 'no-store' });
            if (get.ok) {
              if (probe.endsWith('.enc')) {
                const urlKey = new URLSearchParams(location.search).get('pw');
                if (!urlKey) continue;
                const ab = await get.arrayBuffer();
                const decrypted = xorDecrypt(new Uint8Array(ab), urlKey);
                const blob = new Blob([decrypted.buffer], { type: 'audio/mpeg' });
                wordPlayer.src = URL.createObjectURL(blob);
                console.debug('Using decrypted audio (GET):', probe);
                return;
              }
              wordPlayer.src = probe;
              console.debug('Using audio (GET):', probe);
              return;
            }
          }
        } catch (err) {
          // ignore and try next probe
        }
      }
    }

    console.warn('No audio file found for', original, 'tried:', candidates);
  }

  // kick off audio selection (async)
  pickAudioFile();

  function xorDecrypt(buf, key) {
    const keyBytes = new TextEncoder().encode(key);
    const out = new Uint8Array(buf.length);
    const klen = keyBytes.length || 1;
    for (let i = 0; i < buf.length; i++) {
      out[i] = buf[i] ^ keyBytes[i % klen];
    }
    return out;
  }

  // Play when clicking designated buttons
  btnWord.addEventListener('click', () => { playAudio(wordPlayer, btnWord); });

  // clicking the card plays the word audio; hover emits hearts
  document.querySelectorAll('.flip-card').forEach(card => {
    card.addEventListener('click', () => { playAudio(wordPlayer, btnWord); });
    // keyboard support
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); } });
    card.addEventListener('mouseenter', () => { emitHearts(card, 6); });
  });

  function playAudio(player, button) {
    try {
      player.currentTime = 0;
      const p = player.play();
      if (p && p.catch) p.catch(() => {/* silent */ });
    } catch (e) {/* ignore */ }
    // micro interaction: pulse button and floating heart
    if (button) {
      button.classList.add('pulse');
      setTimeout(() => button.classList.remove('pulse'), 420);
      showFloatingHeart(button);
    }
  }

  function showFloatingHeart(button) {
    const rect = button.getBoundingClientRect();
    const heart = document.createElement('div');
    heart.className = 'floating-heart';
    heart.textContent = '❤';
    // position relatively inside widget container
    const container = document.querySelector('.notion-widget');
    container.appendChild(heart);
    const offsetLeft = rect.left - container.getBoundingClientRect().left + rect.width / 2 - 8;
    const offsetTop = rect.top - container.getBoundingClientRect().top - 6;
    heart.style.left = offsetLeft + 'px';
    heart.style.top = offsetTop + 'px';
    setTimeout(() => heart.remove(), 900);
  }

  function emitHearts(container, count) {
    const colours = ['#ff4d8b', '#ff86b6', '#ffd6e8', '#fff3f8'];
    for (let i = 0; i < count; i++) {
      const h = document.createElement('div');
      h.className = 'heart-piece';
      h.textContent = '❤';
      h.style.color = colours[Math.floor(Math.random() * colours.length)];
      // position randomly inside the card
      const left = 10 + Math.random() * 80; // percent
      const top = 30 + Math.random() * 50; // percent
      h.style.left = left + '%';
      h.style.top = top + '%';
      h.style.animationDelay = (Math.random() * 200) + 'ms';
      container.appendChild(h);
      setTimeout(() => { h.remove(); }, 1100);
    }
  }

});
