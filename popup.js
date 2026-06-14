document.addEventListener('DOMContentLoaded', () => {
  // Tab Navigation
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });

  // Data fetching and UI update
  let countdownInterval;

  async function init() {
    fetchNextRace();
    fetchStandings();
  }

  async function fetchNextRace() {
    try {
      const response = await fetch('https://api.jolpi.ca/ergast/f1/current.json');
      const data = await response.json();
      const races = data.MRData.RaceTable.Races;

      const now = new Date();
      let nextRace = null;
      let nextSessionName = '';
      let nextSessionTime = null;

      // Find the next session
      for (const race of races) {
        // Build sessions map
        const sessions = [];
        if (race.FirstPractice) sessions.push({ name: 'FP1', time: new Date(`${race.FirstPractice.date}T${race.FirstPractice.time}`) });
        if (race.SecondPractice) sessions.push({ name: 'FP2', time: new Date(`${race.SecondPractice.date}T${race.SecondPractice.time}`) });
        if (race.ThirdPractice) sessions.push({ name: 'FP3', time: new Date(`${race.ThirdPractice.date}T${race.ThirdPractice.time}`) });
        if (race.SprintQualifying) sessions.push({ name: 'Sprint Shootout', time: new Date(`${race.SprintQualifying.date}T${race.SprintQualifying.time}`) });
        if (race.Sprint) sessions.push({ name: 'Sprint', time: new Date(`${race.Sprint.date}T${race.Sprint.time}`) });
        if (race.Qualifying) sessions.push({ name: 'Qualifying', time: new Date(`${race.Qualifying.date}T${race.Qualifying.time}`) });
        sessions.push({ name: 'Race', time: new Date(`${race.date}T${race.time}`) });

        // Sort by time
        sessions.sort((a, b) => a.time - b.time);

        // Find first future session
        for (const session of sessions) {
          if (session.time > now) {
            nextRace = race;
            nextSessionName = session.name;
            nextSessionTime = session.time;
            break;
          }
        }
        
        if (nextRace) break;
      }

      if (nextRace) {
        document.getElementById('race-name').textContent = nextRace.raceName;
        document.getElementById('session-badge').textContent = nextSessionName.toUpperCase();
        document.getElementById('circuit-name').textContent = nextRace.Circuit.circuitName;
        
        startCountdown(nextSessionTime);
        fetchWikipediaInfo(nextRace.Circuit.url);
      } else {
        document.getElementById('race-name').textContent = 'Season Over';
        document.getElementById('session-badge').style.display = 'none';
        document.getElementById('circuit-name').textContent = 'Check back next season!';
      }

    } catch (error) {
      console.error('Error fetching race data:', error);
      document.getElementById('race-name').textContent = 'Error loading';
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

  async function fetchWikipediaInfo(wikiUrl) {
    try {
      const title = wikiUrl.split('/').pop();
      const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`);
      const data = await response.json();

      const trackImg = document.getElementById('track-image');
      const trackFact = document.getElementById('track-fact');

      if (data.thumbnail && data.thumbnail.source) {
        trackImg.src = data.thumbnail.source;
        trackImg.style.display = 'block';
      } else {
        document.querySelector('.img-wrapper').style.display = 'none';
      }

      if (data.extract) {
        // limit to ~150 chars
        const summary = data.extract.length > 150 ? data.extract.substring(0, 147) + '...' : data.extract;
        trackFact.textContent = summary;
      }
    } catch (error) {
      console.error('Error fetching Wiki data:', error);
      document.getElementById('track-fact').textContent = 'Unable to fetch circuit details.';
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

  init();
});
