(() => {
  const cityNameEl = document.getElementById('city-name');
  const tempEl = document.getElementById('temp');
  const descEl = document.getElementById('desc');
  const forecastEl = document.getElementById('forecast');

  const CITIES = {
    malmo: {lat: 55.6050, lon: 13.0038, label: 'Malmö', img: 'img/malmo.png'},
    goettingen: {lat: 51.5413, lon: 9.9158, label: 'Göttingen', img: 'img/gottingen.png'},
    trier: {lat: 49.7499, lon: 6.6371, label: 'Trier', img: 'img/trier.png'},
  };

  function weatherCodeToEmoji(code){
    // simplified mapping based on WMO weather codes
    if(code === 0) return {emoji:'☀️', label:'Clear'};
    if(code === 1 || code === 2 || code === 3) return {emoji:'🌤️', label:'Partly cloudy'};
    if(code === 45 || code === 48) return {emoji:'🌫️', label:'Fog'};
    if(code >= 51 && code <= 67) return {emoji:'🌦️', label:'Drizzle / Rain'};
    if(code >= 71 && code <= 77) return {emoji:'❄️', label:'Snow'};
    if(code >= 80 && code <= 86) return {emoji:'🌧️', label:'Showers'};
    if(code >= 95) return {emoji:'⛈️', label:'Thunderstorm'};
    return {emoji:'☁️', label:'Cloudy'};
  }

  async function fetchWeather(lat, lon){
    // Open-Meteo (no API key) - current + daily forecast
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`;
    const res = await fetch(url);
    if(!res.ok) throw new Error('Weather fetch failed');
    return res.json();
  }

  function renderCurrent(data, label){
    const cw = data.current_weather;
    const info = weatherCodeToEmoji(cw.weathercode);
    cityNameEl.textContent = label;
    tempEl.textContent = Math.round(cw.temperature) + '°C';
    descEl.textContent = `${info.emoji} ${info.label}`;
  }

  function renderForecast(data){
    const days = data.daily;
    forecastEl.innerHTML = '';
    for(let i=0;i<Math.min(4, days.time.length); i++){
      const d = document.createElement('div');
      d.className = 'day';
      const date = new Date(days.time[i]);
      const name = date.toLocaleDateString(undefined,{weekday:'short'});
      const code = days.weathercode[i];
      const emoji = weatherCodeToEmoji(code).emoji;
      d.innerHTML = `<div class="d">${name}</div><div class="icon">${emoji}</div><div class="t">${Math.round(days.temperature_2m_max[i])}°</div>`;
      forecastEl.appendChild(d);
    }
  }

  function cityKeyFromParam(){
    const params = new URLSearchParams(window.location.search);
    const k = (params.get('city') || '').toLowerCase();
    return CITIES[k] ? k : 'malmo';
  }

  async function update(){
    const key = cityKeyFromParam();
    const city = CITIES[key];
    const lat = city.lat;
    const lon = city.lon;
    const label = city.label;
    // set silhouette image
    const img = document.getElementById('silhouette-img');
    if(img && city.img) img.src = city.img;

    cityNameEl.textContent = 'Loading...';
    tempEl.textContent = '--°C';
    descEl.textContent = '';
    try{
      const data = await fetchWeather(lat, lon);
      renderCurrent(data, label);
      renderForecast(data);
    }catch(err){
      cityNameEl.textContent = label;
      descEl.textContent = 'Unable to load weather';
      tempEl.textContent = '--°C';
      forecastEl.innerHTML = '';
      console.error(err);
    }
  }

  // initial
  update();

})();
