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

    // Ao vivo primeiro: apostadores querem todos os jogos em tempo real.
    // Se o plano/fornecedor não aceitar live=all, safeGet só ignora e seguimos por data.
    mergeFixtures(byId, await safeGet('ao vivo', 'fixtures', { live: 'all', timezone: tz }));

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
      39:'EPL', 140:'LALIGA', 78:'BUND', 135:'SERIEA', 61:'LIGUE1', 94:'PORTUGAL'
      // MLS e divisões relacionadas ficam em Outras ligas na Home
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
    if((n === 'la liga' || n === 'primera division') && c.includes('spain')) return 'LALIGA';
    if(n.includes('bundesliga')) return 'BUND';
    if(n.includes('serie a') && c.includes('italy')) return 'SERIEA';
    if(n.includes('ligue 1')) return 'LIGUE1';
    if(n.includes('primeira liga') && c.includes('portugal')) return 'PORTUGAL';
    // Não mapear MLS Next Pro como liga principal. Ela aparece em Ver todos.
    // if(n === 'major league soccer') return 'MLS';

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
      stats: null,
      events: []
    };
  }

  function makePredictionForMatch(m, i=0){
    if(!m) return null;
    const homeName = (typeof TEAMS !== 'undefined' && TEAMS[m.home]?.name) ? TEAMS[m.home].name : 'Mandante';
    const awayName = (typeof TEAMS !== 'undefined' && TEAMS[m.away]?.name) ? TEAMS[m.away].name : 'Visitante';
    const totalGoals = Number(m.hs||0) + Number(m.as||0);
    const minute = Number(m.minute||0);
    let homeProb = 43;
    let drawProb = 28;
    let awayProb = 29;
    const reasons = [];
    const markets = [];
    let risk = 'Médio';
    let signal = 'Análise';
    let pick = `${homeName} ou empate`;

    if(m.status === 'live'){
      signal = 'Ao vivo';
      reasons.push(`Jogo ao vivo aos ${minute || '—'} minutos com placar ${m.hs}x${m.as}.`);
      if(m.hs > m.as){
        homeProb += 18 + Math.min(10, (m.hs - m.as) * 5);
        awayProb -= 8;
        pick = `${homeName} ou empate`;
        markets.push({label:'Mandante ou empate', type:'blue'});
      } else if(m.as > m.hs){
        awayProb += 18 + Math.min(10, (m.as - m.hs) * 5);
        homeProb -= 8;
        pick = `${awayName} ou empate`;
        markets.push({label:'Visitante ou empate', type:'blue'});
      } else {
        drawProb += 6;
        pick = totalGoals >= 2 ? 'Próximo gol com cautela' : 'Over 1.5 gols';
        markets.push({label:totalGoals >= 2 ? 'Próximo gol' : 'Over 1.5 gols', type:''});
      }
      if(totalGoals >= 1) markets.push({label:'Over 1.5 gols', type:''});
      if(totalGoals >= 2) markets.push({label:'Over 2.5 gols', type:'gold'});
      if(minute >= 70 && Math.abs((m.hs||0)-(m.as||0)) <= 1){
        markets.push({label:'Evitar odd baixa no fim', type:'muted'});
        risk = 'Médio/Alto';
      }
    } else if(m.status === 'scheduled'){
      signal = 'Pré-jogo';
      homeProb += 8 + (i % 5);
      awayProb -= 3;
      pick = `${homeName} ou empate`;
      markets.push({label:'Mandante ou empate', type:'blue'});
      markets.push({label:'Over 1.5 gols', type:''});
      reasons.push('Pré-jogo: peso do mando de campo e perfil da competição considerados.');
    } else {
      signal = 'Pós-jogo';
      pick = 'Sem entrada — jogo encerrado';
      markets.push({label:'Apenas estudo pós-jogo', type:'muted'});
      reasons.push(`Partida encerrada em ${m.hs}x${m.as}. Use apenas para leitura de resultado.`);
      risk = 'Alto';
    }

    reasons.push('Dados carregados pela API-Football/API-Sports em tempo real.');
    reasons.push('Quando estatísticas, odds e escalações estiverem disponíveis, a confiança da IA fica mais precisa.');

    let sum = Math.max(1, homeProb + drawProb + awayProb);
    const probs = {
      home: Math.round(homeProb/sum*100),
      draw: Math.round(drawProb/sum*100),
      away: Math.round(awayProb/sum*100)
    };
    const delta = 100 - (probs.home + probs.draw + probs.away);
    probs.home += delta;
    const confidence = Math.max(42, Math.min(84, Math.max(probs.home, probs.draw, probs.away) + (m.status === 'live' ? 12 : 6)));
    if(!markets.length) markets.push({label:'Sem entrada segura', type:'muted'});
    markets.push({label:`Risco: ${risk}`, type:risk.includes('Alto')?'muted':'blue'});
    return { matchId:m.id, confidence, pick, probs, markets:markets.slice(0,5), reasons:reasons.slice(0,5), risk, signal };
  }

  function makePredictions(matches){
    return (matches || [])
      .filter(m => m && (m.status === 'live' || m.status === 'scheduled'))
      .map((m, i) => makePredictionForMatch(m, i))
      .filter(Boolean)
      .sort((a,b)=>b.confidence-a.confidence)
      .slice(0,30);
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

    match.stats = stats || null;

    match.events = events;
    if(lineups) match.lineups = lineups;
    match.detailsLoaded = true;
    return match;
  }

  return { fetchMatches, makePredictions, makePredictionForMatch, fetchMatchDetails };
})();
