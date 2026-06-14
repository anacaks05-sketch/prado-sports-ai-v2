/* =====================================================
   PRADO SPORTS AI — Camada de API real segura
   O app chama /api/football. A chave fica escondida na Vercel
   como APISPORTS_KEY, não aparece no index.html.
===================================================== */

const PradoAPI = (() => {
  function proxyUrl(){
    if(typeof PRADO_CONFIG !== 'undefined' && PRADO_CONFIG.API_PROXY_URL){
      return String(PRADO_CONFIG.API_PROXY_URL || '/api/football');
    }
    return '/api/football';
  }

  function timezone(){
    return (typeof PRADO_CONFIG !== 'undefined' && PRADO_CONFIG.TIMEZONE) ? PRADO_CONFIG.TIMEZONE : 'America/Sao_Paulo';
  }

  // Data YYYY-MM-DD respeitando o fuso configurado. Evita erro de dia por UTC.
  function ymd(offset=0){
    const tz = timezone();
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(d).reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function buildProxyUrl(endpoint, params={}){
    const url = new URL(proxyUrl(), window.location.origin);
    url.searchParams.set('endpoint', endpoint);
    Object.entries(params).forEach(([key, value]) => {
      if(value !== undefined && value !== null && value !== ''){
        url.searchParams.set(key, value);
      }
    });
    return url.toString();
  }

  function apiErrorMessage(json, fallback){
    const errors = json?.errors;
    if(!errors) return fallback;
    if(typeof errors === 'string') return errors;
    if(Array.isArray(errors)) return errors.filter(Boolean).join(' | ') || fallback;
    if(typeof errors === 'object'){
      return Object.values(errors).map(v => Array.isArray(v) ? v.join(' ') : String(v)).filter(Boolean).join(' | ') || fallback;
    }
    return fallback;
  }

  async function apiGet(endpoint, params={}){
    const res = await fetch(buildProxyUrl(endpoint, params), { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));

    if(!res.ok){
      const msg = json?.message || json?.error || apiErrorMessage(json, `API erro ${res.status}`);
      throw new Error(msg);
    }

    if(json.errors && Object.keys(json.errors).length){
      const msg = apiErrorMessage(json, 'A API retornou erro.');
      console.warn('API errors:', json.errors);
      throw new Error(msg);
    }

    return Array.isArray(json.response) ? json.response : [];
  }

  async function safeGet(label, endpoint, params={}){
    try{
      const items = await apiGet(endpoint, params);
      console.info(`Prado Sports AI API: ${label}`, items.length, params);
      return items;
    }catch(e){
      console.warn(`Falha ao buscar ${label}:`, e.message || e);
      return [];
    }
  }

  function mergeFixtures(targetMap, items){
    (items || []).forEach(item => {
      if(item?.fixture?.id) targetMap.set(String(item.fixture.id), item);
    });
  }

  async function fetchMatches(){
    const byId = new Map();
    const tz = timezone();
    const days = Math.max(0, Math.min(4, Number(PRADO_CONFIG.DAYS_AHEAD || 2)));

    // Plano grátis da API-Football não aceita o parâmetro `next`.
    // Por isso buscamos por data: hoje + próximos dias, no fuso do Brasil.
    for(let i=0; i<=days; i++){
      mergeFixtures(byId, await safeGet(`dia ${ymd(i)}`, 'fixtures', { date: ymd(i), timezone: tz }));
    }

    // Se não houver jogos futuros no período, busca resultados recentes por data
    // sem usar `last`, para continuar compatível com o plano grátis.
    if(byId.size === 0){
      for(let i=-1; i>=-3; i--){
        mergeFixtures(byId, await safeGet(`resultados ${ymd(i)}`, 'fixtures', { date: ymd(i), timezone: tz }));
        if(byId.size > 0) break;
      }
    }

    return [...byId.values()]
      .map(mapFixtureToMatch)
      .filter(Boolean)
      .sort((a,b)=> String(a.date).localeCompare(String(b.date)));
  }

  function mapStatus(short){
    if(['1H','2H','HT','ET','BT','P','LIVE','INT'].includes(short)) return 'live';
    if(['FT','AET','PEN'].includes(short)) return 'finished';
    return 'scheduled';
  }

  function codeFromTeam(team){
    const base = String(team?.name || 'TIME').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    return base.replace(/[^A-Za-z]/g,'').slice(0,3).toUpperCase() + String(team?.id || '').slice(-2);
  }

  function upsertTeam(team){
    const code = codeFromTeam(team);
    if(!TEAMS[code]){
      TEAMS[code] = {
        name: team?.name || 'Time',
        color: '#21E6A1',
        logo: team?.logo || ''
      };
    }
    return code;
  }

  function leagueCode(league){
    const id = Number(league?.id || 0);
    const canonicalById = {
      1:'WC',        // FIFA World Cup
      15:'CLUBWC',   // FIFA Club World Cup
      71:'BRA_A', 72:'BRA_B', 73:'CDB',
      13:'LIBERTA', 11:'SULAM',
      2:'UCL', 3:'UEL',
      39:'EPL', 140:'LALIGA', 78:'BUND', 135:'SERIEA', 61:'LIGUE1', 94:'PORTUGAL',
      253:'MLS'
    };
    if(canonicalById[id] && LEAGUES[canonicalById[id]]) return canonicalById[id];

    const n = String(league?.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const c = String(league?.country || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    if(n.includes('world cup') && !n.includes('club')){
      if(n.includes('qualification') || n.includes('qualifiers') || n.includes('qualifying') || n.includes('qualificacao') || n.includes('eliminatoria')) return 'ELIM';
      return 'WC';
    }
    if(n.includes('club world cup')) return 'CLUBWC';
    if(n.includes('libertadores')) return 'LIBERTA';
    if(n.includes('sudamericana') || n.includes('sul-americana')) return 'SULAM';
    if(c.includes('brazil') && (n.includes('brasileirao') || n.includes('brasileiro')) && n.includes('serie a')) return 'BRA_A';
    if(c.includes('brazil') && (n.includes('brasileirao') || n.includes('brasileiro')) && n.includes('serie b')) return 'BRA_B';
    if(n.includes('copa do brasil')) return 'CDB';
    if(n.includes('champions league')) return 'UCL';
    if(n.includes('europa league')) return 'UEL';
    if(n.includes('premier league') && c.includes('england')) return 'EPL';
    if(n.includes('la liga') && c.includes('spain')) return 'LALIGA';
    if(n.includes('bundesliga')) return 'BUND';
    if(n.includes('serie a') && c.includes('italy')) return 'SERIEA';
    if(n.includes('ligue 1')) return 'LIGUE1';
    if(n.includes('primeira liga') && c.includes('portugal')) return 'PORTUGAL';
    if(n === 'major league soccer' || n.includes('mls')) return 'MLS';

    const code = String(league?.name || 'Liga').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^A-Za-z]/g,'').slice(0,8).toUpperCase() + String(league?.id || '').slice(-3);
    if(!LEAGUES[code]){
      LEAGUES[code] = {
        name: league?.name || 'Liga',
        country: league?.country || '',
        icon: league?.country === 'Brazil' ? '🇧🇷' : '🏆',
        color: '#21E6A1',
        logo: league?.logo || '',
        tier: 'Outras ligas'
      };
    }
    return code;
  }

  function mapFixtureToMatch(item){
    if(!item?.fixture || !item?.teams?.home || !item?.teams?.away) return null;
    const home = upsertTeam(item.teams.home);
    const away = upsertTeam(item.teams.away);
    const statusShort = item.fixture.status?.short || 'NS';
    const status = mapStatus(statusShort);

    return {
      id: String(item.fixture.id),
      apiFixtureId: String(item.fixture.id),
      source: 'api-football',
      teamIds: { home: item.teams.home?.id || null, away: item.teams.away?.id || null },
      league: leagueCode(item.league || {}),
      date: item.fixture.date,
      status,
      minute: item.fixture.status?.elapsed || 0,
      home,
      away,
      hs: item.goals?.home ?? 0,
      as: item.goals?.away ?? 0,
      venue: [item.fixture.venue?.name, item.fixture.venue?.city].filter(Boolean).join(', '),
      round: item.league?.round || '',
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
          'Jogo carregado da API-Sports em tempo real.',
          'A próxima etapa é conectar odds e estatísticas avançadas para melhorar a confiança da IA.',
          'Este card já está pronto para receber análise premium mais completa.'
        ]
      };
    });
  }

  function numValue(v){
    if(v === null || v === undefined) return 0;
    if(typeof v === 'number') return v;
    const n = Number(String(v).replace('%','').replace(',','.').trim());
    return Number.isFinite(n) ? n : 0;
  }

  function readStatMap(teamStats){
    const map = {};
    (teamStats?.statistics || []).forEach(item => {
      map[String(item.type || '').toLowerCase()] = numValue(item.value);
    });
    return map;
  }

  function firstAvailable(map, names){
    for(const name of names){
      const key = String(name).toLowerCase();
      if(map[key] !== undefined) return map[key];
    }
    return 0;
  }

  function mapStatistics(statsResponse){
    if(!Array.isArray(statsResponse) || statsResponse.length < 2) return null;
    const home = readStatMap(statsResponse[0]);
    const away = readStatMap(statsResponse[1]);
    const mapped = {
      possession:[firstAvailable(home,['Ball Possession','possession']), firstAvailable(away,['Ball Possession','possession'])],
      shotsOnTarget:[firstAvailable(home,['Shots on Goal','Shots on Target']), firstAvailable(away,['Shots on Goal','Shots on Target'])],
      shotsOffTarget:[firstAvailable(home,['Shots off Goal','Shots off Target']), firstAvailable(away,['Shots off Goal','Shots off Target'])],
      corners:[firstAvailable(home,['Corner Kicks','Corners']), firstAvailable(away,['Corner Kicks','Corners'])],
      fouls:[firstAvailable(home,['Fouls']), firstAvailable(away,['Fouls'])],
      yellow:[firstAvailable(home,['Yellow Cards']), firstAvailable(away,['Yellow Cards'])],
      red:[firstAvailable(home,['Red Cards']), firstAvailable(away,['Red Cards'])],
      xg:[firstAvailable(home,['expected_goals','Expected Goals']), firstAvailable(away,['expected_goals','Expected Goals'])],
      xa:[0,0],
      dangerousAttacks:[0,0]
    };
    const hasAny = Object.values(mapped).flat().some(v => Number(v) > 0);
    return hasAny ? mapped : null;
  }

  function eventIconText(ev){
    const type = String(ev?.type || '').toLowerCase();
    const detail = String(ev?.detail || '').toLowerCase();
    if(type.includes('goal') || detail.includes('goal')) return 'goal';
    if(detail.includes('yellow')) return 'yellow';
    if(detail.includes('red')) return 'red';
    if(type.includes('subst')) return 'sub';
    if(type.includes('var') || detail.includes('var')) return 'var';
    return 'info';
  }

  function mapEvents(eventsResponse, match){
    if(!Array.isArray(eventsResponse) || !eventsResponse.length) return [];
    return eventsResponse.map(ev => {
      const teamId = ev?.team?.id;
      const side = String(teamId) === String(match?.teamIds?.home) ? 'home' : (String(teamId) === String(match?.teamIds?.away) ? 'away' : 'neutral');
      const player = ev?.player?.name ? `<b>${ev.player.name}</b>` : '';
      const assist = ev?.assist?.name ? ` Assistência: ${ev.assist.name}.` : '';
      const detail = ev?.detail || ev?.type || 'Evento';
      const comments = ev?.comments ? ` ${ev.comments}` : '';
      const elapsed = ev?.time?.elapsed || 0;
      const extra = ev?.time?.extra ? `+${ev.time.extra}` : '';
      return {
        min: `${elapsed}${extra}`,
        type: eventIconText(ev),
        team: side,
        text: `${detail}${player ? ` — ${player}` : ''}.${assist}${comments}`
      };
    });
  }

  function mapLineups(lineupsResponse){
    if(!Array.isArray(lineupsResponse) || lineupsResponse.length < 2) return null;
    const mapOne = (team) => ({
      formation: team?.formation || '—',
      players: (team?.startXI || []).slice(0,11).map((item, idx) => ({
        n: item?.player?.number || idx + 1,
        p: item?.player?.name || 'Jogador'
      }))
    });
    const home = mapOne(lineupsResponse[0]);
    const away = mapOne(lineupsResponse[1]);
    if(!home.players.length || !away.players.length) return null;
    return { home, away };
  }

  async function fetchMatchDetails(match){
    if(!match?.apiFixtureId) return match;
    const fixture = match.apiFixtureId;
    const [statsRes, eventsRes, lineupsRes] = await Promise.all([
      safeGet(`estatísticas ${fixture}`, 'fixtures/statistics', { fixture }),
      safeGet(`eventos ${fixture}`, 'fixtures/events', { fixture }),
      safeGet(`escalações ${fixture}`, 'fixtures/lineups', { fixture })
    ]);

    const stats = mapStatistics(statsRes);
    const events = mapEvents(eventsRes, match);
    const lineups = mapLineups(lineupsRes);

    if(stats) match.stats = stats;
    else if(match.stats && Object.values(match.stats).flat().every(v => Number(v) === 0)) match.stats = null;

    match.events = events;
    if(lineups) match.lineups = lineups;
    match.detailsLoaded = true;
    return match;
  }

  return { fetchMatches, makePredictions, fetchMatchDetails };
})();
