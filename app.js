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


// ===================== REAL API LOADER =====================
async function loadRealDataIfConfigured(){
  const status = document.createElement('div');
  status.id = 'api-status';
  status.style.cssText = 'display:none;position:fixed;top:78px;left:14px;right:14px;z-index:99;background:rgba(19,27,38,.95);border:1px solid rgba(255,255,255,.10);border-radius:16px;padding:12px;color:var(--text);font-size:13px;box-shadow:0 12px 30px rgba(0,0,0,.35)';
  document.body.appendChild(status);

  if (typeof PRADO_CONFIG === 'undefined' || !PRADO_CONFIG.API_KEY || PRADO_CONFIG.API_KEY.includes('COLE_SUA')) {
    console.info('Prado Sports AI: sem chave API configurada, usando dados demo.');
    return;
  }

  try{
    status.style.display = 'block';
    status.textContent = 'Conectando na API e carregando jogos reais...';
    const realMatches = await PradoAPI.fetchMatches();
    if(Array.isArray(realMatches) && realMatches.length){
      MATCHES = realMatches;
      PREDICTIONS = PradoAPI.makePredictions(realMatches);
      NEWS = [{ icon:'✅', tag:'API conectada', title:`${realMatches.length} jogos carregados da sua API`, time:'agora' }, ...NEWS.slice(0,4)];
      status.textContent = `✅ API conectada: ${realMatches.length} jogos reais carregados.`;
      setTimeout(()=> status.style.display='none', 2500);
    } else {
      status.textContent = 'API respondeu, mas não retornou jogos. Usando dados demo.';
      setTimeout(()=> status.style.display='none', 3500);
    }
  }catch(err){
    console.error('Erro ao carregar API:', err);
    status.textContent = '⚠️ Não consegui carregar sua API. Confira a chave em config.js. O app ficou no modo demo.';
    setTimeout(()=> status.style.display='none', 4500);
  }
}

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', async () => {
  applyTheme('dark');
  await loadRealDataIfConfigured();
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

// ===================== HOME =====================
function renderHome(){
  const live = MATCHES.filter(m=>m.status==='live');
  const todayKey = todayYMD();
  const today = MATCHES.filter(m=>isSameDay(m.date, todayKey) && m.status!=='live');
  const upcoming = MATCHES.filter(m=>!isSameDay(m.date,todayKey) && m.status==='scheduled').slice(0,4);
  const recent = MATCHES.filter(m=>m.status==='finished').slice(0,4);
  const topPicks = [...PREDICTIONS].sort((a,b)=>b.confidence-a.confidence).slice(0,3);

  let html = '';

  // Live
  html += sectionHead('🔴 Ao vivo agora', live.length?`${live.length} jogos`:null);
  if(live.length){
    html += `<div class="hscroll">`;
    live.forEach(m=> html += liveCard(m));
    html += `</div>`;
  } else {
    html += emptyState('⚽','Nenhum jogo ao vivo neste momento');
  }

  // Today's games
  html += sectionHead('📅 Jogos de hoje', null);
  html += `<div class="card">`;
  if(today.length) today.forEach(m=> html += matchRow(m));
  else html += emptyState('🗓️','Sem mais jogos hoje');
  html += `</div>`;

  // Upcoming
  html += sectionHead('⏭️ Próximos jogos', 'Ver calendário', ()=>{ goToPage('more'); showMoreSub('calendar'); });
  html += `<div class="card">`;
  upcoming.forEach(m=> html += matchRow(m, true));
  html += `</div>`;

  // Recent results
  html += sectionHead('📈 Resultados recentes', null);
  html += `<div class="card">`;
  recent.forEach(m=> html += matchRow(m));
  html += `</div>`;

  // Featured competitions
  html += sectionHead('🏆 Campeonatos em destaque', 'Ver todos', ()=>{ goToPage('more'); showMoreSub('competitions'); });
  html += `<div class="comp-grid">`;
  ['WC','BRA_A','UCL','LIBERTA'].forEach(code=> html += compTile(code));
  html += `</div>`;

  // AI ranking
  html += sectionHead('🤖 Ranking dos melhores palpites', 'Ver IA completa', ()=> goToPage('ai'));
  html += `<div class="card" style="padding:4px 10px">`;
  topPicks.forEach((p,i)=>{
    const m = MATCHES.find(x=>x.id===p.matchId);
    html += `<div class="rank-row" onclick="openMatchDetail('${m.id}','ai')" style="cursor:pointer">
      <div class="rank-pos">${i+1}</div>
      <div class="rank-info">
        <div class="rank-name">${teamName(m.home)} x ${teamName(m.away)}</div>
        <div class="rank-sub">Palpite IA: ${p.pick} · ${leagueOf(m).name}</div>
      </div>
      <div class="rank-val" style="color:var(--accent)">${p.confidence}%<small>confiança</small></div>
    </div>`;
  });
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
  return `<div class="news-card">
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

  const list = filterMatches(state.liveFilter).filter(m=> !liveLeagueFilter || m.league===liveLeagueFilter);

  // group by league
  const byLeague = {};
  list.forEach(m=>{ (byLeague[m.league] = byLeague[m.league]||[]).push(m); });

  if(Object.keys(byLeague).length===0){
    html += emptyState('📭','Nenhum jogo encontrado para esse filtro');
  } else {
    Object.keys(byLeague).forEach(code=>{
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
    Object.keys(byLeague).forEach(code=>{
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
function renderAI(){
  let html = `<div class="section-head" style="margin-top:4px"><div class="section-title display">🤖 IA de Palpites</div></div>`;
  html += `<div class="card" style="padding:12px;margin-bottom:14px;background:var(--grad-card)">
    <div style="font-size:12.5px;color:var(--text-dim);line-height:1.5">
      Nossa IA analisa <b style="color:var(--text)">forma recente, desfalques, mando de campo, histórico de confrontos e xG/xA</b> para gerar probabilidades e recomendações de mercado para cada partida.
    </div>
  </div>`;

  const sorted = [...PREDICTIONS].sort((a,b)=>b.confidence-a.confidence);
  sorted.forEach(p=>{
    const m = MATCHES.find(x=>x.id===p.matchId);
    const lg = leagueOf(m);
    const ringColor = p.confidence>=70 ? 'var(--accent)' : p.confidence>=55 ? 'var(--gold)' : 'var(--blue)';
    const circumference = 2*Math.PI*27;
    const offset = circumference * (1 - p.confidence/100);

    html += `<div class="card ai-card">
      <div class="ai-head">
        <div class="ai-league">${lg.icon} ${lg.name} · ${m.round||''}</div>
        <div class="ai-time">${m.status==='live' ? `🔴 ${m.minute}'` : fmtDate(m.date)+' '+fmtTime(m.date)}</div>
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

      <div style="font-size:12.5px;color:var(--text-dim);margin-bottom:4px">Palpite da IA: <b style="color:var(--text)">${p.pick}</b></div>
      <div style="font-size:11px;font-weight:700;color:var(--text-faint);text-transform:uppercase;letter-spacing:.5px;margin:10px 0 4px">Por que a IA pensa assim</div>
      <ul class="ai-reasons">${p.reasons.map(r=>`<li>${r}</li>`).join('')}</ul>

      <div style="font-size:11px;font-weight:700;color:var(--text-faint);text-transform:uppercase;letter-spacing:.5px;margin:6px 0 8px">Mercados sugeridos</div>
      <div class="market-tags">${p.markets.map(mk=>`<span class="market-tag ${mk.type}">${mk.label}</span>`).join('')}</div>

      <div class="ai-footer">
        <div class="btn ghost" onclick="openMatchDetail('${m.id}')">📊 Ver partida</div>
        <div class="btn primary" onclick="addToTicket('${m.id}')">🎟️ Add. ao bilhete</div>
      </div>
    </div>`;
  });

  document.getElementById('page-ai').innerHTML = html;
}

let ticket = [];
function addToTicket(matchId){
  const p = PREDICTIONS.find(x=>x.matchId===matchId);
  const m = MATCHES.find(x=>x.id===matchId);
  if(ticket.find(t=>t.matchId===matchId)){ toast('Esse jogo já está no seu bilhete','ℹ️'); return; }
  ticket.push({matchId, pick:p.pick, market:p.markets[0].label});
  toast(`${teamName(m.home)} x ${teamName(m.away)} adicionado ao bilhete (${ticket.length} jogos)`, '🎟️');
}

// ===================== NOTÍCIAS DO FUTEBOL =====================
function renderRankings(){
  renderFootballNews();
}

function renderFootballNews(){
  const tabs = [
    {id:'highlights', label:'🔥 Destaques'},
    {id:'brasileirao', label:'⚽ Brasileirão'},
    {id:'europa', label:'🌍 Europa'},
    {id:'mercado', label:'💰 Mercado'},
  ];
  const allNews = NEWS.map((n,i)=> ({...n, cat: i===1?'mercado': i===2||i===3?'brasileirao': i===4?'brasileirao':'highlights'}));
  const extra = [
    {icon:'🏆', tag:'BRASILEIRÃO', title:'Rodada tem clássicos decisivos e disputa forte no G4', time:'agora', cat:'brasileirao'},
    {icon:'🇪🇺', tag:'EUROPA', title:'Clubes europeus monitoram jovens promessas do futebol brasileiro', time:'há 18 min', cat:'europa'},
    {icon:'💰', tag:'MERCADO', title:'Mercado da bola esquenta com sondagens por atacantes', time:'há 44 min', cat:'mercado'},
    {icon:'⭐', tag:'EUROPA', title:'Champions League prepara rodada com favoritos em campo', time:'há 1 h', cat:'europa'},
  ];
  const list = [...allNews, ...extra].filter(n => state.newsTab==='highlights' ? true : n.cat===state.newsTab);

  let html = `<div class="section-head" style="margin-top:4px"><div class="section-title display">📰 Notícias do futebol</div></div>`;
  html += `<div class="news-hero card">
    <div class="news-hero-badge">Atualizações</div>
    <div class="news-hero-title">Tudo do futebol em uma aba só</div>
    <div class="news-hero-sub">Destaques, Brasileirão, Europa e mercado da bola organizados por categoria.</div>
  </div>`;
  html += `<div class="chip-row news-tabs" style="margin:12px 0 8px">`;
  tabs.forEach(t=> html += `<div class="chip ${state.newsTab===t.id?'active':''}" onclick="setNewsTab('${t.id}')">${t.label}</div>`);
  html += `</div>`;
  html += `<div class="card news-list" style="padding:4px 10px;margin-top:8px">`;
  list.forEach(n=> html += newsCard(n));
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
  const list = filterMatches(filter);
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
function renderPremiumSub(){
  return `<div class="premium-hero">
    <div class="premium-pill">💎 Plano configurável</div>
    <div class="premium-title">Prado Sports AI Premium</div>
    <div class="premium-sub">Tela pronta para publicar. Depois você só troca preço, link de pagamento e benefícios.</div>
  </div>
  <div class="premium-grid">
    <button class="premium-mini" onclick="showMoreSub('scanner')">🔎 Scanner</button>
    <button class="premium-mini" onclick="showMoreSub('simulator')">📈 Simulador</button>
    <button class="premium-mini" onclick="showMoreSub('notifications')">🔔 Alertas</button>
  </div>
  ${menuSection('O que está incluso', [
    {icon:'🤖', label:'IA avançada com explicações detalhadas', action:`showMoreSub('premium')`},
    {icon:'🎟️', label:'Bilhetes prontos diários com odds combinadas', action:`toast('Bilhetes premium prontos para conectar ao pagamento.','🎟️')`},
    {icon:'🔔', label:'Alertas automáticos de oportunidades', action:`showMoreSub('notifications')`},
    {icon:'📊', label:'Estatísticas avançadas (xG, xA, heatmaps)', action:`toast('Estatísticas avançadas prontas no detalhe da partida.','📊')`},
    {icon:'📈', label:'Simulador de apostas ilimitado', action:`showMoreSub('simulator')`},
    {icon:'🔎', label:'Scanner de valor em tempo real', action:`showMoreSub('scanner')`},
    {icon:'🧮', label:'Jogos filtrados por oportunidade de valor', action:`showMoreSub('scanner')`},
  ])}
  <div class="btn primary" style="padding:14px;margin-top:6px" onclick="toast('Configure seu checkout/link de pagamento aqui.','💎')">Assinar Premium</div>`;
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
    <div class="scanner-sub">A IA compara probabilidades estimadas com odds do mercado e marca quando existe vantagem.</div>
  </div>`;
  h += `<div class="scanner-toolbar"><span>Oportunidades encontradas</span><b id="scanner-count">0</b></div>`;
  ODDS.forEach(o=>{
    const m = MATCHES.find(x=>x.id===o.matchId);
    const p = PREDICTIONS.find(x=>x.matchId===o.matchId);
    const markets = [
      {label: teamName(m.home), prob:p.probs.home, odd:o.now.h},
      {label:'Empate', prob:p.probs.draw, odd:o.now.d},
      {label: teamName(m.away), prob:p.probs.away, odd:o.now.a},
    ].map(x=> ({...x, implied:100/x.odd, diff:x.prob-(100/x.odd)})).sort((a,b)=>b.diff-a.diff);
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
  setTimeout(()=>{ const c=document.getElementById('scanner-count'); if(c) c.textContent=valueCount; },0);
  return h;
}

// ---- Notifications ----
const NOTIF_FEED = [
  {icon:'⚽', text:'GOL! Brasil 2x1 Argentina — Endrick', time:'2 min'},
  {icon:'🟨', text:'Cartão amarelo: Otamendi (Argentina)', time:'24 min'},
  {icon:'🔔', text:'Flamengo x Palmeiras começa em 1h', time:'58 min'},
  {icon:'🏁', text:'Fim de jogo: Atlético-MG 1x0 Fluminense', time:'há 3h'},
];
function renderNotificationsSub(){
  const permission = ('Notification' in window) ? Notification.permission : 'unsupported';
  let h = `<div class="card notif-permission">
    <div><b>🔔 Notificações do Prado</b><span>Status: ${permission==='granted'?'ativadas':permission==='denied'?'bloqueadas':'aguardando permissão'}</span></div>
    <button class="btn primary" onclick="enableNotifications()">Ativar</button>
  </div>`;
  h += `<div class="menu-label">Tipos de alerta</div><div class="card" style="padding:0 12px;margin-bottom:16px">`;
  const items = [
    {key:'gol', label:'Gols', sub:'Alerta imediato a cada gol marcado'},
    {key:'cartao', label:'Cartões', sub:'Amarelos e vermelhos em jogos favoritos'},
    {key:'escanteio', label:'Escanteios', sub:'A cada escanteio em jogos favoritos'},
    {key:'inicio', label:'Início do jogo', sub:'Aviso quando a partida começar'},
    {key:'fim', label:'Final do jogo', sub:'Resultado final do jogo favorito'},
    {key:'entrada', label:'Entrada em campo', sub:'Escalação confirmada e times em campo'},
  ];
  items.forEach(it=>{
    h += `<div class="setting-row">
      <div><div class="setting-label">${it.label}</div><div class="setting-sub">${it.sub}</div></div>
      <div class="switch ${state.notifSettings[it.key]?'on':''}" data-notif="${it.key}"></div>
    </div>`;
  });
  h += `</div>`;
  h += `<button class="btn ghost" style="margin-bottom:14px" onclick="sendTestNotification()">Enviar teste</button>`;
  h += `<div class="menu-label">Recentes</div><div class="card" style="padding:0 10px">`;
  NOTIF_FEED.forEach(n=> h += `<div class="news-card"><div class="news-thumb" style="font-size:20px">${n.icon}</div><div class="news-body"><div class="news-title">${n.text}</div><div class="news-meta">há ${n.time}</div></div></div>`);
  h += `</div>`;
  return h;
}

function enableNotifications(){
  if(!('Notification' in window)){ toast('Este navegador não suporta notificações.','⚠️'); return; }
  Notification.requestPermission().then(status=>{
    toast(status==='granted' ? 'Notificações ativadas com sucesso!' : 'Permissão não liberada no navegador.', status==='granted'?'🔔':'⚠️');
    renderMoreSub('notifications');
  });
}
function sendTestNotification(){
  if('Notification' in window && Notification.permission==='granted'){
    new Notification('Prado Sports AI', { body:'Teste de alerta funcionando ✅', icon:'./icons/icon-192.png' });
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
    Os dados exibidos nesta versão são <b style="color:var(--text)">demonstrativos</b>. Conecte uma API gratuita de futebol (veja o README) para dados ao vivo reais.
  </div>`;
}

// ===================== MATCH DETAIL =====================
let currentMatchId = null;
function bindDetailOverlay(){
  document.getElementById('detail-close').addEventListener('click', closeMatchDetail);
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
      <div class="detail-league">${lg.icon} ${lg.name} · ${m.round||''}</div>
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

  if(tab){
    const t = ov.querySelector(`.tab[data-tab="${tab}"]`);
    if(t) t.click();
  }
}

function detailResumo(m){
  if(!m.events) return emptyState('📝', m.status==='scheduled' ? 'A partida ainda não começou. Acompanhe a transmissão minuto a minuto aqui quando começar.' : 'Sem eventos registrados para esta partida na demo.');
  const icons = {goal:'⚽', yellow:'🟨', red:'🟥', sub:'🔄', corner:'🚩', var:'📺'};
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
  if(!m.stats) return emptyState('📊','Estatísticas detalhadas estarão disponíveis quando a partida começar.');
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
  if(!m.lineups) return emptyState('👥','Escalações confirmadas serão exibidas próximo do início da partida.');
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
  if(!m.stats) return emptyState('🗺️','Mapas de calor e finalizações ficam disponíveis durante e após a partida.');
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
  const p = PREDICTIONS.find(x=>x.matchId===m.id);
  if(!p) return emptyState('🤖','A IA ainda não gerou um palpite para esta partida.');
  const circumference = 2*Math.PI*27;
  const offset = circumference * (1 - p.confidence/100);
  return `<div class="card ai-card" style="margin-bottom:10px">
    <div class="matchup">
      <div class="vs-teams">
        <div class="t">${crestHTML(m.home)}${teamName(m.home)}</div>
        <div class="t">${crestHTML(m.away)}${teamName(m.away)}</div>
      </div>
      <div class="confidence-ring">
        <svg width="64" height="64" viewBox="0 0 64 64">
          <circle class="ring-bg" cx="32" cy="32" r="27"/>
          <circle class="ring-fg" cx="32" cy="32" r="27" style="stroke-dasharray:${circumference};stroke-dashoffset:${offset}"/>
        </svg>
        <div class="ring-val"><b>${p.confidence}%</b><small>IA</small></div>
      </div>
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
    <div style="font-size:12.5px;color:var(--text-dim);margin-bottom:4px">Palpite da IA: <b style="color:var(--text)">${p.pick}</b></div>
    <div style="font-size:11px;font-weight:700;color:var(--text-faint);text-transform:uppercase;letter-spacing:.5px;margin:10px 0 4px">Motivos</div>
    <ul class="ai-reasons">${p.reasons.map(r=>`<li>${r}</li>`).join('')}</ul>
    <div style="font-size:11px;font-weight:700;color:var(--text-faint);text-transform:uppercase;letter-spacing:.5px;margin:6px 0 8px">Mercados sugeridos</div>
    <div class="market-tags">${p.markets.map(mk=>`<span class="market-tag ${mk.type}">${mk.label}</span>`).join('')}</div>
  </div>`;
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
  const term = (q||'').toLowerCase().trim();
  const results = [];
  MATCHES.forEach(m=>{
    const text = `${teamName(m.home)} ${teamName(m.away)} ${leagueOf(m).name}`.toLowerCase();
    if(!term || text.includes(term)) results.push({type:'match', label:`${teamName(m.home)} x ${teamName(m.away)}`, sub:`${leagueOf(m).icon} ${leagueOf(m).name} · ${fmtDate(m.date)} ${fmtTime(m.date)}`, id:m.id});
  });
  NEWS.forEach((n,i)=>{
    const text = `${n.tag} ${n.title}`.toLowerCase();
    if(term && text.includes(term)) results.push({type:'news', label:n.title, sub:`${n.tag} · ${n.time}`, id:i});
  });
  const html = results.slice(0,12).map(r=> r.type==='match'
    ? `<div class="search-item" onclick="closeSearch();openMatchDetail('${r.id}')"><b>⚽ ${r.label}</b><span>${r.sub}</span></div>`
    : `<div class="search-item" onclick="closeSearch();goToPage('rank')"><b>📰 ${r.label}</b><span>${r.sub}</span></div>`
  ).join('') || emptyState('🔎','Nada encontrado');
  document.getElementById('search-results').innerHTML = html;
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
      if(m.status==='live' && m.minute < 90){
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
