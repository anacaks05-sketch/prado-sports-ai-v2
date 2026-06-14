/* =====================================================
   PRADO SPORTS AI — App logic
===================================================== */

const state = {
  page: 'home',
  rankTab: 'scorers',
  liveFilter: 'live',
  newsTab: 'highlights',
  favTeam: localStorage.getItem('prado_fav_team') || '',
  favLeague: localStorage.getItem('prado_fav_league') || '',
  favMatches: JSON.parse(localStorage.getItem('prado_fav_matches') || '[]'),
  theme: 'dark',
  notifSettings: JSON.parse(localStorage.getItem('prado_notifs') || JSON.stringify({
    gol:true, cartao:true, escanteio:false, inicio:true, fim:true, entrada:false
  })),
};

const PRADO_PAYMENT_CONFIG = {
  planName: 'Prado Sports AI Premium',
  price: 'R$ 19,90/mês',
  checkoutUrl: 'https://mpago.la/1mg8mFi',
  whatsapp: '5598982356674',
  whatsappMessage: 'Olá, acabei de assinar o Prado Sports AI Premium e quero liberar meu acesso.'
};

const PRADO_PREMIUM_STORAGE_KEY = 'prado_premium_access_v1';

function openPremiumCheckout(){
  window.open(PRADO_PAYMENT_CONFIG.checkoutUrl, '_blank', 'noopener,noreferrer');
}

function openPremiumSupport(){
  const message = encodeURIComponent(PRADO_PAYMENT_CONFIG.whatsappMessage);
  window.open(`https://wa.me/${PRADO_PAYMENT_CONFIG.whatsapp}?text=${message}`, '_blank', 'noopener,noreferrer');
}

function normalizePremiumCode(value){
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}

function normalizePremiumKey(value){
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function normalizePremiumStatus(value){
  return normalizePremiumKey(value || 'ativo');
}

function parsePremiumDate(value){
  const text = String(value || '').trim();
  if(!text) return null;

  let match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if(match){
    let day = Number(match[1]);
    let month = Number(match[2]);
    let year = Number(match[3]);
    if(year < 100) year += 2000;
    return new Date(year, month - 1, day, 23, 59, 59);
  }

  match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if(match){
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 23, 59, 59);
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isPremiumDateActive(value){
  const date = parsePremiumDate(value);
  if(!date) return true;
  return date.getTime() >= Date.now();
}

function premiumDateLabel(value){
  const date = parsePremiumDate(value);
  if(!date) return 'sem data de vencimento';
  return date.toLocaleDateString('pt-BR');
}

function getPremiumAccess(){
  try{
    const saved = JSON.parse(localStorage.getItem(PRADO_PREMIUM_STORAGE_KEY) || 'null');
    if(!saved || saved.status !== 'ativo') return null;
    if(saved.validUntil && !isPremiumDateActive(saved.validUntil)){
      localStorage.removeItem(PRADO_PREMIUM_STORAGE_KEY);
      return null;
    }
    return saved;
  }catch(err){
    localStorage.removeItem(PRADO_PREMIUM_STORAGE_KEY);
    return null;
  }
}

function isPremiumActive(){
  return !!getPremiumAccess();
}

function savePremiumAccess(record){
  const payload = {
    status: 'ativo',
    code: normalizePremiumCode(record.code),
    name: record.name || '',
    whatsapp: record.whatsapp || '',
    validUntil: record.validUntil || '',
    activatedAt: new Date().toISOString()
  };
  localStorage.setItem(PRADO_PREMIUM_STORAGE_KEY, JSON.stringify(payload));
  return payload;
}

function removePremiumAccess(){
  localStorage.removeItem(PRADO_PREMIUM_STORAGE_KEY);
  toast('Acesso Premium removido deste aparelho.', 'ℹ️');
  renderMoreSub('premium');
}

function premiumCodesUrl(){
  if(typeof PRADO_CONFIG !== 'undefined' && PRADO_CONFIG.PREMIUM_CODES_URL){
    const url = String(PRADO_CONFIG.PREMIUM_CODES_URL).trim();
    if(url && !url.includes('COLE_AQUI')) return url;
  }
  return '';
}

function withCacheBust(url){
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}_=${Date.now()}`;
}

function parsePremiumCSV(text){
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for(let i=0; i<text.length; i++){
    const ch = text[i];
    const next = text[i + 1];

    if(ch === '"'){
      if(quoted && next === '"'){
        field += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if(ch === ',' && !quoted){
      row.push(field);
      field = '';
    } else if((ch === '\n' || ch === '\r') && !quoted){
      if(ch === '\r' && next === '\n') i++;
      row.push(field);
      if(row.some(cell => String(cell).trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  row.push(field);
  if(row.some(cell => String(cell).trim() !== '')) rows.push(row);
  if(!rows.length) return [];

  const headers = rows.shift().map(h => String(h || '').replace(/^\uFEFF/, '').trim());
  return rows.map(values => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = String(values[i] || '').trim());
    return obj;
  });
}

function readPremiumField(row, fieldNames){
  const wanted = fieldNames.map(normalizePremiumKey);
  for(const key of Object.keys(row)){
    if(wanted.includes(normalizePremiumKey(key))) return String(row[key] || '').trim();
  }
  return '';
}

async function fetchPremiumCodes(){
  const url = premiumCodesUrl();
  if(!url){
    throw new Error('A lista externa de códigos ainda não foi configurada em config.js.');
  }

  const res = await fetch(withCacheBust(url), { cache: 'no-store' });
  if(!res.ok){
    throw new Error('Não consegui consultar a lista de códigos agora.');
  }

  const text = await res.text();
  const clean = text.trim();
  if(!clean) return [];

  if(clean.startsWith('{') || clean.startsWith('[')){
    const json = JSON.parse(clean);
    return Array.isArray(json) ? json : (Array.isArray(json.codes) ? json.codes : []);
  }

  return parsePremiumCSV(clean);
}

function normalizePremiumRow(row){
  return {
    code: normalizePremiumCode(readPremiumField(row, ['codigo','código','code','codigopremium','codigo premium','acesso','chave'])),
    status: normalizePremiumStatus(readPremiumField(row, ['status','situacao','situação','ativo'])),
    validUntil: readPremiumField(row, ['validade','vencimento','expira','expiracao','expiração','validuntil','validade premium']),
    name: readPremiumField(row, ['nome','cliente','name']),
    whatsapp: readPremiumField(row, ['whatsapp','telefone','celular','phone'])
  };
}

async function findPremiumCode(code){
  const wanted = normalizePremiumCode(code);
  const rows = await fetchPremiumCodes();
  return rows.map(normalizePremiumRow).find(row => row.code === wanted) || null;
}

async function unlockPremiumWithCode(){
  const input = document.getElementById('premium-code');
  const btn = document.getElementById('premium-unlock-btn');
  const code = normalizePremiumCode(input?.value);

  if(!code){
    toast('Digite o código Premium para liberar.', '🔐');
    return;
  }

  if(input) input.value = code;
  if(btn){
    btn.disabled = true;
    btn.textContent = 'Verificando...';
  }

  try{
    const record = await findPremiumCode(code);
    if(!record){
      throw new Error('Código não encontrado. Confira o código ou chame no WhatsApp.');
    }

    const activeStatuses = ['ativo','active','liberado','pago','ok','sim'];
    if(!activeStatuses.includes(record.status)){
      throw new Error('Esse código ainda não está ativo ou foi bloqueado.');
    }

    if(record.validUntil && !isPremiumDateActive(record.validUntil)){
      throw new Error('Esse código Premium está vencido.');
    }

    const access = savePremiumAccess(record);
    toast('Prado Premium liberado com sucesso!', '💎');
    renderMoreSub('premium');

    setTimeout(() => {
      const msg = access.validUntil ? `Acesso ativo até ${premiumDateLabel(access.validUntil)}.` : 'Acesso ativo neste aparelho.';
      toast(msg, '✅');
    }, 500);
  }catch(err){
    toast(err.message || 'Não consegui liberar o Premium agora.', '⚠️');
  }finally{
    if(btn){
      btn.disabled = false;
      btn.textContent = 'Liberar Premium';
    }
  }
}

async function validateStoredPremium(){
  const access = getPremiumAccess();
  const url = premiumCodesUrl();
  if(!access || !url) return;

  try{
    const record = await findPremiumCode(access.code);
    const activeStatuses = ['ativo','active','liberado','pago','ok','sim'];
    if(!record || !activeStatuses.includes(record.status) || (record.validUntil && !isPremiumDateActive(record.validUntil))){
      localStorage.removeItem(PRADO_PREMIUM_STORAGE_KEY);
      toast('Seu acesso Premium precisa ser renovado.', '🔐');
    } else {
      savePremiumAccess(record);
    }
  }catch(err){
    console.info('Validação Premium offline/indisponível:', err.message);
  }
}



// ===================== PREMIUM SVG ICONS =====================
const PRADO_ICONS = {
  live:'<span class="premium-icon live"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"></circle><path d="M4.9 19.1a10 10 0 0 1 0-14.2M19.1 4.9a10 10 0 0 1 0 14.2"></path></svg></span>',
  calendar:'<span class="premium-icon"><svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="3"></rect><path d="M8 3v4M16 3v4M4 10h16"></path></svg></span>',
  next:'<span class="premium-icon"><svg viewBox="0 0 24 24"><path d="M5 5v14l9-7zM16 5v14"></path></svg></span>',
  chart:'<span class="premium-icon"><svg viewBox="0 0 24 24"><path d="M5 19V5M5 19h14"></path><path d="M8 15l3-3 3 2 4-6"></path></svg></span>',
  trophy:'<span class="premium-icon gold"><svg viewBox="0 0 24 24"><path d="M8 4h8v4a4 4 0 0 1-8 0z"></path><path d="M8 6H4a4 4 0 0 0 4 4M16 6h4a4 4 0 0 1-4 4M12 12v5M9 20h6M10 17h4"></path></svg></span>',
  ai:'<span class="premium-icon ai"><svg viewBox="0 0 24 24"><path d="M12 2l1.6 5.7L19 10l-5.4 2.3L12 18l-1.6-5.7L5 10l5.4-2.3z"></path></svg></span>',
  ball:'<span class="premium-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M12 7l4 3-1.5 5h-5L8 10z"></path></svg></span>',
  note:'<span class="premium-icon"><svg viewBox="0 0 24 24"><path d="M7 4h8l4 4v12H7z"></path><path d="M15 4v5h5M10 13h7M10 17h5"></path></svg></span>'
};

// ===================== REAL API LOADER =====================
async function loadRealDataIfConfigured(){
  // Nunca mostrar jogos/palpites/odds demo para o cliente.
  MATCHES = [];
  PREDICTIONS = [];

  if (typeof PRADO_CONFIG === 'undefined' || !PRADO_CONFIG.API_PROXY_URL) {
    console.info('Prado Sports AI: rota segura da API não configurada. Dados demo desativados.');
    window.PRADO_API_STATUS = { ok:false, message:'API não configurada' };
    return;
  }

  try{
    const realMatches = await PradoAPI.fetchMatches();
    if(Array.isArray(realMatches) && realMatches.length){
      MATCHES = realMatches;
      PREDICTIONS = PradoAPI.makePredictions(realMatches);
      window.PRADO_API_STATUS = { ok:true, message:`${realMatches.length} jogos reais carregados` };
      console.info(`Prado Sports AI: ${realMatches.length} jogos reais carregados da API.`);
    } else {
      MATCHES = [];
      PREDICTIONS = [];
      window.PRADO_API_STATUS = { ok:true, message:'API conectada, mas sem jogos no filtro atual' };
      console.info('Prado Sports AI: API conectada, mas sem jogos reais no filtro atual.');
    }
  }catch(err){
    MATCHES = [];
    PREDICTIONS = [];
    window.PRADO_API_STATUS = { ok:false, message: err?.message || 'Erro ao carregar API' };
    console.error('Erro ao carregar API:', err);
  }
}

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', async () => {
  setTimeout(()=>document.getElementById('splash-screen')?.classList.add('hide'), 1350);
  applyTheme('dark');
  await loadRealDataIfConfigured();
  await validateStoredPremium();
  bindNav();
  renderHome();
  renderLive();
  renderAI();
  renderRankings();
  renderMore();
  bindDetailOverlay();
  setupInstall();
  registerSW();
  simulateLiveTicks();
});

function toast(msg, icon='✅'){
  const t = document.getElementById('toast');
  t.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(()=>t.classList.remove('show'), 2400);
}

// ===================== THEME =====================
function applyTheme(){
  document.documentElement.setAttribute('data-theme', 'dark');
  state.theme = 'dark';
  localStorage.setItem('prado_theme', 'dark');
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if(metaTheme) metaTheme.setAttribute('content', '#050B14');
}
function toggleTheme(){ applyTheme(); }

// ===================== NAV =====================
function bindNav(){
  document.querySelectorAll('.nav-item').forEach(btn=>{
    btn.addEventListener('click', ()=> goToPage(btn.dataset.page));
  });
  const themeBtn = document.getElementById('theme-btn');
  if(themeBtn) themeBtn.addEventListener('click', toggleTheme);
  document.getElementById('search-btn').addEventListener('click', openSearch);
}
function goToPage(page){
  state.page = page;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active', n.dataset.page===page));
  window.scrollTo(0,0);
}
function showMoreSub(view){
  document.getElementById('more-menu').style.display = 'none';
  document.getElementById('more-sub').style.display = 'block';
  renderMoreSub(view);
}
function hideMoreSub(){
  document.getElementById('more-sub').style.display = 'none';
  document.getElementById('more-menu').style.display = 'block';
}


// ===================== FILTRO PREMIUM DE JOGOS =====================
const PRADO_PRIORITY_LEAGUES = {
  WC:1000, CLUBWC:980, LIBERTA:940, SULAM:900,
  BRA_A:930, BRA_B:760, CDB:880,
  UCL:920, UEL:840, EPL:880, LALIGA:860, SERIEA:840, BUND:830, LIGUE1:800, PORTUGAL:760
};
// Home do Prado: só competições premium/realmente grandes.
// Eliminatórias, amistosos, divisões menores e MLS ficam em Ver todos.
const PRADO_HOME_LEAGUES = new Set(['WC','CLUBWC','BRA_A','CDB','LIBERTA','SULAM','UCL','UEL','EPL','LALIGA','SERIEA','BUND','LIGUE1','PORTUGAL']);
const PRADO_EXCLUDED_HOME_WORDS = [
  'u20','u21','u23','sub 20','sub-20','youth','reserves','reserve','women','feminino',
  'npl','state league','regional','county','amateur','serie d','serie c','série d','série c',
  'paulista','carioca','mineiro','gaucho','gaúcho','capixaba','pernambucano','paraibano','potiguar',
  'copa peru','segunda division','segunda división','liga 2','division 2','a2','a3','a4','ii',
  'qualification','qualifier','qualifiers','qualifying','qualif','eliminatoria','eliminatorias',
  'friendly','friendlies','amistoso','amistosos','next pro','mls next','reserve league'
];
const PRADO_BIG_TEAM_WORDS = [
  'brasil','brazil','flamengo','palmeiras','corinthians','sao paulo','são paulo','botafogo','fluminense','gremio','grêmio','internacional','atletico','atlético','bahia','vasco','cruzeiro','santos',
  'real madrid','barcelona','manchester city','manchester united','liverpool','arsenal','chelsea','bayern','psg','paris saint','juventus','inter','milan','atletico madrid','atlético madrid',
  'argentina','france','frança','england','inglaterra','spain','espanha','portugal','germany','alemanha','morocco','marrocos','uruguay','uruguai','colombia','colômbia'
];
function textNorm(value){
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
}
function matchPriorityScore(m){
  const lg = leagueOf(m);
  const leagueName = textNorm(lg.name);
  const country = textNorm(lg.country);
  const tier = textNorm(lg.tier);
  const round = textNorm(m.round || '');
  const homeName = textNorm(teamName(m.home));
  const awayName = textNorm(teamName(m.away));
  const name = `${leagueName} ${country} ${tier} ${round} ${homeName} ${awayName}`;
  let score = PRADO_PRIORITY_LEAGUES[m.league] || 0;

  const isQualifier = name.includes('qualif') || name.includes('eliminatoria') || name.includes('eliminatorias');
  const isBrazilNationalSerieA = (leagueName.includes('brasileirao') || leagueName.includes('brasileiro')) && leagueName.includes('serie a');
  const isBrazilNationalSerieB = (leagueName.includes('brasileirao') || leagueName.includes('brasileiro')) && leagueName.includes('serie b');

  if((leagueName.includes('world cup') || leagueName.includes('copa do mundo')) && !isQualifier) score += 1000;
  if(leagueName.includes('club world cup') || leagueName.includes('mundial de clubes')) score += 980;
  if(leagueName.includes('libertadores')) score += 940;
  if(leagueName.includes('sul-americana') || leagueName.includes('sudamericana')) score += 900;
  if(isBrazilNationalSerieA) score += 900;
  if(isBrazilNationalSerieB) score += 560;
  if(leagueName.includes('copa do brasil')) score += 880;
  if(leagueName.includes('champions league')) score += 920;
  if(leagueName.includes('premier league') && country.includes('england')) score += 880;
  if(leagueName === 'la liga' && (country.includes('spain') || country.includes('espanha'))) score += 860;
  if(leagueName.includes('serie a') && (country.includes('italy') || country.includes('italia'))) score += 840;
  if(leagueName.includes('bundesliga') && (country.includes('germany') || country.includes('alemanha'))) score += 830;
  if(leagueName.includes('ligue 1') && (country.includes('france') || country.includes('franca'))) score += 800;
  if(leagueName.includes('primeira liga') && country.includes('portugal')) score += 760;

  const bigCount = [homeName, awayName].filter(t => PRADO_BIG_TEAM_WORDS.some(w => t.includes(textNorm(w)))).length;
  if(bigCount === 1) score += 220;
  if(bigCount >= 2) score += 460;
  if(m.status === 'live') score += 140;
  if(m.status === 'scheduled') score += 50;

  if(PRADO_EXCLUDED_HOME_WORDS.some(w => name.includes(w))) score -= 900;
  return score;
}
function isHomeMainEligible(m){
  const lg = leagueOf(m);
  const name = textNorm(`${lg.name} ${lg.country} ${lg.tier} ${m.round||''} ${teamName(m.home)} ${teamName(m.away)}`);

  // Regras rígidas da Home: nada de eliminatórias, amistosos, Sub-20, reservas,
  // estaduais/regionais, ligas pequenas ou competições com nome parecido com liga grande.
  if(PRADO_EXCLUDED_HOME_WORDS.some(w => name.includes(w))) return false;
  if(!PRADO_HOME_LEAGUES.has(m.league)) return false;

  // Proteção extra: só aceita La Liga/Premier/Bundesliga/Serie A/Ligue 1 quando o mapeamento é canônico.
  // Isso evita “Copa de La Liga”, “MLS Next Pro” e nomes parecidos aparecerem como principais.
  if(m.league === 'LALIGA' && !(textNorm(lg.name) === 'la liga' && textNorm(lg.country).includes('espanha'))) return false;
  if(m.league === 'EPL' && !textNorm(lg.country).includes('inglaterra')) return false;
  if(m.league === 'SERIEA' && !textNorm(lg.country).includes('ital')) return false;
  if(m.league === 'BUND' && !textNorm(lg.country).includes('alemanha')) return false;
  if(m.league === 'LIGUE1' && !textNorm(lg.country).includes('fran')) return false;

  return true;
}
function sortMatchesPremium(list){
  return [...list].sort((a,b)=>{
    const diff = matchPriorityScore(b) - matchPriorityScore(a);
    if(diff) return diff;
    return String(a.date).localeCompare(String(b.date));
  });
}
function mainMatches(list, max=6, minScore=700, allowFallback=false){
  const sorted = sortMatchesPremium(list);
  const important = sorted.filter(m => isHomeMainEligible(m) && matchPriorityScore(m) >= minScore);
  const selected = important.length || !allowFallback ? important : sorted.filter(isHomeMainEligible);
  return selected.slice(0, max);
}
function groupedLeagueCodesPremium(byLeague){
  return Object.keys(byLeague).sort((a,b)=>{
    const sa = Math.max(...byLeague[a].map(matchPriorityScore));
    const sb = Math.max(...byLeague[b].map(matchPriorityScore));
    return sb - sa;
  });
}

// ===================== HOME =====================
function renderHome(){
  const liveAll = sortMatchesPremium(MATCHES.filter(m=>m.status==='live'));
  // Ao vivo mostra todos os jogos reais. Apostador gosta de tela cheia no live.
  const live = liveAll;
  const todayKey = todayYMD();
  const todayAll = sortMatchesPremium(MATCHES.filter(m=>isSameDay(m.date, todayKey) && m.status!=='live'));
  const today = mainMatches(todayAll, 6, 820, false);
  const upcomingAll = sortMatchesPremium(MATCHES.filter(m=>!isSameDay(m.date,todayKey) && m.status==='scheduled'));
  const upcoming = mainMatches(upcomingAll, 4, 820, false);
  const recent = mainMatches(MATCHES.filter(m=>m.status==='finished'), 3, 820, false);
  const topPicks = [...PREDICTIONS].sort((a,b)=>b.confidence-a.confidence).slice(0,3);

  let html = '';

  // Live
  html += sectionHead(PRADO_ICONS.live + 'Ao vivo agora', live.length?`${live.length} jogos`:null);
  if(live.length){
    html += `<div class="hscroll">`;
    live.forEach(m=> html += liveCard(m));
    html += `</div>`;
  } else {
    html += emptyState(PRADO_ICONS.ball,'Nenhum jogo ao vivo neste momento');
  }

  // Today's games
  html += sectionHead(PRADO_ICONS.calendar + 'Jogos principais de hoje', todayAll.length>today.length?'Ver todos':null, ()=>{ goToPage('more'); showMoreSub('calendar'); });
  html += `<div class="card home-list-card">`;
  if(today.length) today.forEach(m=> html += matchRow(m));
  else html += emptyState(PRADO_ICONS.calendar,'Sem jogos principais hoje. Toque em Ver todos para ver a lista completa.');
  html += `</div>`;

  // Upcoming
  html += sectionHead(PRADO_ICONS.next + 'Próximos jogos', 'Ver calendário', ()=>{ goToPage('more'); showMoreSub('calendar'); });
  html += `<div class="card home-list-card">`;
  if(upcoming.length) upcoming.forEach(m=> html += matchRow(m, true));
  else html += emptyState(PRADO_ICONS.calendar,'Sem próximos jogos principais no momento.');
  html += `</div>`;

  // Recent results
  html += sectionHead(PRADO_ICONS.chart + 'Resultados recentes', null);
  html += `<div class="card home-list-card">`;
  if(recent.length) recent.forEach(m=> html += matchRow(m));
  else html += emptyState(PRADO_ICONS.chart,'Sem resultados principais recentes');
  html += `</div>`;

  // Featured competitions
  html += sectionHead(PRADO_ICONS.trophy + 'Campeonatos em destaque', 'Ver todos', ()=>{ goToPage('more'); showMoreSub('competitions'); });
  html += `<div class="comp-grid">`;
  ['WC','BRA_A','UCL','LIBERTA'].forEach(code=> html += compTile(code));
  html += `</div>`;

  // AI ranking
  html += sectionHead(PRADO_ICONS.ai + 'Ranking dos melhores palpites', 'Ver IA completa', ()=> goToPage('ai'));
  html += `<div class="card" style="padding:4px 10px">`;
  if(topPicks.length){
    topPicks.forEach((p,i)=>{
      const m = MATCHES.find(x=>x.id===p.matchId);
      if(!m) return;
      html += `<div class="rank-row" onclick="openMatchDetail('${m.id}','ai')" style="cursor:pointer">
        <div class="rank-pos">${i+1}</div>
        <div class="rank-info">
          <div class="rank-name">${teamName(m.home)} x ${teamName(m.away)}</div>
          <div class="rank-sub">Sinal IA: ${p.pick} · ${leagueOf(m).name}</div>
        </div>
        <div class="rank-val" style="color:var(--accent)">${p.confidence}%<small>confiança</small></div>
      </div>`;
    });
  } else {
    html += emptyState(PRADO_ICONS.ai,'A IA vai listar oportunidades quando houver jogos com dados suficientes.');
  }
  html += `</div>`;

  document.getElementById('page-home').innerHTML = html;

}

function sectionHead(title, linkLabel, onClick){
  const id = 'lnk_'+Math.random().toString(36).slice(2);
  if(linkLabel) window['_'+id] = onClick;
  return `<div class="section-head">
    <div class="section-title"><span class="dot"></span>${title}</div>
    ${linkLabel ? `<div class="section-link" onclick="(${onClick?onClick.toString():'()=>{}'})()">${linkLabel}</div>` : ''}
  </div>`;
}

function emptyState(icon, text){
  return `<div class="empty"><div class="ic">${icon}</div>${text}</div>`;
}

function liveCard(m){
  const lg = leagueOf(m);
  return `<div class="live-card" onclick="openMatchDetail('${m.id}')">
    <div class="league-tag"><span>${lg.icon}</span>${lg.name}</div>
    <div class="team-row"><div class="team-info">${crestHTML(m.home)}${teamName(m.home)}</div><div class="score">${m.hs}</div></div>
    <div class="team-row"><div class="team-info">${crestHTML(m.away)}${teamName(m.away)}</div><div class="score">${m.as}</div></div>
    <div class="live-meta">
      <span class="live-badge"><span class="live-dotpulse"></span>${m.minute}'</span>
      <span>${m.venue ? m.venue.split(',')[0] : ''}</span>
    </div>
  </div>`;
}

function matchRow(m, showDate){
  const lg = leagueOf(m);
  const isFav = state.favMatches.includes(m.id);
  let timeBlock;
  if(m.status==='live') timeBlock = `<div class="match-time live">${m.minute}'<div class="min">●LIVE</div></div>`;
  else if(m.status==='finished') timeBlock = `<div class="match-time">FIM<div class="min">${fmtDate(m.date)}</div></div>`;
  else timeBlock = `<div class="match-time">${fmtTime(m.date)}${showDate?`<div class="min">${fmtDate(m.date)}</div>`:''}</div>`;

  const scoreBlock = (m.status==='scheduled')
    ? `<div class="match-score" style="color:var(--text-faint)">vs</div>`
    : `<div class="match-score"><span>${m.hs}</span><span>${m.as}</span></div>`;

  return `<div class="match-row" onclick="openMatchDetail('${m.id}')">
    ${timeBlock}
    <div class="match-teams">
      <div class="t">${crestHTML(m.home,20)}${teamName(m.home)}</div>
      <div class="t">${crestHTML(m.away,20)}${teamName(m.away)}</div>
    </div>
    ${scoreBlock}
    <div class="match-extra" onclick="event.stopPropagation(); toggleFavMatch('${m.id}')">${isFav?'⭐':'☆'}</div>
  </div>`;
}

function compTile(code){
  const lg = LEAGUES[code];
  return `<div class="comp-tile" onclick="goToPage('live'); setLiveLeagueFilter('${code}')">
    <div class="crest" style="background:${lg.color}">${lg.icon}</div>
    <div><div class="name">${lg.name}</div><div class="country">${lg.country}</div></div>
  </div>`;
}

function newsCard(n){
  const click = n.matchId ? ` onclick="openMatchDetail('${n.matchId}')" style="cursor:pointer"` : '';
  return `<div class="news-card"${click}>
    <div class="news-thumb">${n.icon}</div>
    <div class="news-body">
      <div class="news-tag">${n.tag}</div>
      <div class="news-title">${n.title}</div>
      <div class="news-meta">${n.time}</div>
    </div>
  </div>`;
}

function toggleFavMatch(id){
  const i = state.favMatches.indexOf(id);
  if(i>-1){ state.favMatches.splice(i,1); toast('Removido dos favoritos','☆'); }
  else { state.favMatches.push(id); toast('Jogo adicionado aos favoritos! Você será notificado de gols.','⭐'); }
  localStorage.setItem('prado_fav_matches', JSON.stringify(state.favMatches));
  renderHome(); renderLive();
}

function todayYMD(offsetDays=0){
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0,10);
}
function isSameDay(iso, ymd){ return String(iso || '').startsWith(ymd); }

// ===================== LIVE CENTER =====================
let liveLeagueFilter = null;
function setLiveLeagueFilter(code){ liveLeagueFilter = code; state.liveFilter='all'; renderLive(); }

function renderLive(){
  const filters = [
    {id:'live', label:'🔴 Ao vivo'},
    {id:'today', label:'Hoje'},
    {id:'tomorrow', label:'Amanhã'},
    {id:'week', label:'Esta semana'},
    {id:'all', label:'Todos'},
  ];
  let html = `<div class="section-head" style="margin-top:4px"><div class="section-title display">📺 Central de Jogos</div></div>`;
  html += `<div class="chip-row">`;
  filters.forEach(f=> html += `<div class="chip ${state.liveFilter===f.id?'active':''}" onclick="setLiveFilter('${f.id}')">${f.label}</div>`);
  html += `</div>`;

  if(liveLeagueFilter){
    html += `<div class="chip-row"><div class="chip active">${LEAGUES[liveLeagueFilter].icon} ${LEAGUES[liveLeagueFilter].name}
      <span style="margin-left:8px;cursor:pointer" onclick="liveLeagueFilter=null;renderLive()">✕</span></div></div>`;
  }

  const list = sortMatchesPremium(filterMatches(state.liveFilter).filter(m=> !liveLeagueFilter || m.league===liveLeagueFilter));

  // group by league
  const byLeague = {};
  list.forEach(m=>{ (byLeague[m.league] = byLeague[m.league]||[]).push(m); });

  if(Object.keys(byLeague).length===0){
    html += emptyState('📭','Nenhum jogo encontrado para esse filtro');
  } else {
    groupedLeagueCodesPremium(byLeague).forEach(code=>{
      const lg = LEAGUES[code];
      html += `<div class="league-block">
        <div class="league-head">${crestHTML(code===code?code:code,22).replace('crest','crest')}
        </div>
      </div>`;
    });
    // rebuild properly (avoid the placeholder above)
    html = html.replace(/<div class="league-block">[\s\S]*?<\/div>\s*<\/div>\s*$/,'');
  }

  document.getElementById('page-live').innerHTML = html;

  // append league blocks properly (separate pass for clarity & correctness)
  if(Object.keys(byLeague).length){
    const container = document.getElementById('page-live');
    groupedLeagueCodesPremium(byLeague).forEach(code=>{
      const lg = LEAGUES[code];
      const block = document.createElement('div');
      block.className = 'league-block';
      block.innerHTML = `
        <div class="league-head" style="margin-bottom:6px">
          <div class="crest" style="background:${lg.color}">${lg.icon}</div>
          <div class="league-head-text">
            <div class="league-head-name">${lg.name}</div>
            <div class="league-head-country">${lg.country} · ${lg.tier}</div>
          </div>
        </div>
        <div class="card" style="padding:0 8px">
          ${byLeague[code].map(m=>matchRow(m, state.liveFilter!=='today' && state.liveFilter!=='live')).join('')}
        </div>`;
      container.appendChild(block);
    });
  }
}

function setLiveFilter(id){ state.liveFilter = id; liveLeagueFilter=null; renderLive(); }

function filterMatches(filter){
  const today = todayYMD();
  const tomorrow = todayYMD(1);
  switch(filter){
    case 'live': return MATCHES.filter(m=>m.status==='live');
    case 'today': return MATCHES.filter(m=>isSameDay(m.date,today));
    case 'tomorrow': return MATCHES.filter(m=>isSameDay(m.date,tomorrow));
    case 'week': {
      const start = todayYMD();
      const end = todayYMD(7);
      return MATCHES.filter(m=> m.date >= start && m.date < end);
    }
    default: return MATCHES;
  }
}

// ===================== AI PREDICTIONS =====================

function getPredictionForMatch(match){
  if(!match) return null;
  const existing = PREDICTIONS.find(x=>x.matchId===match.id);
  if(existing) return existing;
  return buildLocalAIInsight(match);
}
function clamp(n,min,max){ return Math.max(min, Math.min(max, Number(n)||0)); }
function teamShortName(code){ return teamName(code).replace(/\s+(FC|SC|EC|AC|Clube)$/i,'').trim(); }
function buildLocalAIInsight(m){
  if(!m) return null;
  const stats = m.stats || null;
  const hasStats = statsHasValues(stats);
  const home = teamShortName(m.home);
  const away = teamShortName(m.away);
  const totalGoals = Number(m.hs||0) + Number(m.as||0);
  const minute = Number(m.minute||0);
  let homeSignal = 44;
  let drawSignal = 28;
  let awaySignal = 28;
  const reasons = [];
  const markets = [];
  let risk = 'Médio';
  let signal = 'Observação';
  let pick = 'Aguardar melhor oportunidade';

  if(m.status === 'live'){
    reasons.push(`Partida ao vivo aos ${minute || '—'} minutos, com placar ${m.hs}x${m.as}.`);
    if(m.hs > m.as){
      homeSignal += 18 + Math.min(12, m.hs - m.as)*4;
      awaySignal -= 10;
      pick = `${home} ou empate`;
      markets.push({label:'Mandante ou empate', type:'blue'});
      signal = 'Proteção no placar';
    } else if(m.as > m.hs){
      awaySignal += 18 + Math.min(12, m.as - m.hs)*4;
      homeSignal -= 10;
      pick = `${away} ou empate`;
      markets.push({label:'Visitante ou empate', type:'blue'});
      signal = 'Proteção no placar';
    } else {
      drawSignal += 8;
      pick = totalGoals >= 2 ? 'Over 2.5 / Próximo gol' : 'Over 1.5 gols';
      markets.push({label: totalGoals >= 2 ? 'Próximo gol com cautela' : 'Over 1.5 gols', type:''});
      signal = 'Jogo aberto';
    }
    if(totalGoals >= 1) markets.push({label:'Over 1.5 gols', type:''});
    if(totalGoals >= 2) markets.push({label:'Over 2.5 gols', type:'gold'});
  } else if(m.status === 'scheduled'){
    reasons.push('Jogo pré-live: análise baseada no peso da liga, mando de campo e força relativa do confronto.');
    homeSignal += 8;
    pick = `${home} ou empate`;
    markets.push({label:'Mandante ou empate', type:'blue'});
    markets.push({label:'Over 1.5 gols', type:''});
    signal = 'Pré-jogo';
  } else {
    reasons.push(`Jogo encerrado com placar ${m.hs}x${m.as}. Use para estudo, não para entrada.`);
    pick = 'Sem entrada — jogo encerrado';
    markets.push({label:'Apenas análise pós-jogo', type:'muted'});
    signal = 'Encerrado';
    risk = 'Alto';
  }

  if(hasStats){
    const hShots = Number(stats.shotsOnTarget?.[0]||0) + Number(stats.shotsOffTarget?.[0]||0);
    const aShots = Number(stats.shotsOnTarget?.[1]||0) + Number(stats.shotsOffTarget?.[1]||0);
    const hCorners = Number(stats.corners?.[0]||0);
    const aCorners = Number(stats.corners?.[1]||0);
    const hPoss = Number(stats.possession?.[0]||0);
    const aPoss = Number(stats.possession?.[1]||0);
    const pressureHome = hShots + hCorners*1.5 + Math.max(0,hPoss-50)/5;
    const pressureAway = aShots + aCorners*1.5 + Math.max(0,aPoss-50)/5;
    if(pressureHome > pressureAway + 3){
      homeSignal += 10;
      reasons.push(`${home} aparece com mais volume ofensivo nos dados disponíveis.`);
      markets.push({label:`Pressão ${home}`, type:'gold'});
    } else if(pressureAway > pressureHome + 3){
      awaySignal += 10;
      reasons.push(`${away} aparece com mais volume ofensivo nos dados disponíveis.`);
      markets.push({label:`Pressão ${away}`, type:'gold'});
    } else {
      reasons.push('Estatísticas equilibradas até aqui; entrada precisa de cautela.');
      risk = 'Médio/Alto';
    }
    if(hCorners + aCorners >= 6) markets.push({label:'Mais escanteios ao vivo', type:'gold'});
  } else {
    reasons.push('A API ainda não liberou estatísticas completas; a IA reduz a confiança e evita entrada agressiva.');
    risk = m.status === 'live' ? 'Médio/Alto' : 'Médio';
  }

  let total = Math.max(1, homeSignal + drawSignal + awaySignal);
  let probs = {
    home: Math.round(homeSignal/total*100),
    draw: Math.round(drawSignal/total*100),
    away: Math.round(awaySignal/total*100)
  };
  const sum = probs.home + probs.draw + probs.away;
  if(sum !== 100) probs.home += 100 - sum;
  const maxProb = Math.max(probs.home, probs.draw, probs.away);
  const confidence = clamp(maxProb + (hasStats ? 12 : 3) + (m.status === 'live' ? 6 : 0), 38, 84);
  if(!markets.length) markets.push({label:'Sem entrada segura', type:'muted'});
  markets.push({label:`Risco: ${risk}`, type:risk.includes('Alto')?'muted':'blue'});
  return { matchId:m.id, confidence, pick, probs, markets:markets.slice(0,5), reasons:reasons.slice(0,5), risk, signal };
}

function aiActionPlanHTML(p, m){
  const live = m.status === 'live';
  const score = Number(p.confidence || 0);
  let moment = live ? `Monitorar até ${Math.min(90, (Number(m.minute||0)+5))}' se o jogo mantiver o mesmo ritmo.` : 'Aguardar escalações e odds próximas ao início.';
  let entry = score >= 72 ? 'Entrada forte apenas se a odd confirmar valor.' : (score >= 60 ? 'Entrada moderada, preferência por mercado protegido.' : 'Sem entrada agressiva; observar o mercado.');
  let protect = p.risk && p.risk.includes('Alto') ? 'Reduzir stake ou evitar múltipla.' : 'Usar stake controlada e proteção em empate/dupla chance quando fizer sentido.';
  return `<div class="ai-advanced-box">
    <div><small>Entrada</small><b>${entry}</b></div>
    <div><small>Momento</small><b>${moment}</b></div>
    <div><small>Proteção</small><b>${protect}</b></div>
  </div>`;
}
function aiCardHTML(p, m, compact=false){
  const lg = leagueOf(m);
  const ringColor = p.confidence>=70 ? 'var(--accent)' : p.confidence>=55 ? 'var(--gold)' : 'var(--blue)';
  const circumference = 2*Math.PI*27;
  const offset = circumference * (1 - p.confidence/100);
  const statusLine = m.status==='live' ? `🔴 ${m.minute}' · ao vivo` : (m.status==='finished' ? `FIM · ${fmtDate(m.date)}` : `${fmtDate(m.date)} ${fmtTime(m.date)}`);
  return `<div class="card ai-card ${compact?'compact':''}">
    <div class="ai-head">
      <div class="ai-league">${lg.icon} ${lg.name}${m.round ? ` · ${m.round}` : ''}</div>
      <div class="ai-time">${statusLine}</div>
    </div>
    <div class="matchup">
      <div class="vs-teams">
        <div class="t">${crestHTML(m.home)}${teamName(m.home)}</div>
        <div class="t">${crestHTML(m.away)}${teamName(m.away)}</div>
      </div>
      <div class="confidence-ring">
        <svg width="64" height="64" viewBox="0 0 64 64">
          <circle class="ring-bg" cx="32" cy="32" r="27"/>
          <circle class="ring-fg" cx="32" cy="32" r="27" style="stroke:${ringColor};stroke-dasharray:${circumference};stroke-dashoffset:${offset}"/>
        </svg>
        <div class="ring-val"><b>${p.confidence}%</b><small>IA</small></div>
      </div>
    </div>
    <div class="ai-premium-grid">
      <div><small>Sinal</small><b>${p.signal || 'Análise'}</b></div>
      <div><small>Risco</small><b>${p.risk || 'Médio'}</b></div>
      <div><small>Placar</small><b>${m.status==='scheduled'?'Pré-jogo':`${m.hs}x${m.as}`}</b></div>
    </div>
    <div class="prob-bars">
      <span style="width:${p.probs.home}%;background:var(--accent)"></span>
      <span style="width:${p.probs.draw}%;background:var(--text-faint)"></span>
      <span style="width:${p.probs.away}%;background:var(--blue)"></span>
    </div>
    <div class="prob-legend">
      <span><b>${p.probs.home}%</b> ${teamName(m.home)}</span>
      <span><b>${p.probs.draw}%</b> Empate</span>
      <span><b>${p.probs.away}%</b> ${teamName(m.away)}</span>
    </div>
    <div style="font-size:12.5px;color:var(--text-dim);margin-bottom:4px">Leitura da IA: <b style="color:var(--text)">${p.pick}</b></div>
    ${aiActionPlanHTML(p,m)}
    <div style="font-size:11px;font-weight:700;color:var(--text-faint);text-transform:uppercase;letter-spacing:.5px;margin:10px 0 4px">Motivos</div>
    <ul class="ai-reasons">${p.reasons.map(r=>`<li>${r}</li>`).join('')}</ul>
    <div style="font-size:11px;font-weight:700;color:var(--text-faint);text-transform:uppercase;letter-spacing:.5px;margin:6px 0 8px">Mercados sugeridos</div>
    <div class="market-tags">${p.markets.map(mk=>`<span class="market-tag ${mk.type || ''}">${mk.label}</span>`).join('')}</div>
    ${compact ? '' : `<div class="ai-footer"><div class="btn ghost" onclick="openMatchDetail('${m.id}','ai')">📊 Ver partida</div><div class="btn primary" onclick="addToTicket('${m.id}')">🎟️ Add. ao bilhete</div></div>`}
  </div>`;
}
function renderAI(){
  let html = `<div class="section-head" style="margin-top:4px"><div class="section-title display">🤖 IA de Palpites</div></div>`;
  html += `<div class="card" style="padding:12px;margin-bottom:14px;background:var(--grad-card)">
    <div style="font-size:12.5px;color:var(--text-dim);line-height:1.5">
      IA Premium com leitura de <b style="color:var(--text)">placar, minuto, pressão, estatísticas quando disponíveis e risco da entrada</b>. Ela mostra oportunidades, mas também avisa quando é melhor esperar.
    </div>
  </div>`;

  const picks = [...PREDICTIONS]
    .map(p => ({ p, m: MATCHES.find(x=>x.id===p.matchId) }))
    .filter(x => x.m)
    .sort((a,b)=>b.p.confidence-a.p.confidence);

  if(!picks.length){
    html += emptyState(PRADO_ICONS.ai,'Nenhuma oportunidade premium encontrada agora. Abra a Central Ao Vivo para escolher uma partida.');
  } else {
    picks.slice(0,20).forEach(({p,m})=>{ html += aiCardHTML(p,m,false); });
  }

  document.getElementById('page-ai').innerHTML = html;
}

let ticket = [];
function addToTicket(matchId){
  const m = MATCHES.find(x=>x.id===matchId);
  const p = getPredictionForMatch(m);
  if(!m || !p){ toast('A IA ainda não tem sinal para esse jogo.','⚠️'); return; }
  if(ticket.find(t=>t.matchId===matchId)){ toast('Esse jogo já está no seu bilhete','ℹ️'); return; }
  ticket.push({matchId, pick:p.pick, market:p.markets[0]?.label || p.pick});
  toast(`${teamName(m.home)} x ${teamName(m.away)} adicionado ao bilhete (${ticket.length} jogos)`, '🎟️');
}

// ===================== NOTÍCIAS DO FUTEBOL =====================
function renderRankings(){
  renderFootballNews();
}

function realNewsItems(){
  const items = [];
  const live = sortMatchesPremium(MATCHES.filter(m=>m.status==='live'));
  const finished = sortMatchesPremium(MATCHES.filter(m=>m.status==='finished'));
  const scheduled = sortMatchesPremium(MATCHES.filter(m=>m.status==='scheduled'));
  live.slice(0,8).forEach(m=>items.push({icon:'🔴', tag:'AO VIVO', title:`${teamName(m.home)} ${m.hs}x${m.as} ${teamName(m.away)} — ${m.minute || 0}'`, time:`${leagueOf(m).name}`, cat:isBrazilLeague(m)?'brasileirao':isEuropeLeague(m)?'europa':'highlights', matchId:m.id}));
  finished.slice(0,6).forEach(m=>items.push({icon:'🏁', tag:'RESULTADO', title:`Fim: ${teamName(m.home)} ${m.hs}x${m.as} ${teamName(m.away)}`, time:`${fmtDate(m.date)} · ${leagueOf(m).name}`, cat:isBrazilLeague(m)?'brasileirao':isEuropeLeague(m)?'europa':'highlights', matchId:m.id}));
  scheduled.slice(0,8).forEach(m=>items.push({icon:'📅', tag:'PRÉ-JOGO', title:`${teamName(m.home)} x ${teamName(m.away)} às ${fmtTime(m.date)}`, time:`${fmtDate(m.date)} · ${leagueOf(m).name}`, cat:isBrazilLeague(m)?'brasileirao':isEuropeLeague(m)?'europa':'highlights', matchId:m.id}));
  return items;
}
function isBrazilLeague(m){ const lg = leagueOf(m); return /brasil|brazil/i.test(`${lg.country} ${lg.name}`); }
function isEuropeLeague(m){ const lg = leagueOf(m); return /(premier|la liga|bundesliga|serie a|ligue 1|champions|europa|portugal|inglaterra|espanha|alemanha|italia|franca)/i.test(`${lg.country} ${lg.name}`); }
function renderFootballNews(){
  const tabs = [
    {id:'highlights', label:'🔥 Destaques'},
    {id:'brasileirao', label:'⚽ Brasileirão'},
    {id:'europa', label:'🌍 Europa'},
    {id:'mercado', label:'💰 Mercado'},
  ];
  const all = realNewsItems();
  const list = state.newsTab==='mercado'
    ? []
    : all.filter(n => state.newsTab==='highlights' ? true : n.cat===state.newsTab);

  let html = `<div class="section-head" style="margin-top:4px"><div class="section-title display">📰 Notícias do futebol</div></div>`;
  html += `<div class="news-hero card">
    <div class="news-hero-badge">Tempo real</div>
    <div class="news-hero-title">Atualizações reais dos jogos</div>
    <div class="news-hero-sub">Sem notícia demo: esta aba mostra eventos e partidas reais carregadas da API.</div>
  </div>`;
  html += `<div class="chip-row news-tabs" style="margin:12px 0 8px">`;
  tabs.forEach(t=> html += `<div class="chip ${state.newsTab===t.id?'active':''}" onclick="setNewsTab('${t.id}')">${t.label}</div>`);
  html += `</div>`;
  html += `<div class="card news-list" style="padding:4px 10px;margin-top:8px">`;
  if(list.length){
    list.forEach(n=> html += newsCard(n));
  } else if(state.newsTab==='mercado'){
    html += emptyState('💰','Notícias de mercado reais ainda não estão conectadas. Próxima etapa: integrar RSS/API de notícias para transferências.');
  } else {
    html += emptyState('📰','Nenhuma atualização real encontrada nesta categoria agora.');
  }
  html += `</div>`;
  document.getElementById('page-rank').innerHTML = html;
}

function setNewsTab(id){ state.newsTab = id; renderFootballNews(); }
function setRankTab(id){ state.rankTab = id; renderRankings(); }

// ===================== MAIS (MENU) =====================
function renderMore(){
  const root = document.getElementById('page-more');
  let html = `<div class="section-head" style="margin-top:4px"><div class="section-title display">☰ Mais</div></div>`;

  html += `<div id="more-menu">`;

  html += menuSection('Explorar', [
    {icon:'🏆', label:'Competições', action:`showMoreSub('competitions')`},
    {icon:'📅', label:'Calendário', action:`showMoreSub('calendar')`},
    {icon:'🔥', label:'Odds', action:`showMoreSub('odds')`, badge:'AO VIVO'},
    {icon:'⭐', label:'Favoritos', action:`showMoreSub('favorites')`},
  ]);

  html += menuSection('Prado Premium', [
    {icon:'🤖', label:'IA Avançada & Bilhetes prontos', action:`showMoreSub('premium')`, premium:true},
    {icon:'📈', label:'Simulador de apostas', action:`showMoreSub('simulator')`, premium:true},
    {icon:'🔎', label:'Scanner de valor', action:`showMoreSub('scanner')`, premium:true},
  ]);

  html += menuSection('Conta', [
    {icon:'🔔', label:'Notificações', action:`showMoreSub('notifications')`},
    {icon:'⚙️', label:'Configurações', action:`showMoreSub('settings')`},
    {icon:'ℹ️', label:'Sobre o Prado Sports AI', action:`showMoreSub('about')`},
  ]);

  html += `</div>`;

  html += `<div id="more-sub" style="display:none">
    <div class="detail-head" style="padding:0 0 14px;border-bottom:none">
      <button class="icon-btn" onclick="hideMoreSub()">←</button>
      <div id="more-sub-title" style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:16px"></div>
    </div>
    <div id="more-sub-body"></div>
  </div>`;

  root.innerHTML = html;
}

function menuSection(label, items){
  let h = `<div class="menu-section"><div class="menu-label">${label}</div><div class="card" style="padding:0 12px">`;
  items.forEach(it=>{
    h += `<div class="menu-item ${it.premium?'premium':''}" onclick="${it.action}">
      <div class="menu-icon">${it.icon}</div>
      <div>${it.label}</div>
      ${it.badge?`<span class="badge-new">${it.badge}</span>`:''}
      <div class="chev">›</div>
    </div>`;
  });
  h += `</div></div>`;
  return h;
}

function renderMoreSub(view){
  document.getElementById('more-sub-title').textContent = {
    competitions:'Competições', calendar:'Calendário', odds:'Odds',
    favorites:'Favoritos', premium:'Prado Premium', simulator:'Simulador de apostas',
    scanner:'Scanner de valor', notifications:'Notificações', settings:'Configurações',
    install:'Instalar aplicativo', about:'Sobre'
  }[view];

  const body = document.getElementById('more-sub-body');
  if(['simulator','scanner'].includes(view) && !isPremiumActive()){
    body.innerHTML = renderPremiumLocked(view);
    return;
  }

  if(view==='competitions') body.innerHTML = renderCompetitionsSub();
  else if(view==='calendar') body.innerHTML = renderCalendarSub();
  else if(view==='odds') body.innerHTML = renderOddsSub();
  else if(view==='favorites') body.innerHTML = renderFavoritesSub();
  else if(view==='premium') body.innerHTML = renderPremiumSub();
  else if(view==='simulator') { body.innerHTML = renderSimulatorSub(); bindSimulator(); }
  else if(view==='scanner') body.innerHTML = renderScannerSub();
  else if(view==='notifications') { body.innerHTML = renderNotificationsSub(); bindNotifSwitches(); }
  else if(view==='settings') { body.innerHTML = renderSettingsSub(); bindSettings(); }
  else if(view==='install') body.innerHTML = renderInstallSub();
  else if(view==='about') body.innerHTML = renderAboutSub();
}

// ---- Competitions ----
function renderCompetitionsSub(){
  let h = `<div class="comp-grid">`;
  COMPETITIONS_LIST.forEach(code=> h += compTile(code));
  h += `</div>`;
  return h;
}

// ---- Calendar ----
function renderCalendarSub(){
  const filters = [
    {id:'today', label:'Hoje'},{id:'tomorrow', label:'Amanhã'},
    {id:'week', label:'Esta semana'},{id:'all', label:'Tudo'}
  ];
  let h = `<div class="chip-row">`;
  filters.forEach((f,i)=> h += `<div class="chip ${i===0?'active':''}" data-cal="${f.id}" onclick="calFilter('${f.id}',this)">${f.label}</div>`);
  h += `</div><div id="cal-list"></div>`;
  setTimeout(()=>document.getElementById('cal-list').innerHTML = calMatches('today'),0);
  return h;
}
function calFilter(id, el){
  el.parentElement.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('cal-list').innerHTML = calMatches(id);
}
function calMatches(filter){
  const list = sortMatchesPremium(filterMatches(filter));
  if(!list.length) return emptyState('📭','Nenhum jogo nesse período');
  return `<div class="card" style="padding:0 8px;margin-top:8px">${list.map(m=>matchRow(m,true)).join('')}</div>`;
}

// ---- Odds ----
function renderOddsSub(){
  let h = `<div class="card" style="padding:10px 12px;margin-bottom:12px;background:var(--grad-card)">
    <div style="font-size:12px;color:var(--text-dim);line-height:1.5">Comparação de odds entre abertura e mercado atual. Valores ilustrativos fornecidos pelo <b style="color:var(--text)">Prado Odds</b>.</div>
  </div>`;
  ODDS.forEach(o=>{
    const m = MATCHES.find(x=>x.id===o.matchId);
    const lg = leagueOf(m);
    h += `<div class="card" style="padding:12px;margin-bottom:10px">
      <div style="font-size:11px;color:var(--text-faint);margin-bottom:8px">${lg.icon} ${lg.name}</div>
      <div class="t" style="font-weight:700;font-size:13px;margin-bottom:8px">${teamName(m.home)} <span style="color:var(--text-faint)">x</span> ${teamName(m.away)}</div>
      <div style="display:flex;gap:8px">
        ${oddsBox('Casa', o.open.h, o.now.h)}
        ${oddsBox('Empate', o.open.d, o.now.d)}
        ${oddsBox('Fora', o.open.a, o.now.a)}
      </div>
      <div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center">
        <span class="market-tag gold">Favorito: ${o.fav}</span>
        <span style="font-size:10.5px;color:var(--text-faint)">${o.book}</span>
      </div>
    </div>`;
  });
  return h;
}
function oddsBox(label, open, now){
  const diff = (now-open);
  const arrow = diff>0.001 ? '▲' : diff<-0.001 ? '▼' : '–';
  const color = diff>0.001 ? 'var(--accent)' : diff<-0.001 ? 'var(--live)' : 'var(--text-faint)';
  return `<div style="flex:1;text-align:center;background:var(--surface-2);border-radius:10px;padding:8px">
    <div style="font-size:10px;color:var(--text-faint);margin-bottom:4px">${label}</div>
    <div class="mono" style="font-weight:700;font-size:14px">${now.toFixed(2)}</div>
    <div class="mono" style="font-size:10px;color:${color};margin-top:2px">${arrow} de ${open.toFixed(2)}</div>
  </div>`;
}

// ---- Favorites ----
function renderFavoritesSub(){
  let h = '';
  h += `<div class="menu-label">Time favorito</div>`;
  h += `<div class="card" style="padding:0 12px;margin-bottom:16px">${favTeamRow()}</div>`;

  h += `<div class="menu-label">Jogos favoritos</div>`;
  if(!state.favMatches.length){
    h += `<div class="card">${emptyState('⭐','Toque na estrela ☆ ao lado de um jogo para favoritá-lo e receber alertas de gol')}</div>`;
  } else {
    h += `<div class="card" style="padding:0 8px">${state.favMatches.map(id=>{
      const m = MATCHES.find(x=>x.id===id);
      return m ? matchRow(m,true) : '';
    }).join('')}</div>`;
  }
  return h;
}
function favTeamRow(){
  const options = Object.keys(TEAMS).map(code=>`<option value="${code}" ${state.favTeam===code?'selected':''}>${teamName(code)}</option>`).join('');
  return `<div class="setting-row" style="border-bottom:none">
    <div><div class="setting-label">Selecionar time</div><div class="setting-sub">Receba destaque e alertas do seu time</div></div>
    <select onchange="setFavTeam(this.value)" style="background:var(--surface-2);color:var(--text);border:1px solid var(--border-soft);border-radius:8px;padding:8px;font-size:12px">
      <option value="">Nenhum</option>${options}
    </select>
  </div>`;
}
function setFavTeam(code){ state.favTeam=code; localStorage.setItem('prado_fav_team',code); toast(code?`${teamName(code)} definido como seu time! ⭐`:'Time favorito removido'); }

// ---- Premium ----
function renderPremiumUnlockBox(){
  return `<div class="card premium-unlock-card">
    <div class="unlock-head">
      <div class="unlock-icon">🔐</div>
      <div>
        <div class="unlock-title">Liberar acesso por código</div>
        <div class="unlock-sub">Depois de pagar, digite o código Premium que você recebeu no WhatsApp.</div>
      </div>
    </div>
    <div class="premium-code-row">
      <input id="premium-code" class="premium-code-input" type="text" inputmode="text" autocomplete="off" placeholder="Ex: PRADO-JOAO-9823" onkeyup="if(event.key==='Enter') unlockPremiumWithCode()">
      <button id="premium-unlock-btn" class="btn primary premium-unlock-btn" onclick="unlockPremiumWithCode()">Liberar Premium</button>
    </div>
    <div class="premium-code-help">Seu código é conferido na lista externa. Você pode cadastrar novos clientes sem publicar na Vercel de novo.</div>
  </div>`;
}

function renderPremiumActions(){
  return `<div class="premium-actions">
    <button class="btn primary premium-cta" onclick="openPremiumCheckout()">Assinar Premium — ${PRADO_PAYMENT_CONFIG.price}</button>
    <button class="btn premium-whatsapp" onclick="openPremiumSupport()">Já paguei / suporte no WhatsApp</button>
  </div>
  <div class="premium-note">Pagamento seguro pelo Mercado Pago. Liberação manual pelo WhatsApp: +55 98 98235-6674.</div>`;
}

function renderPremiumSub(){
  const access = getPremiumAccess();
  const activeCard = access ? `<div class="card premium-active-card">
    <div class="premium-active-top">
      <span>✅ Premium ativo</span>
      <button onclick="removePremiumAccess()">Remover</button>
    </div>
    <div class="premium-active-code">Código: <b>${access.code}</b></div>
    <div class="premium-active-valid">${access.validUntil ? `Validade: ${premiumDateLabel(access.validUntil)}` : 'Acesso ativo neste aparelho'}</div>
  </div>` : '';

  return `<div class="premium-hero ${access ? 'active' : ''}">
    <div class="premium-pill">💎 PRADO PREMIUM</div>
    <div class="premium-title">${access ? 'Seu Premium está liberado' : PRADO_PAYMENT_CONFIG.planName}</div>
    <div class="premium-price">${PRADO_PAYMENT_CONFIG.price}</div>
    <div class="premium-sub">${access ? 'Scanner, simulador e recursos avançados desbloqueados neste aparelho.' : 'Assinatura via Mercado Pago com Pix/cartão. Depois do pagamento, envie o comprovante no WhatsApp para receber seu código Premium.'}</div>
  </div>
  ${activeCard}
  ${!access ? renderPremiumUnlockBox() : ''}
  <div class="premium-grid">
    <button class="premium-mini" onclick="showMoreSub('scanner')">🔎 Scanner</button>
    <button class="premium-mini" onclick="showMoreSub('simulator')">📈 Simulador</button>
    <button class="premium-mini" onclick="showMoreSub('notifications')">🔔 Alertas</button>
  </div>
  ${menuSection('O que está incluso', [
    {icon:'🤖', label:'IA avançada com explicações detalhadas', action:`showMoreSub('premium')`},
    {icon:'🎟️', label:'Bilhetes prontos diários com odds combinadas', action:`toast('Bilhetes premium disponíveis após liberação do acesso.','🎟️')`},
    {icon:'🔔', label:'Alertas automáticos de oportunidades', action:`showMoreSub('notifications')`},
    {icon:'📊', label:'Estatísticas avançadas (xG, xA, heatmaps)', action:`toast('Estatísticas avançadas prontas no detalhe da partida.','📊')`},
    {icon:'📈', label:'Simulador de apostas ilimitado', action:`showMoreSub('simulator')`},
    {icon:'🔎', label:'Scanner de valor em tempo real', action:`showMoreSub('scanner')`},
    {icon:'🧮', label:'Jogos filtrados por oportunidade de valor', action:`showMoreSub('scanner')`},
  ])}
  ${!access ? renderPremiumActions() : '<div class="premium-note">Acesso Premium salvo neste aparelho. Se trocar de celular, digite o código novamente.</div>'}`;
}

function renderPremiumLocked(view){
  const name = view === 'scanner' ? 'Scanner de valor' : 'Simulador de apostas';
  return `<div class="card premium-locked-card">
    <div class="premium-locked-icon">🔒</div>
    <div class="premium-locked-title">${name} é Premium</div>
    <div class="premium-locked-sub">Assine o Prado Premium ou digite seu código de acesso para liberar este recurso.</div>
  </div>
  ${renderPremiumUnlockBox()}
  ${renderPremiumActions()}`;
}

// ---- Simulator ----
function renderSimulatorSub(){
  return `<div class="card" style="padding:14px">
    <div class="sim-row"><span>Valor da aposta (R$)</span><input id="sim-stake" class="sim-input" type="number" value="50" min="1"></div>
    <div class="sim-row"><span>Odd da seleção</span><input id="sim-odd" class="sim-input" type="number" value="1.95" step="0.01" min="1.01"></div>
    <div class="sim-row"><span>Probabilidade da IA (%)</span><input id="sim-prob" class="sim-input" type="number" value="78" min="1" max="99"></div>
    <div class="sim-result" id="sim-result">
      <div class="big" id="sim-return">R$ 0,00</div>
      <small>retorno potencial</small>
    </div>
    <div style="margin-top:10px;font-size:11.5px;color:var(--text-dim);line-height:1.5" id="sim-value"></div>
  </div>`;
}
function bindSimulator(){
  ['sim-stake','sim-odd','sim-prob'].forEach(id=>document.getElementById(id).addEventListener('input', updateSimulator));
  updateSimulator();
}
function updateSimulator(){
  const stake = parseFloat(document.getElementById('sim-stake').value)||0;
  const odd = parseFloat(document.getElementById('sim-odd').value)||0;
  const prob = parseFloat(document.getElementById('sim-prob').value)||0;
  const ret = stake*odd;
  document.getElementById('sim-return').textContent = 'R$ '+ret.toFixed(2).replace('.',',');
  const impliedProb = odd>0 ? (100/odd) : 0;
  const ev = (prob/100)*(odd-1)*stake - (1-prob/100)*stake;
  const valueMsg = ev>0
    ? `✅ Valor positivo: a IA estima ${prob}% de chance contra ${impliedProb.toFixed(1)}% implícito pela odd. EV estimado: <b style="color:var(--accent)">R$ ${ev.toFixed(2)}</b>`
    : `⚠️ Valor negativo: a probabilidade implícita pela odd (${impliedProb.toFixed(1)}%) é maior que a estimativa da IA (${prob}%). EV estimado: <b style="color:var(--live)">R$ ${ev.toFixed(2)}</b>`;
  document.getElementById('sim-value').innerHTML = valueMsg;
}

// ---- Value scanner ----
function renderScannerSub(){
  let valueCount = 0;
  let h = `<div class="card scanner-intro">
    <div class="scanner-title">🔎 Scanner de valor</div>
    <div class="scanner-sub">O scanner fica pronto para comparar probabilidades da IA com odds reais. Sem odds conectadas, ele não inventa oportunidade.</div>
  </div>`;
  h += `<div class="scanner-toolbar"><span>Oportunidades encontradas</span><b id="scanner-count">0</b></div>`;

  if(!ODDS.length){
    h += emptyState('🔎','Odds reais ainda não conectadas. Quando conectarmos uma API de odds, o scanner mostrará valor real sem dados demo.');
    return h;
  }

  ODDS.forEach(o=>{
    const m = MATCHES.find(x=>x.id===o.matchId);
    const p = getPredictionForMatch(m);
    if(!m || !p || !o?.now) return;
    const markets = [
      {label: teamName(m.home), prob:p.probs.home, odd:o.now.h},
      {label:'Empate', prob:p.probs.draw, odd:o.now.d},
      {label: teamName(m.away), prob:p.probs.away, odd:o.now.a},
    ].filter(x=>Number(x.odd)>1).map(x=> ({...x, implied:100/x.odd, diff:x.prob-(100/x.odd)})).sort((a,b)=>b.diff-a.diff);
    if(!markets.length) return;
    const best = markets[0];
    const isValue = best.diff > 3;
    if(isValue) valueCount++;
    h += `<div class="card scanner-card ${isValue?'has-value':''}">
      <div class="scanner-top"><div><b>${teamName(m.home)} x ${teamName(m.away)}</b><small>${leagueOf(m).icon} ${leagueOf(m).name}</small></div>${isValue ? '<span class="market-tag">VALOR ✅</span>' : '<span class="market-tag muted">Sem valor</span>'}</div>
      <div class="scanner-line"><span>Melhor mercado</span><b>${best.label}</b></div>
      <div class="scanner-line"><span>IA</span><b>${best.prob}%</b></div>
      <div class="scanner-line"><span>Mercado</span><b>${best.implied.toFixed(1)}%</b></div>
      <div class="scanner-line"><span>Diferença</span><b style="color:${isValue?'var(--accent)':'var(--text-faint)'}">${best.diff>0?'+':''}${best.diff.toFixed(1)}pp</b></div>
      <button class="btn ghost scanner-btn" onclick="openMatchDetail('${m.id}','ai')">📊 Ver análise</button>
    </div>`;
  });
  if(valueCount === 0) h += emptyState('📉','Nenhuma oportunidade de valor encontrada com odds reais no momento.');
  setTimeout(()=>{ const c=document.getElementById('scanner-count'); if(c) c.textContent=valueCount; },0);
  return h;
}

// ---- Notifications ----
function buildRealNotificationFeed(){
  const feed = [];
  MATCHES.filter(m => m.status === 'live').slice(0,8).forEach(m=>{
    feed.push({icon:'🔴', text:`${teamName(m.home)} ${m.hs}x${m.as} ${teamName(m.away)} — ${m.minute || 0}'`, time:'ao vivo', matchId:m.id});
  });
  MATCHES.filter(m => m.status === 'finished').slice(0,6).forEach(m=>{
    feed.push({icon:'🏁', text:`Fim de jogo: ${teamName(m.home)} ${m.hs}x${m.as} ${teamName(m.away)}`, time:fmtDate(m.date), matchId:m.id});
  });
  return feed;
}
function renderNotificationsSub(){
  const permission = ('Notification' in window) ? Notification.permission : 'unsupported';
  const supported = ('Notification' in window);
  let h = `<div class="card notif-permission">
    <div><b>🔔 Notificações do Prado</b><span>Status: ${permission==='granted'?'ativadas neste aparelho':permission==='denied'?'bloqueadas no navegador':'aguardando permissão'}</span></div>
    <button class="btn primary" onclick="enableNotifications()">Ativar</button>
  </div>`;
  h += `<div class="card" style="padding:12px;margin-bottom:14px;background:var(--grad-card)">
    <div style="font-size:12px;color:var(--text-dim);line-height:1.45">
      Alertas locais funcionam quando o app está instalado/aberto neste aparelho. Para push automático em segundo plano para todos os clientes, a próxima etapa é conectar OneSignal ou backend de push.
    </div>
  </div>`;
  h += `<div class="menu-label">Tipos de alerta</div><div class="card" style="padding:0 12px;margin-bottom:16px">`;
  const items = [
    {key:'gol', label:'Gols', sub:'Alerta em jogos favoritos quando houver atualização real'},
    {key:'cartao', label:'Cartões', sub:'Amarelos e vermelhos quando a API liberar evento'},
    {key:'escanteio', label:'Escanteios', sub:'Disponível quando houver estatísticas ao vivo'},
    {key:'inicio', label:'Início do jogo', sub:'Aviso quando partida favorita começar'},
    {key:'fim', label:'Final do jogo', sub:'Resultado final do jogo favorito'},
    {key:'entrada', label:'Entrada em campo', sub:'Escalação confirmada quando a API liberar'},
  ];
  items.forEach(it=>{
    h += `<div class="setting-row">
      <div><div class="setting-label">${it.label}</div><div class="setting-sub">${it.sub}</div></div>
      <div class="switch ${state.notifSettings[it.key]?'on':''}" data-notif="${it.key}"></div>
    </div>`;
  });
  h += `</div>`;
  h += `<button class="btn ghost" style="margin-bottom:14px" onclick="sendTestNotification()">Enviar teste local</button>`;
  h += `<div class="menu-label">Recentes reais</div><div class="card" style="padding:0 10px">`;
  const feed = buildRealNotificationFeed();
  if(feed.length){
    feed.forEach(n=> h += `<div class="news-card" onclick="openMatchDetail('${n.matchId}')"><div class="news-thumb" style="font-size:20px">${n.icon}</div><div class="news-body"><div class="news-title">${n.text}</div><div class="news-meta">${n.time}</div></div></div>`);
  } else {
    h += emptyState('🔔','Nenhum alerta real recente. Favoritar jogos ajuda a acompanhar eventos importantes.');
  }
  h += `</div>`;
  return h;
}

function enableNotifications(){
  if(!('Notification' in window)){ toast('Este navegador não suporta notificações.','⚠️'); return; }
  Notification.requestPermission().then(status=>{
    toast(status==='granted' ? 'Notificações locais ativadas!' : 'Permissão não liberada no navegador.', status==='granted'?'🔔':'⚠️');
    renderMoreSub('notifications');
  });
}
function sendTestNotification(){
  if('Notification' in window && Notification.permission==='granted'){
    new Notification('Prado Sports AI', { body:'Teste local funcionando ✅ Para push real 24h, conecte OneSignal/backend.', icon:'./icons/icon-192.png' });
    toast('Notificação de teste enviada.','🔔');
  } else {
    toast('Ative as notificações primeiro.','🔔');
  }
}
function bindNotifSwitches(){
  document.querySelectorAll('[data-notif]').forEach(el=>{
    el.addEventListener('click', ()=>{
      const key = el.dataset.notif;
      state.notifSettings[key] = !state.notifSettings[key];
      el.classList.toggle('on', state.notifSettings[key]);
      localStorage.setItem('prado_notifs', JSON.stringify(state.notifSettings));
    });
  });
}

// ---- Settings ----
function renderSettingsSub(){
  return `
  <div class="menu-label">Aparência</div>
  <div class="card" style="padding:12px;margin-bottom:16px">
    <div class="theme-fixed">
      <div class="theme-fixed-icon">🌙</div>
      <div><div class="setting-label">Modo escuro premium</div><div class="setting-sub">Tema fixo para evitar tela apagada e deixar o app mais profissional.</div></div>
    </div>
  </div>

  <div class="menu-label">Preferências</div>
  <div class="card" style="padding:0 12px;margin-bottom:16px">
    <div class="setting-row">
      <div><div class="setting-label">Idioma</div><div class="setting-sub">Idioma do aplicativo</div></div>
      <select style="background:var(--surface-2);color:var(--text);border:1px solid var(--border-soft);border-radius:8px;padding:8px;font-size:12px">
        <option>Português (BR)</option><option>English</option><option>Español</option>
      </select>
    </div>
    ${favTeamRow()}
    <div class="setting-row" style="border-bottom:none">
      <div><div class="setting-label">Campeonato favorito</div><div class="setting-sub">Apareça primeiro na Central de Jogos</div></div>
      <select onchange="setFavLeague(this.value)" style="background:var(--surface-2);color:var(--text);border:1px solid var(--border-soft);border-radius:8px;padding:8px;font-size:12px">
        <option value="">Nenhum</option>
        ${Object.entries(LEAGUES).map(([c,l])=>`<option value="${c}" ${state.favLeague===c?'selected':''}>${l.name}</option>`).join('')}
      </select>
    </div>
  </div>

  <div class="menu-label">Sobre</div>
  <div class="card" style="padding:0 12px">
    <div class="menu-item" onclick="showMoreSub('about')"><div class="menu-icon">ℹ️</div><div>Sobre o Prado Sports AI</div><div class="chev">›</div></div>
    <div class="menu-item" onclick="showMoreSub('install')"><div class="menu-icon">📱</div><div>Instalar aplicativo</div><div class="chev">›</div></div>
  </div>`;
}
function bindSettings(){
}
function setFavLeague(code){ state.favLeague=code; localStorage.setItem('prado_fav_league',code); toast(code?`${LEAGUES[code].name} definido como favorito! 🏆`:'Campeonato favorito removido'); }

// ---- Install ----
function renderInstallSub(){
  return `<div class="card" style="padding:16px;margin-bottom:14px;background:var(--grad-card)">
    <div style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:15px;margin-bottom:6px">📲 Adicione à tela inicial</div>
    <div style="font-size:12.5px;color:var(--text-dim);line-height:1.6">O Prado Sports AI é um <b style="color:var(--text)">PWA (Progressive Web App)</b>: instale como um app nativo, sem loja, com ícone próprio e funcionamento offline parcial.</div>
  </div>
  <div class="menu-label">iPhone (Safari)</div>
  <div class="card" style="padding:14px;margin-bottom:14px;font-size:12.5px;color:var(--text-dim);line-height:1.8">
    1. Abra este app no <b style="color:var(--text)">Safari</b><br>
    2. Toque no ícone de <b style="color:var(--text)">Compartilhar</b> (quadrado com seta) ⬆️<br>
    3. Selecione <b style="color:var(--text)">"Adicionar à Tela de Início"</b><br>
    4. Confirme — pronto! O ícone do Prado Sports AI aparece na tela inicial 🎉
  </div>
  <div class="menu-label">Android (Chrome)</div>
  <div class="card" style="padding:14px;margin-bottom:14px;font-size:12.5px;color:var(--text-dim);line-height:1.8">
    1. Abra este app no <b style="color:var(--text)">Chrome</b><br>
    2. Toque no menu <b style="color:var(--text)">⋮</b> no canto superior direito<br>
    3. Selecione <b style="color:var(--text)">"Instalar aplicativo"</b> ou <b style="color:var(--text)">"Adicionar à tela inicial"</b><br>
    4. Confirme — o app abrirá em tela cheia, com ícone próprio 🎉
  </div>
  <div class="btn primary" style="padding:14px" onclick="triggerInstall()">Instalar agora</div>`;
}

// ---- About ----
function renderAboutSub(){
  return `<div class="card" style="padding:16px;text-align:center;margin-bottom:14px">
    <div class="logo-mark" style="width:56px;height:56px;border-radius:16px;font-size:22px;margin:0 auto 10px">P</div>
    <div style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:18px">Prado Sports AI</div>
    <div style="font-size:12px;color:var(--text-faint);margin-top:4px">v1.0.0 · Demo</div>
  </div>
  <div class="card" style="padding:14px;font-size:12.5px;color:var(--text-dim);line-height:1.6">
    Estatísticas de futebol em tempo real, palpites com inteligência artificial e tudo sobre os principais campeonatos do mundo — Brasileirão, Champions League, Libertadores, Premier League e a Copa do Mundo 2026.
    <br><br>
    Os jogos são carregados pela API-Football/API-Sports quando a chave está ativa na Vercel. Se a API não liberar algum detalhe, o app mostra essa limitação sem inventar dados.
  </div>`;
}

// ===================== MATCH DETAIL =====================
let currentMatchId = null;
function bindDetailOverlay(){
  const close = document.getElementById('detail-close');
  if(close) close.addEventListener('click', closeMatchDetail);
}
function closeMatchDetail(){
  document.getElementById('match-detail').classList.remove('open');
  document.body.style.overflow='';
}
function openMatchDetail(id, tab){
  currentMatchId = id;
  const m = MATCHES.find(x=>x.id===id);
  if(!m) return;
  const lg = leagueOf(m);
  const ov = document.getElementById('match-detail');

  let statusHTML;
  if(m.status==='live') statusHTML = `<span class="detail-status live"><span class="live-badge"><span class="live-dotpulse"></span>${m.minute}' · AO VIVO</span></span>`;
  else if(m.status==='finished') statusHTML = `<span class="detail-status">Encerrado · ${fmtDate(m.date)}</span>`;
  else statusHTML = `<span class="detail-status">${fmtDate(m.date)} · ${fmtTime(m.date)}</span>`;

  const scoreHTML = (m.status==='scheduled')
    ? `<div class="sc" style="color:var(--text-faint)">vs</div>`
    : `<div class="sc">${m.hs ?? 0} - ${m.as ?? 0}</div>`;

  let html = `
    <div class="detail-scoreboard">
      <div class="detail-league">${PRADO_ICONS.trophy} ${lg.name} · ${m.round||''}</div>
      <div class="detail-teams">
        <div class="side">${crestHTML(m.home,52).replace('width:52px;height:52px','width:52px;height:52px')}<div class="tname">${teamName(m.home)}</div></div>
        <div class="detail-score-mid">${scoreHTML}${statusHTML}</div>
        <div class="side">${crestHTML(m.away,52)}<div class="tname">${teamName(m.away)}</div></div>
      </div>
      <div style="font-size:10.5px;color:var(--text-faint);margin-top:10px">${m.venue||''}</div>
    </div>
    <div class="tabbar" id="detail-tabs">
      <div class="tab active" data-tab="resumo">Resumo</div>
      <div class="tab" data-tab="stats">Estatísticas</div>
      <div class="tab" data-tab="lineups">Escalações</div>
      <div class="tab" data-tab="maps">Mapas</div>
      <div class="tab" data-tab="ai">IA</div>
      ${m.h2h?'<div class="tab" data-tab="h2h">H2H</div>':''}
    </div>
    <div class="detail-body">
      <div class="tab-panel active" data-tab="resumo">${detailResumo(m)}</div>
      <div class="tab-panel" data-tab="stats">${detailStats(m)}</div>
      <div class="tab-panel" data-tab="lineups">${detailLineups(m)}</div>
      <div class="tab-panel" data-tab="maps">${detailMaps(m)}</div>
      <div class="tab-panel" data-tab="ai">${detailAI(m)}</div>
      ${m.h2h?`<div class="tab-panel" data-tab="h2h">${detailH2H(m)}</div>`:''}
    </div>`;

  ov.innerHTML = `<div class="detail-head"><button class="icon-btn" id="detail-close">←</button><div style="font-weight:700;font-size:13px">${teamName(m.home)} x ${teamName(m.away)}</div></div>` + html;
  document.getElementById('detail-close').addEventListener('click', closeMatchDetail);

  ov.querySelectorAll('.tab').forEach(t=>{
    t.addEventListener('click', ()=>{
      ov.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
      ov.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
      ov.querySelector(`.tab-panel[data-tab="${t.dataset.tab}"]`).classList.add('active');
      if(t.dataset.tab==='maps') setTimeout(()=>drawMaps(m),50);
    });
  });

  ov.classList.add('open');
  document.body.style.overflow='hidden';

  const selectedTab = tab || 'resumo';
  if(tab){
    const t = ov.querySelector(`.tab[data-tab="${tab}"]`);
    if(t) t.click();
  }

  if(m.source === 'api-football' && typeof PradoAPI !== 'undefined' && PradoAPI.fetchMatchDetails && !m.detailsLoaded && !m.detailsLoading){
    m.detailsLoading = true;
    PradoAPI.fetchMatchDetails(m)
      .catch(err => { console.warn('Detalhes da partida indisponíveis:', err.message || err); })
      .finally(() => {
        m.detailsLoading = false;
        if(currentMatchId === id) openMatchDetail(id, selectedTab);
      });
  }
}

function detailLoading(text){
  return `<div class="card api-loading-card"><div class="loading-spinner"></div><div>${text}</div></div>`;
}
function statsHasValues(stats){
  if(!stats) return false;
  const keys = ['shotsOnTarget','shotsOffTarget','corners','fouls','yellow','red','xg','xa','dangerousAttacks'];
  if(keys.some(k => Array.isArray(stats[k]) && stats[k].some(v => Number(v) > 0))) return true;
  const poss = stats.possession;
  if(Array.isArray(poss) && (Number(poss[0]) !== 50 || Number(poss[1]) !== 50) && (Number(poss[0]) + Number(poss[1]) > 0)) return true;
  return false;
}

function detailResumo(m){
  if(m.detailsLoading) return detailLoading('Carregando eventos e detalhes da partida...');
  if(!m.events || !m.events.length) return emptyState('📝', m.status==='scheduled' ? 'A partida ainda não começou. Acompanhe a transmissão minuto a minuto aqui quando começar.' : 'A API ainda não liberou eventos detalhados para esta partida.');
  const icons = {goal:'⚽', yellow:'🟨', red:'🟥', sub:'🔄', corner:'🚩', var:'📺', info:'•'};
  let h = `<div class="card" style="padding:6px 12px;margin-bottom:6px">`;
  [...m.events].reverse().forEach(e=>{
    h += `<div class="commentary-item">
      <div class="commentary-min">${e.min}'</div>
      <div class="commentary-text"><span class="event-icon">${icons[e.type]||'•'}</span>${e.text}</div>
    </div>`;
  });
  h += `</div>`;
  return h;
}

function detailStats(m){
  if(m.detailsLoading) return detailLoading('Buscando estatísticas reais da API...');
  if(!statsHasValues(m.stats)) return emptyState('📊','A API ainda não liberou estatísticas detalhadas para esta partida.');
  const s = m.stats;
  const rows = [
    {label:'Posse de bola (%)', a:s.possession[0], b:s.possession[1], suffix:'%'},
    {label:'xG (Gols esperados)', a:s.xg[0], b:s.xg[1]},
    {label:'xA (Assist. esperadas)', a:s.xa[0], b:s.xa[1]},
    {label:'Finalizações no gol', a:s.shotsOnTarget[0], b:s.shotsOnTarget[1]},
    {label:'Finalizações para fora', a:s.shotsOffTarget[0], b:s.shotsOffTarget[1]},
    {label:'Escanteios', a:s.corners[0], b:s.corners[1]},
    {label:'Ataques perigosos', a:s.dangerousAttacks[0], b:s.dangerousAttacks[1]},
    {label:'Faltas', a:s.fouls[0], b:s.fouls[1]},
    {label:'Cartões amarelos', a:s.yellow[0], b:s.yellow[1]},
    {label:'Cartões vermelhos', a:s.red[0], b:s.red[1]},
  ];
  let h = `<div class="card" style="padding:14px">`;
  rows.forEach(r=>{
    const total = (r.a+r.b) || 1;
    const pa = (r.a/total*100), pb=(r.b/total*100);
    h += `<div class="stat-row">
      <div class="labels"><span class="home">${r.a}${r.suffix||''}</span><span class="away">${r.b}${r.suffix||''}</span></div>
      <div class="stat-bar"><div class="home-fill" style="width:${pa}%"></div><div class="away-fill" style="width:${pb}%"></div></div>
      <div class="name">${r.label}</div>
    </div>`;
  });
  h += `</div>`;
  return h;
}

function detailLineups(m){
  if(m.detailsLoading) return detailLoading('Buscando escalações reais da API...');
  if(!m.lineups) return emptyState('👥','Escalações confirmadas serão exibidas quando a API liberar esse dado.');
  return `
    <div style="font-size:11px;color:var(--text-faint);margin-bottom:6px;text-align:center">Formação: <b style="color:var(--text)">${m.lineups.home.formation}</b> · ${teamName(m.home)}</div>
    <div class="pitch" id="pitch-home">${formationHTML(m.lineups.home, m.home)}<div class="line-mid"></div></div>
    <div style="font-size:11px;color:var(--text-faint);margin:14px 0 6px;text-align:center">Formação: <b style="color:var(--text)">${m.lineups.away.formation}</b> · ${teamName(m.away)}</div>
    <div class="pitch" id="pitch-away">${formationHTML(m.lineups.away, m.away, true)}<div class="line-mid"></div></div>
  `;
}
function formationHTML(lineup, teamCode, flip){
  const color = TEAMS[teamCode].color;
  const rows = formationRows(lineup.formation);
  let players = [...lineup.players];
  let html = '';
  let rowPositions = flip ? [...rows].reverse() : rows;
  let topStart = flip ? 4 : 86;
  let topStep = flip ? 22 : -22;
  rowPositions.forEach((count, ri)=>{
    const top = topStart + ri*topStep;
    const group = players.splice(0, count);
    html += `<div class="formation-row" style="top:${top}%">`;
    group.forEach(pl=> html += `<div class="player-dot"><div class="num" style="background:${color}">${pl.n}</div><div class="pname">${pl.p}</div></div>`);
    html += `</div>`;
  });
  return html;
}
function formationRows(formation){
  // returns array of player counts per row from GK to attack
  const lines = formation.split('-').map(Number);
  return [1, ...lines];
}

function detailMaps(m){
  if(m.detailsLoading) return detailLoading('Montando mapas com dados da partida...');
  if(!statsHasValues(m.stats)) return emptyState('🗺️','Mapas de calor e finalizações ficam disponíveis quando houver estatísticas da partida.');
  return `
    <div class="viz-card card">
      <div class="viz-title">Mapa de chutes (Shotmap)</div>
      <canvas id="shotmap" width="400" height="300"></canvas>
    </div>
    <div class="viz-card card">
      <div class="viz-title">Heatmap — ${teamName(m.home)}</div>
      <canvas id="heatmap" width="400" height="260"></canvas>
    </div>`;
}
function drawMaps(m){
  const shot = document.getElementById('shotmap');
  const heat = document.getElementById('heatmap');
  if(shot) drawShotmap(shot, m);
  if(heat) drawHeatmap(heat, m);
}
function seededRand(seed){
  let x = Math.sin(seed)*10000;
  return x - Math.floor(x);
}
function drawShotmap(canvas, m){
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0,0,w,h);
  // pitch
  ctx.fillStyle = getCSS('--surface-2'); ctx.fillRect(0,0,w,h);
  ctx.strokeStyle = getCSS('--border-soft'); ctx.lineWidth=1.5;
  ctx.strokeRect(8,8,w-16,h-16);
  ctx.beginPath(); ctx.moveTo(w/2,8); ctx.lineTo(w/2,h-8); ctx.stroke();
  ctx.beginPath(); ctx.arc(w/2,h/2,30,0,Math.PI*2); ctx.stroke();
  ctx.strokeRect(8,h/2-60,60,120);
  ctx.strokeRect(w-68,h/2-60,60,120);

  const total = (m.stats.shotsOnTarget[0]+m.stats.shotsOffTarget[0]+m.stats.shotsOnTarget[1]+m.stats.shotsOffTarget[1]);
  let seed = 1;
  for(let side=0; side<2; side++){
    const onTarget = m.stats.shotsOnTarget[side];
    const offTarget = m.stats.shotsOffTarget[side];
    const color = side===0 ? getCSS('--accent') : getCSS('--blue');
    const baseX = side===0 ? w-70 : 70;
    for(let i=0;i<onTarget+offTarget;i++){
      seed += 7.13;
      const isGoal = i < onTarget;
      const r1 = seededRand(seed); const r2 = seededRand(seed*1.7);
      const x = baseX + (side===0?-1:1)*r1*(w*0.35);
      const y = 20 + r2*(h-40);
      ctx.beginPath();
      ctx.arc(x,y, isGoal?6:4, 0, Math.PI*2);
      ctx.fillStyle = isGoal ? color : 'transparent';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      if(isGoal) ctx.fill();
      ctx.stroke();
    }
  }
}
function drawHeatmap(canvas, m){
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle = getCSS('--surface-2'); ctx.fillRect(0,0,w,h);
  ctx.strokeStyle = getCSS('--border-soft'); ctx.lineWidth=1.5;
  ctx.strokeRect(8,8,w-16,h-16);
  ctx.beginPath(); ctx.moveTo(w/2,8); ctx.lineTo(w/2,h-8); ctx.stroke();

  let seed = 42;
  for(let i=0;i<70;i++){
    seed += 3.31;
    const r1 = seededRand(seed), r2 = seededRand(seed*1.3);
    // bias toward attacking (right) side
    const x = w*0.35 + r1*w*0.6;
    const y = h*0.1 + r2*h*0.8;
    const grad = ctx.createRadialGradient(x,y,0,x,y,28);
    grad.addColorStop(0,'rgba(33,230,161,0.35)');
    grad.addColorStop(1,'rgba(33,230,161,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(x,y,28,0,Math.PI*2); ctx.fill();
  }
}
function getCSS(varName){
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

function detailAI(m){
  if(m.detailsLoading) return detailLoading('Gerando leitura da IA com os dados reais da partida...');
  const p = getPredictionForMatch(m);
  if(!p) return emptyState('🤖','A IA não encontrou dados mínimos para esta partida.');
  return aiCardHTML(p,m,true);
}

function detailH2H(m){
  let h = `<div class="card" style="padding:12px">
    <div style="text-align:center;font-size:12px;color:var(--text-dim);margin-bottom:8px">Últimos confrontos: ${teamName(m.home)} x ${teamName(m.away)}</div>`;
  m.h2h.forEach(g=>{
    h += `<div class="h2h-row">
      <span class="h2h-date">${fmtDate(g.date)}</span>
      <span class="h2h-score">${g.score}</span>
      <span style="color:var(--text-faint)">${g.comp}</span>
    </div>`;
  });
  h += `</div>`;
  return h;
}


// ===================== SEARCH =====================
function openSearch(){
  let overlay = document.getElementById('search-overlay');
  if(!overlay){
    overlay = document.createElement('div');
    overlay.id = 'search-overlay';
    overlay.innerHTML = `<div class="search-panel">
      <div class="search-head"><button class="icon-btn" onclick="closeSearch()">←</button><input id="search-input" placeholder="Buscar time, jogo, liga ou notícia..." autocomplete="off"></div>
      <div id="search-results" class="search-results"></div>
    </div>`;
    document.getElementById('app').appendChild(overlay);
  }
  overlay.classList.add('open');
  const input = document.getElementById('search-input');
  input.value = '';
  renderSearchResults('');
  input.focus();
  input.oninput = () => renderSearchResults(input.value);
}
function closeSearch(){ document.getElementById('search-overlay')?.classList.remove('open'); }
function renderSearchResults(q){
  const termRaw = String(q||'').trim();
  const term = textNorm(termRaw);
  const box = document.getElementById('search-results');
  if(!box) return;

  const buildItem = (m, score=0) => {
    const lg = leagueOf(m);
    const scoreText = m.status==='live' || m.status==='finished' ? `${m.hs}x${m.as}` : fmtTime(m.date);
    const badge = m.status==='live' ? `🔴 ${m.minute||0}' ao vivo` : (m.status==='finished' ? '🏁 encerrado' : '⏱️ pré-jogo');
    return {type:'match', label:`${teamName(m.home)} x ${teamName(m.away)}`, sub:`${badge} · ${scoreText} · ${lg.icon} ${lg.name} · ${fmtDate(m.date)}`, id:m.id, score};
  };

  if(term.length < 2){
    const suggestions = [
      ...sortMatchesPremium(MATCHES.filter(m=>m.status==='live')).slice(0,8),
      ...sortMatchesPremium(MATCHES.filter(m=>m.status==='scheduled')).slice(0,6)
    ].slice(0,12).map((m,i)=>buildItem(m,100-i));
    box.innerHTML = suggestions.length
      ? suggestions.map(r=>`<div class="search-item" onclick="closeSearch();openMatchDetail('${r.id}')"><b>⚽ ${r.label}</b><span>${r.sub}</span></div>`).join('')
      : emptyState('🔎','Digite o nome do time, liga, país ou jogo. A busca só usa jogos reais carregados da API.');
    return;
  }

  const words = term.split(/\s+/).filter(Boolean);
  const results = [];
  MATCHES.forEach(m=>{
    const lg = leagueOf(m);
    const haystack = textNorm(`${teamName(m.home)} ${teamName(m.away)} ${lg.name} ${lg.country} ${m.round||''} ${m.status} ${statusLabel(m)}`);
    if(words.every(w => haystack.includes(w))){
      const h = textNorm(teamName(m.home));
      const a = textNorm(teamName(m.away));
      const l = textNorm(lg.name);
      let score = 0;
      if(h === term || a === term) score += 180;
      if(h.startsWith(term) || a.startsWith(term)) score += 120;
      if(h.includes(term) || a.includes(term)) score += 70;
      if(l.includes(term)) score += 45;
      if(m.status==='live') score += 40;
      if(isHomeMainEligible(m)) score += 20;
      results.push(buildItem(m, score));
    }
  });

  const cleanNews = (NEWS || []).filter(n => !String(n.tag || '').toLowerCase().includes('api'));
  cleanNews.forEach((n,i)=>{
    const text = textNorm(`${n.tag} ${n.title}`);
    if(words.every(w => text.includes(w))) results.push({type:'news', label:n.title, sub:`${n.tag} · ${n.time}`, id:i, score:10});
  });

  const html = results.sort((a,b)=>b.score-a.score).slice(0,30).map(r=> r.type==='match'
    ? `<div class="search-item" onclick="closeSearch();openMatchDetail('${r.id}')"><b>⚽ ${r.label}</b><span>${r.sub}</span></div>`
    : `<div class="search-item" onclick="closeSearch();goToPage('rank')"><b>📰 ${r.label}</b><span>${r.sub}</span></div>`
  ).join('') || emptyState('🔎','Nada encontrado nos jogos reais carregados. Tente buscar pelo nome do time, liga ou país.');
  box.innerHTML = html;
}

function statusLabel(m){
  if(m.status==='live') return `🔴 Ao vivo ${m.minute||''}'`;
  if(m.status==='finished') return `🏁 Encerrado ${m.hs}x${m.as}`;
  return '⏱️ Pré-jogo';
}

// ===================== PWA INSTALL =====================
function isIOS(){
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}
function setupInstall(){
  window.addEventListener('beforeinstallprompt', (e)=>{
    e.preventDefault();
    window.deferredInstallPrompt = e;
    renderHome();
  });
}
function triggerInstall(){
  if(window.deferredInstallPrompt){
    window.deferredInstallPrompt.prompt();
    window.deferredInstallPrompt.userChoice.then(()=>{ window.deferredInstallPrompt=null; });
  } else if(isIOS()){
    toast('No Safari, toque em Compartilhar ⬆️ e depois "Adicionar à Tela de Início"','📲');
  } else {
    toast('Use o menu do navegador e escolha "Instalar aplicativo"','📲');
  }
}
function registerSW(){
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }
}

// ===================== LIVE TICK SIMULATION =====================
function simulateLiveTicks(){
  setInterval(()=>{
    let changed = false;
    MATCHES.forEach(m=>{
      if(m.status==='live' && m.minute < 90 && m.source !== 'api-football'){
        m.minute += 1;
        changed = true;
      }
    });
    if(changed){
      if(state.page==='home') renderHome();
      if(state.page==='live') renderLive();
      if(currentMatchId && document.getElementById('match-detail').classList.contains('open')){
        const m = MATCHES.find(x=>x.id===currentMatchId);
        const badge = document.querySelector('.detail-status.live .live-badge');
        if(badge && m) badge.innerHTML = `<span class="live-dotpulse"></span>${m.minute}' · AO VIVO`;
      }
    }
  }, 15000);
}
