/* =====================================================
   PRADO SPORTS AI — Camada de API real
   Converte API-Football para o mesmo formato que o app já usa.
===================================================== */

const PradoAPI = (() => {
  function headers(){
    return {
      'X-RapidAPI-Key': PRADO_CONFIG.API_KEY,
      'X-RapidAPI-Host': PRADO_CONFIG.API_HOST
    };
  }

  function ymd(offset=0){
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0,10);
  }

  async function apiGet(path){
    const res = await fetch(`${PRADO_CONFIG.API_BASE_URL}${path}`, { headers: headers() });
    if(!res.ok) throw new Error(`API erro ${res.status}`);
    const json = await res.json();
    if(json.errors && Object.keys(json.errors).length){
      console.warn('API errors:', json.errors);
    }
    return json.response || [];
  }

  async function fetchMatches(){
    const all = [];

    // Jogos ao vivo
    try{
      const live = await apiGet('/fixtures?live=all');
      all.push(...live);
    }catch(e){ console.warn('Falha ao buscar ao vivo:', e); }

    // Hoje + próximos dias
    for(let i=0; i<=Number(PRADO_CONFIG.DAYS_AHEAD || 7); i++){
      try{
        const day = await apiGet(`/fixtures?date=${ymd(i)}&timezone=${encodeURIComponent(PRADO_CONFIG.TIMEZONE || 'America/Fortaleza')}`);
        all.push(...day);
      }catch(e){ console.warn('Falha ao buscar dia', i, e); }
    }

    // remove duplicados
    const byId = new Map();
    all.forEach(item => byId.set(item.fixture.id, item));
    return [...byId.values()].map(mapFixtureToMatch).sort((a,b)=> String(a.date).localeCompare(String(b.date)));
  }

  function mapStatus(short){
    if(['1H','2H','HT','ET','BT','P','LIVE','INT'].includes(short)) return 'live';
    if(['FT','AET','PEN'].includes(short)) return 'finished';
    return 'scheduled';
  }

  function codeFromTeam(team){
    const base = String(team.name || 'TIME').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    return base.replace(/[^A-Za-z]/g,'').slice(0,3).toUpperCase() + String(team.id).slice(-2);
  }

  function upsertTeam(team){
    const code = codeFromTeam(team);
    if(!TEAMS[code]){
      TEAMS[code] = {
        name: team.name,
        color: '#21E6A1',
        logo: team.logo || ''
      };
    }
    return code;
  }

  function leagueCode(league){
    const code = String(league.name || 'Liga').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^A-Za-z]/g,'').slice(0,8).toUpperCase() + String(league.id).slice(-3);
    if(!LEAGUES[code]){
      LEAGUES[code] = {
        name: league.name || 'Liga',
        country: league.country || '',
        icon: '🏆',
        color: '#21E6A1',
        logo: league.logo || ''
      };
    }
    return code;
  }

  function mapFixtureToMatch(item){
    const home = upsertTeam(item.teams.home);
    const away = upsertTeam(item.teams.away);
    const statusShort = item.fixture.status.short;
    const status = mapStatus(statusShort);

    return {
      id: String(item.fixture.id),
      league: leagueCode(item.league),
      date: item.fixture.date,
      status,
      minute: item.fixture.status.elapsed || 0,
      home,
      away,
      hs: item.goals.home ?? 0,
      as: item.goals.away ?? 0,
      venue: [item.fixture.venue?.name, item.fixture.venue?.city].filter(Boolean).join(', '),
      round: item.league.round || '',
      stats: {
        possession:[50,50], shotsOnTarget:[0,0], shotsOffTarget:[0,0], corners:[0,0], fouls:[0,0],
        yellow:[0,0], red:[0,0], xg:[0,0], xa:[0,0], dangerousAttacks:[0,0]
      },
      events: []
    };
  }

  function makePredictions(matches){
    return matches.filter(m => m.status === 'scheduled').slice(0,12).map((m, i) => {
      const homeProb = 42 + (i % 4) * 4;
      const drawProb = 28;
      const awayProb = Math.max(10, 100 - homeProb - drawProb);
      return {
        matchId: m.id,
        confidence: Math.min(78, homeProb + 14),
        pick: TEAMS[m.home]?.name || 'Mandante',
        probs:{home:homeProb, draw:drawProb, away:awayProb},
        markets:[
          {label:'Mandante ou empate', type:'blue'},
          {label:'Over 1.5 gols', type:''},
          {label:'Ambas marcam', type:'gold'}
        ],
        reasons:[
          'Análise inicial gerada com base nos dados disponíveis da API.',
          'Para IA real, conecte um backend com dados de forma recente, odds e escalações.',
          'Este card já está no formato certo para receber uma análise premium.'
        ]
      };
    });
  }

  return { fetchMatches, makePredictions };
})();
