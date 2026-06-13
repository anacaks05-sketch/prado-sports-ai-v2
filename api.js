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
    const days = Math.max(0, Math.min(7, Number(PRADO_CONFIG.DAYS_AHEAD || 3)));

    // 1) Ao vivo. Se não tiver jogo ao vivo agora, a API pode retornar vazio — isso é normal.
    mergeFixtures(byId, await safeGet('ao vivo', 'fixtures', { live: 'all', timezone: tz }));

    // 2) Hoje + próximos dias, com data no fuso do Brasil.
    for(let i=0; i<=days; i++){
      mergeFixtures(byId, await safeGet(`dia ${ymd(i)}`, 'fixtures', { date: ymd(i), timezone: tz }));
    }

    // 3) Se não encontrou nada por data, tenta a busca ampla de próximos jogos.
    // Isso ajuda quando não há jogo hoje ou quando o calendário da API não retorna por data.
    if(byId.size === 0){
      mergeFixtures(byId, await safeGet('próximos jogos', 'fixtures', { next: 25, timezone: tz }));
    }

    // 4) Se ainda estiver vazio, tenta intervalo hoje → próximos 7 dias.
    if(byId.size === 0){
      mergeFixtures(byId, await safeGet('intervalo da semana', 'fixtures', { from: ymd(0), to: ymd(7), timezone: tz }));
    }

    // 5) Para preencher resultados recentes quando não há jogos futuros.
    // Só roda depois que já tentamos jogos atuais/próximos para economizar chamadas.
    if(byId.size === 0){
      mergeFixtures(byId, await safeGet('resultados recentes', 'fixtures', { last: 15, timezone: tz }));
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
    const code = String(league?.name || 'Liga').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^A-Za-z]/g,'').slice(0,8).toUpperCase() + String(league?.id || '').slice(-3);
    if(!LEAGUES[code]){
      LEAGUES[code] = {
        name: league?.name || 'Liga',
        country: league?.country || '',
        icon: league?.country === 'Brazil' ? '🇧🇷' : '🏆',
        color: '#21E6A1',
        logo: league?.logo || '',
        tier: 'API-Sports'
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

  return { fetchMatches, makePredictions };
})();
