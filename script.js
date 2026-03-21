(() => {
  const startDate = new Date(2026, 1, 26); // 26 Feb 2026 (month is 0-based)
  const daysEl = document.getElementById('days');
  const heartsContainer = document.getElementById('hearts');

  function updateDays(){
    const now = new Date();
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const diffMs = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const days = Math.floor(diffMs / (1000*60*60*24));
    daysEl.textContent = String(days);
  }

  function spawnHeart(){
    // keep number of hearts modest
    if(heartsContainer.children.length >= 6) return;

    const emojis = ['💕','💖','💘','💓','💞','💗','💝','❣️', '🫦'];
    const s = document.createElement('span');
    s.className = 'heart';
    s.textContent = emojis[Math.floor(Math.random()*emojis.length)];
    if(Math.random() > 0.5) s.classList.add('mirrored');

    const size = 18 + Math.floor(Math.random()*28); // 18-46px
    s.style.fontSize = size + 'px';

    // horizontal placement across widget but not too close to edges
    const left = 6 + Math.random()*88; // 6% - 94%
    s.style.left = left + '%';

    // vertical band: centered counter is at ~50% — allow -20%..+20%
    const top = 50 + (Math.random()*40 - 20); // 30% - 70%
    s.style.top = top + '%';

    // small horizontal drift via margin-left (so animation transform can be translateY only)
    const drift = Math.floor(Math.random()*41 - 20); // -20..20 px
    s.style.marginLeft = drift + 'px';

    // how much the heart will rise (negative px)
    const rise = -(30 + Math.floor(Math.random()*50)); // -30 to -79px
    s.style.setProperty('--rise', rise + 'px');

    const duration = 3500 + Math.floor(Math.random()*5000); // 3.5s-8.5s (slightly faster)
    s.style.animationDuration = (duration/1000) + 's';

    heartsContainer.appendChild(s);

    setTimeout(() => { s.remove(); }, duration + 250);
  }

  // initial gentle population (a bit more present)
  for(let i=0;i<6;i++){
    setTimeout(spawnHeart, i*300);
  }

  // schedule spawns with a variable (faster) rate — still capped
  (function schedule(){
    const delay = 900 + Math.random()*1100; // 0.9s - 2.0s
    setTimeout(()=>{ spawnHeart(); schedule(); }, delay);
  })();

  updateDays();
  setInterval(updateDays, 60*1000);

})();
