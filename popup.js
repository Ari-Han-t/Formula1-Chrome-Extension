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

  // Modal Elements
  const modal = document.getElementById('session-modal');
  const modalClose = document.getElementById('modal-close');
  const storyContainer = document.getElementById('modal-story-container');
  const storyText = document.getElementById('modal-story-text');

  const resultsModal = document.getElementById('results-modal');
  const resultsModalClose = document.getElementById('results-modal-close');
  const viewResultsBtn = document.getElementById('view-results-btn');

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
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
      });
    });

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

    modalClose.addEventListener('click', () => {
      modal.classList.remove('active');
    });

    resultsModalClose.addEventListener('click', () => {
      resultsModal.classList.remove('active');
    });

    viewResultsBtn.addEventListener('click', () => {
      resultsModal.classList.add('active');
    });
  }

  async function fetchRaces() {
    try {
      const response = await fetch('https://api.jolpi.ca/ergast/f1/current.json');
      const data = await response.json();
      races = data.MRData.RaceTable.Races;

      const now = new Date();
      currentRaceIndex = races.findIndex(race => {
        const raceTime = new Date(`${race.date}T${race.time}`);
        return raceTime > now;
      });

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
    
    prevRaceBtn.disabled = index === 0;
    nextRaceBtn.disabled = index === races.length - 1;

    if (animationClass) {
      calendarView.classList.remove('slide-left', 'slide-right');
      void calendarView.offsetWidth; 
      calendarView.classList.add(animationClass);
    }

    document.getElementById('race-name').textContent = race.raceName;
    document.getElementById('round-badge').textContent = `Round ${race.round}`;
    document.getElementById('circuit-name').textContent = race.Circuit.circuitName;

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
    
    const now = new Date();
    const raceTime = new Date(`${race.date}T${race.time}`);
    const isPast = raceTime < now;

    if (isPast) {
      document.getElementById('countdown-container').style.display = 'none';
      document.getElementById('session-badge').textContent = 'WEEKEND COMPLETED';
      document.getElementById('past-race-summary').style.display = 'flex';
      stopCountdown();
      fetchRaceResults(race.round);
    } else {
      document.getElementById('countdown-container').style.display = 'flex';
      document.getElementById('past-race-summary').style.display = 'none';
      
      let nextSession = currentSessions.find(s => s.time > now);
      if (nextSession) {
        document.getElementById('session-badge').textContent = `${nextSession.name.toUpperCase()} UPCOMING`;
        startCountdown(nextSession.time);
      } else {
        document.getElementById('session-badge').textContent = 'WEEKEND COMPLETED';
        stopCountdown();
      }
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
      row.title = "Click to view session details";
      
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

      row.addEventListener('click', () => {
        openSessionModal(session.name, race);
      });

      listContainer.appendChild(row);
    });
  }

  function openSessionModal(sessionName, race) {
    document.getElementById('modal-session-title').textContent = sessionName;
    
    let desc = "";
    if (sessionName.includes('Practice')) desc = "Free Practice sessions allow teams to test car setups, evaluate tire degradation, and get drivers familiarized with the track conditions.";
    else if (sessionName.includes('Qualifying')) desc = "Qualifying determines the starting grid for the race. It's split into three knockout segments (Q1, Q2, Q3) where the slowest drivers are eliminated.";
    else if (sessionName.includes('Sprint')) desc = "The Sprint is a short, fast-paced dash with no mandatory pit stops. It awards points to the top finishers.";
    else if (sessionName === 'Race') desc = "The main event! Drivers battle it out to claim victory and score maximum championship points.";

    document.getElementById('modal-session-desc').textContent = desc;

    if (sessionName === 'Race') {
        storyContainer.style.display = 'block';
        storyText.textContent = 'Fetching latest storylines...';
        fetchStoryForRace(race.url);
    } else {
        storyContainer.style.display = 'none';
    }

    modal.classList.add('active');
  }

  async function fetchStoryForRace(wikiUrl) {
    try {
      const title = wikiUrl.split('/').pop();
      const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`);
      const data = await response.json();
      
      if (data.extract) {
        storyText.textContent = data.extract;
      } else {
        storyText.textContent = "No specific storylines available for this race yet.";
      }
    } catch (e) {
      storyText.textContent = "Unable to fetch storylines.";
    }
  }

  async function fetchRaceResults(round) {
    try {
      const listContainer = document.getElementById('full-results-list');
      listContainer.innerHTML = '<div class="loading-spinner"></div>';

      const response = await fetch(`https://api.jolpi.ca/ergast/f1/current/${round}/results.json`);
      const data = await response.json();
      
      if (!data.MRData.RaceTable.Races || data.MRData.RaceTable.Races.length === 0) {
         document.getElementById('podium-p1').textContent = 'N/A';
         document.getElementById('podium-p2').textContent = 'N/A';
         document.getElementById('podium-p3').textContent = 'N/A';
         document.getElementById('fl-driver').textContent = 'N/A';
         listContainer.innerHTML = '<div class="table-row">Results not yet available.</div>';
         return;
      }

      const results = data.MRData.RaceTable.Races[0].Results;
      
      // Populate Podium
      if (results.length > 0) document.getElementById('podium-p1').textContent = results[0].Driver.familyName;
      if (results.length > 1) document.getElementById('podium-p2').textContent = results[1].Driver.familyName;
      if (results.length > 2) document.getElementById('podium-p3').textContent = results[2].Driver.familyName;

      // Find Fastest Lap
      let flDriver = "N/A";
      for (const res of results) {
        if (res.FastestLap && res.FastestLap.rank === "1") {
          flDriver = `${res.Driver.givenName} ${res.Driver.familyName} (${res.FastestLap.Time.time})`;
          break;
        }
      }
      document.getElementById('fl-driver').textContent = flDriver;

      // Populate Full Results Table
      listContainer.innerHTML = '';
      results.forEach(res => {
        const teamName = res.Constructor.name;
        const color = getTeamColor(res.Constructor.constructorId);
        let timeOrStatus = res.Time ? res.Time.time : res.status;

        const row = document.createElement('div');
        row.className = 'table-row';
        row.innerHTML = `
          <div style="background-color: ${color}; width: 3px; height: 30px; margin-right: 12px; border-radius: 2px;"></div>
          <div class="col-pos">${res.position}</div>
          <div class="col-main">
            <span>${res.Driver.givenName} ${res.Driver.familyName}</span>
            <span class="sub-text">${teamName}</span>
          </div>
          <div class="col-pts" style="display:flex; flex-direction:column; align-items:flex-end;">
             <span>${timeOrStatus}</span>
             <span class="sub-text">${res.points} pts</span>
          </div>
        `;
        listContainer.appendChild(row);
      });

    } catch (error) {
      console.error('Error fetching race results:', error);
      document.getElementById('full-results-list').innerHTML = '<div class="table-row">Error loading results.</div>';
    }
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
      // Drivers
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

      // Constructors
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

      // Populate Battles
      populateBattles(drivers, constructors);

      // Populate Predictions
      calculatePredictions(drivers);

    } catch (error) {
      console.error('Error fetching standings:', error);
      document.getElementById('drivers-list').innerHTML = '<div class="table-row">Error loading data.</div>';
      document.getElementById('constructors-list').innerHTML = '<div class="table-row">Error loading data.</div>';
      document.getElementById('driver-battle').innerHTML = '<p>Error loading battles.</p>';
      document.getElementById('constructor-battle').innerHTML = '<p>Error loading battles.</p>';
    }
  }

  function populateBattles(drivers, constructors) {
    // Top 2 Drivers
    if (drivers.length >= 2) {
      const p1 = drivers[0];
      const p2 = drivers[1];
      const gap = parseInt(p1.points) - parseInt(p2.points);
      const p1Color = getTeamColor(p1.Constructors[0] ? p1.Constructors[0].constructorId : '');
      const p2Color = getTeamColor(p2.Constructors[0] ? p2.Constructors[0].constructorId : '');

      document.getElementById('driver-battle').innerHTML = `
        <div class="vs-row" style="border-left-color: ${p1Color}">
          <div class="vs-name">${p1.Driver.familyName}</div>
          <div class="vs-pts">${p1.points} pts</div>
        </div>
        <div class="vs-divider">VS</div>
        <div class="vs-row" style="border-left-color: ${p2Color}">
          <div class="vs-name">${p2.Driver.familyName}</div>
          <div class="vs-pts">${p2.points} pts</div>
        </div>
        <div class="gap-text">Gap: ${gap} points</div>
      `;
    }

    // Top 2 Constructors
    if (constructors.length >= 2) {
      const t1 = constructors[0];
      const t2 = constructors[1];
      const gap = parseInt(t1.points) - parseInt(t2.points);
      const t1Color = getTeamColor(t1.Constructor.constructorId);
      const t2Color = getTeamColor(t2.Constructor.constructorId);

      document.getElementById('constructor-battle').innerHTML = `
        <div class="vs-row" style="border-left-color: ${t1Color}">
          <div class="vs-name">${t1.Constructor.name}</div>
          <div class="vs-pts">${t1.points} pts</div>
        </div>
        <div class="vs-divider">VS</div>
        <div class="vs-row" style="border-left-color: ${t2Color}">
          <div class="vs-name">${t2.Constructor.name}</div>
          <div class="vs-pts">${t2.points} pts</div>
        </div>
        <div class="gap-text">Gap: ${gap} points</div>
      `;
    }
  }

  function calculatePredictions(drivers) {
    const list = document.getElementById('prediction-list');
    list.innerHTML = '';

    if (!drivers || drivers.length < 5) {
      list.innerHTML = '<p>Not enough data for predictions.</p>';
      return;
    }

    // Take top 5
    const top5 = drivers.slice(0, 5);
    
    // Add weights: Current points + slight chaos factor
    let totalScore = 0;
    const scoredDrivers = top5.map((d, index) => {
      // The leader gets a slight baseline boost based on position (e.g. P1 gets +20, P2 gets +15)
      const positionWeight = (5 - index) * 5; 
      // Chaos factor: random number between 0 and 20
      const chaos = Math.floor(Math.random() * 20);
      
      const rawScore = parseInt(d.points) + positionWeight + chaos;
      totalScore += rawScore;
      
      return {
        driver: d,
        score: rawScore
      };
    });

    // We sort again just in case the chaos factor shuffled the order slightly
    scoredDrivers.sort((a, b) => b.score - a.score);

    // Calculate percentages and render
    scoredDrivers.forEach(sd => {
      const percentage = Math.round((sd.score / totalScore) * 100);
      const teamId = sd.driver.Constructors[0] ? sd.driver.Constructors[0].constructorId : '';
      const color = getTeamColor(teamId);

      const row = document.createElement('div');
      row.className = 'pred-row';
      row.innerHTML = `
        <div class="pred-header">
          <span>${sd.driver.Driver.givenName} ${sd.driver.Driver.familyName}</span>
          <span class="pred-prob">${percentage}%</span>
        </div>
        <div class="pred-bar-bg">
          <div class="pred-bar-fill" style="background-color: ${color}; width: 0%;" data-width="${percentage}%"></div>
        </div>
      `;
      list.appendChild(row);
    });

    // Animate bars after a short delay
    setTimeout(() => {
      const bars = list.querySelectorAll('.pred-bar-fill');
      bars.forEach(bar => {
        bar.style.width = bar.getAttribute('data-width');
      });
    }, 100);
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
