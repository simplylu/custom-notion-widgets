(() => {
  const startDate = new Date(2026, 1, 26); // 26 Feb 2026 (month is 0-based)
  const daysEl = document.getElementById('days');
  const heartsContainer = document.getElementById('hearts');

  function updateDays(){
    const now = new Date();
    // compute difference in local days
    const diffMs = now.setHours(0,0,0,0) - (new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).setHours(0,0,0,0));
    const days = Math.floor(diffMs / (1000*60*60*24));
    daysEl.textContent = String(days);
  }

  function spawnHeart(){
    const s = document.createElement('span');
    s.className = 'heart';
    s.textContent = Math.random() > 0.5 ? '💕' : '💕';
    if(Math.random() > 0.5) s.classList.add('mirrored');

    const size = 16 + Math.floor(Math.random()*36); // 16-52px
    s.style.fontSize = size + 'px';

    const left = Math.random() * 100; // percent
    s.style.left = left + '%';

    const duration = 4000 + Math.floor(Math.random()*7000); // 4s-11s
    s.style.animationDuration = (duration/1000) + 's';

    // slight horizontal drift using transform during animation
    const drift = (Math.random() - 0.5) * 40; // -20 to 20 px
    s.style.setProperty('--drift', drift + 'px');

    heartsContainer.appendChild(s);

    // remove after animation
    setTimeout(()=>{
      s.remove();
    }, duration+200);
  }

  // make hearts float with slight CSS transform for drift
  // inject small stylesheet tweak to use --drift variable inside transform
  const style = document.createElement('style');
  style.textContent = '.heart{ transform: translateX(var(--drift,0px)); } .heart[style] { /* allow inline */ }';
  document.head.appendChild(style);

  // initial population
  for(let i=0;i<8;i++){
    setTimeout(spawnHeart, i*350);
  }

  // spawn periodically
  setInterval(spawnHeart, 700);

  // update days now and every minute (keeps day accurate across midnight)
  updateDays();
  setInterval(updateDays, 60*1000);

})();
