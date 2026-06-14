const circuitTimezones = {
  'albert_park': 'Australia/Melbourne',
  'shanghai': 'Asia/Shanghai',
  'suzuka': 'Asia/Tokyo',
  'miami': 'America/New_York',
  'villeneuve': 'America/Montreal',
  'monaco': 'Europe/Monaco',
  'catalunya': 'Europe/Madrid',
  'red_bull_ring': 'Europe/Vienna',
  'silverstone': 'Europe/London',
  'spa': 'Europe/Brussels',
  'hungaroring': 'Europe/Budapest',
  'zandvoort': 'Europe/Amsterdam',
  'monza': 'Europe/Rome',
  'madring': 'Europe/Madrid',
  'baku': 'Asia/Baku',
  'marina_bay': 'Asia/Singapore',
  'americas': 'America/Chicago',
  'rodriguez': 'America/Mexico_City',
  'interlagos': 'America/Sao_Paulo',
  'vegas': 'America/Los_Angeles',
  'losail': 'Asia/Qatar',
  'yas_marina': 'Asia/Dubai',
  'jeddah': 'Asia/Riyadh',
  'bahrain': 'Asia/Bahrain',
  'imola': 'Europe/Rome'
};

document.addEventListener('DOMContentLoaded', () => {
  // UI Elements
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const prevRaceBtn = document.getElementById('prev-race-btn');
  const nextRaceBtn = document.getElementById('next-race-btn');
  const toggleLocalBtn = document.getElementById('toggle-local');
  const toggleTrackBtn = document.getElementById('toggle-track');
  const calendarView = document.getElementById('calendar-view');

  // State
  let races = [];
  let currentRaceIndex = 0;
  let countdownInterval;
  let showLocalTime = true;
  let currentSessions = [];

  // Init
  init();

  async function init() {
    setupListeners();
    await fetchRaces();
    fetchStandings();
  }

  function setupListeners() {
    // Tabs
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
      });
    });

    // Calendar Navigation
    prevRaceBtn.addEventListener('click', () => {
      if (currentRaceIndex > 0) {
        currentRaceIndex--;
        renderRace(currentRaceIndex, 'slide-right');
      }
    });

    nextRaceBtn.addEventListener('click', () => {
      if (currentRaceIndex < races.length - 1) {
        currentRaceIndex++;
        renderRace(currentRaceIndex, 'slide-left');
      }
    });

    // Time Toggle
    toggleLocalBtn.addEventListener('click', () => {
      showLocalTime = true;
      toggleLocalBtn.classList.add('active');
      toggleTrackBtn.classList.remove('active');
      renderSessionsList();
    });

    toggleTrackBtn.addEventListener('click', () => {
      showLocalTime = false;
      toggleTrackBtn.classList.add('active');
      toggleLocalBtn.classList.remove('active');
      renderSessionsList();
    });
  }

  async function fetchRaces() {
    try {
      const response = await fetch('https://api.jolpi.ca/ergast/f1/current.json');
      const data = await response.json();
      races = data.MRData.RaceTable.Races;

      const now = new Date();
      
      // Find the "current" race based on date (first race where Race time is in the future)
      currentRaceIndex = races.findIndex(race => {
        const raceTime = new Date(`${race.date}T${race.time}`);
        return raceTime > now;
      });

      // If season is over, show the last race
      if (currentRaceIndex === -1) currentRaceIndex = races.length - 1;

      renderRace(currentRaceIndex);
    } catch (error) {
      console.error('Error fetching race data:', error);
      document.getElementById('race-name').textContent = 'Error loading calendar';
    }
  }

  function renderRace(index, animationClass = '') {
    if (!races || races.length === 0) return;
    
    const race = races[index];
    
    // Update navigation buttons
    prevRaceBtn.disabled = index === 0;
    nextRaceBtn.disabled = index === races.length - 1;

    // Apply animation
    if (animationClass) {
      calendarView.classList.remove('slide-left', 'slide-right');
      void calendarView.offsetWidth; // trigger reflow
      calendarView.classList.add(animationClass);
    }

    document.getElementById('race-name').textContent = race.raceName;
    document.getElementById('round-badge').textContent = `Round ${race.round}`;
    document.getElementById('circuit-name').textContent = race.Circuit.circuitName;

    // Build sessions array
    currentSessions = [];
    if (race.FirstPractice) currentSessions.push({ name: 'Practice 1', time: new Date(`${race.FirstPractice.date}T${race.FirstPractice.time}`) });
    if (race.SecondPractice) currentSessions.push({ name: 'Practice 2', time: new Date(`${race.SecondPractice.date}T${race.SecondPractice.time}`) });
    if (race.ThirdPractice) currentSessions.push({ name: 'Practice 3', time: new Date(`${race.ThirdPractice.date}T${race.ThirdPractice.time}`) });
    if (race.SprintQualifying) currentSessions.push({ name: 'Sprint Quali', time: new Date(`${race.SprintQualifying.date}T${race.SprintQualifying.time}`) });
    if (race.Sprint) currentSessions.push({ name: 'Sprint', time: new Date(`${race.Sprint.date}T${race.Sprint.time}`) });
    if (race.Qualifying) currentSessions.push({ name: 'Qualifying', time: new Date(`${race.Qualifying.date}T${race.Qualifying.time}`) });
    currentSessions.push({ name: 'Race', time: new Date(`${race.date}T${race.time}`) });

    currentSessions.sort((a, b) => a.time - b.time);

    renderSessionsList();
    
    // Find next session for countdown
    const now = new Date();
    let nextSession = currentSessions.find(s => s.time > now);

    if (nextSession) {
      document.getElementById('session-badge').textContent = `${nextSession.name.toUpperCase()} UPCOMING`;
      document.getElementById('session-badge').style.display = 'inline-block';
      startCountdown(nextSession.time);
    } else {
      document.getElementById('session-badge').textContent = 'WEEKEND COMPLETED';
      document.getElementById('session-badge').style.display = 'inline-block';
      stopCountdown();
    }

    fetchWikipediaInfo(race.Circuit.url);
  }

  function renderSessionsList() {
    const listContainer = document.getElementById('sessions-list');
    listContainer.innerHTML = '';
    
    const now = new Date();
    const race = races[currentRaceIndex];
    const trackTz = circuitTimezones[race.Circuit.circuitId] || 'UTC';

    currentSessions.forEach(session => {
      const isPast = session.time < now;
      const isNext = !isPast && (currentSessions.find(s => s.time > now) === session);
      
      const row = document.createElement('div');
      row.className = `session-row ${isPast ? 'completed' : ''} ${isNext ? 'next-up' : ''}`;
      
      let displayTime = '';
      let displayDate = '';

      if (showLocalTime) {
        displayTime = session.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        displayDate = session.time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
      } else {
        displayTime = session.time.toLocaleTimeString('en-US', { timeZone: trackTz, hour: '2-digit', minute: '2-digit', hour12: true });
        displayDate = session.time.toLocaleDateString('en-US', { timeZone: trackTz, weekday: 'short', month: 'short', day: 'numeric' });
      }

      row.innerHTML = `
        <div class="session-name">${session.name}</div>
        <div class="session-time">
          <span>${displayTime}</span>
          <span class="session-date">${displayDate}</span>
        </div>
      `;
      listContainer.appendChild(row);
    });
  }

  function startCountdown(targetDate) {
    if (countdownInterval) clearInterval(countdownInterval);

    const updateUI = () => {
      const now = new Date();
      const diff = targetDate - now;

      if (diff <= 0) {
        clearInterval(countdownInterval);
        document.getElementById('cd-days').textContent = '00';
        document.getElementById('cd-hours').textContent = '00';
        document.getElementById('cd-mins').textContent = '00';
        document.getElementById('cd-secs').textContent = '00';
        // Refresh to move to next session
        renderRace(currentRaceIndex);
        return;
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);

      document.getElementById('cd-days').textContent = d.toString().padStart(2, '0');
      document.getElementById('cd-hours').textContent = h.toString().padStart(2, '0');
      document.getElementById('cd-mins').textContent = m.toString().padStart(2, '0');
      document.getElementById('cd-secs').textContent = s.toString().padStart(2, '0');
    };

    updateUI();
    countdownInterval = setInterval(updateUI, 1000);
  }

  function stopCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);
    document.getElementById('cd-days').textContent = '00';
    document.getElementById('cd-hours').textContent = '00';
    document.getElementById('cd-mins').textContent = '00';
    document.getElementById('cd-secs').textContent = '00';
  }

  async function fetchWikipediaInfo(wikiUrl) {
    try {
      const title = wikiUrl.split('/').pop();
      const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`);
      const data = await response.json();

      const trackImg = document.getElementById('track-image');
      const trackFact = document.getElementById('track-fact');
      const imgWrapper = document.querySelector('.img-wrapper');

      if (data.thumbnail && data.thumbnail.source) {
        trackImg.src = data.thumbnail.source;
        trackImg.style.display = 'block';
        imgWrapper.style.display = 'flex';
      } else {
        trackImg.style.display = 'none';
        imgWrapper.style.display = 'none';
      }

      if (data.extract) {
        const summary = data.extract.length > 150 ? data.extract.substring(0, 147) + '...' : data.extract;
        trackFact.textContent = summary;
      } else {
        trackFact.textContent = "Circuit details unavailable.";
      }
    } catch (error) {
      console.error('Error fetching Wiki data:', error);
      document.getElementById('track-fact').textContent = 'Unable to fetch circuit details.';
      document.querySelector('.img-wrapper').style.display = 'none';
    }
  }

  async function fetchStandings() {
    try {
      // Fetch Drivers
      const dRes = await fetch('https://api.jolpi.ca/ergast/f1/current/driverStandings.json');
      const dData = await dRes.json();
      const drivers = dData.MRData.StandingsTable.StandingsLists[0].DriverStandings;
      
      const dList = document.getElementById('drivers-list');
      dList.innerHTML = '';
      
      drivers.forEach(d => {
        const teamName = d.Constructors[0] ? d.Constructors[0].name : 'N/A';
        const teamId = d.Constructors[0] ? d.Constructors[0].constructorId : '';
        const row = document.createElement('div');
        row.className = 'table-row';
        row.innerHTML = `
          <div style="background-color: ${getTeamColor(teamId)}; width: 3px; height: 30px; margin-right: 12px; border-radius: 2px;"></div>
          <div class="col-pos">${d.position}</div>
          <div class="col-main">
            <span>${d.Driver.givenName} ${d.Driver.familyName}</span>
            <span class="sub-text">${teamName}</span>
          </div>
          <div class="col-pts">${d.points}</div>
        `;
        dList.appendChild(row);
      });

      // Fetch Constructors
      const cRes = await fetch('https://api.jolpi.ca/ergast/f1/current/constructorStandings.json');
      const cData = await cRes.json();
      const constructors = cData.MRData.StandingsTable.StandingsLists[0].ConstructorStandings;

      const cList = document.getElementById('constructors-list');
      cList.innerHTML = '';
      
      constructors.forEach(c => {
        const row = document.createElement('div');
        row.className = 'table-row';
        row.innerHTML = `
          <div style="background-color: ${getTeamColor(c.Constructor.constructorId)}; width: 3px; height: 20px; margin-right: 12px; border-radius: 2px;"></div>
          <div class="col-pos">${c.position}</div>
          <div class="col-main">
            <span>${c.Constructor.name}</span>
          </div>
          <div class="col-pts">${c.points}</div>
        `;
        cList.appendChild(row);
      });

    } catch (error) {
      console.error('Error fetching standings:', error);
      document.getElementById('drivers-list').innerHTML = '<div class="table-row">Error loading data.</div>';
      document.getElementById('constructors-list').innerHTML = '<div class="table-row">Error loading data.</div>';
    }
  }

  function getTeamColor(constructorId) {
    const colors = {
      'red_bull': '#3671C6',
      'mercedes': '#27F4D2',
      'ferrari': '#E8002D',
      'mclaren': '#FF8000',
      'aston_martin': '#229971',
      'alpine': '#0093CC',
      'williams': '#64C4FF',
      'rb': '#6692FF',
      'sauber': '#52E252',
      'haas': '#B6BABD',
      'audi': '#F40A3C',
      'cadillac': '#FFD700'
    };
    return colors[constructorId] || '#ffffff';
  }
});
