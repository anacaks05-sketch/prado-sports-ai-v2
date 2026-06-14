/* =====================================================
   PRADO SPORTS AI — Data layer
   All data below is DEMO/MOCK data so the app works
   instantly offline. See README.md for how to swap
   this for a free live API (API-Football / football-data.org).
===================================================== */

const TEAMS = {
  FLA:{name:'Flamengo', color:'#C8102E'},
  PAL:{name:'Palmeiras', color:'#1B5E32'},
  COR:{name:'Corinthians', color:'#1A1A1A'},
  SAO:{name:'São Paulo', color:'#B7093B'},
  GRE:{name:'Grêmio', color:'#0E4C92'},
  INT:{name:'Internacional', color:'#D4001A'},
  CAM:{name:'Atlético-MG', color:'#2B2B2B'},
  FLU:{name:'Fluminense', color:'#7A003C'},
  BOT:{name:'Botafogo', color:'#1A1A1A'},
  BAH:{name:'Bahia', color:'#0A4DA1'},

  BRA:{name:'Brasil', color:'#1F8C3B'},
  ARG:{name:'Argentina', color:'#6CACE4'},
  FRA:{name:'França', color:'#0055A4'},
  ENG:{name:'Inglaterra', color:'#CF142B'},
  ESP:{name:'Espanha', color:'#C60B1E'},
  POR:{name:'Portugal', color:'#046A38'},
  ALE:{name:'Alemanha', color:'#DD0000'},
  URU:{name:'Uruguai', color:'#3C9CDC'},
  EUA:{name:'Estados Unidos', color:'#3C3B6E'},
  MEX:{name:'México', color:'#006847'},
  JAP:{name:'Japão', color:'#BC002D'},
  HOL:{name:'Holanda', color:'#F36C21'},
  CRO:{name:'Croácia', color:'#FF0000'},
  MAR:{name:'Marrocos', color:'#C1272D'},
  COL:{name:'Colômbia', color:'#FCD116'},
  ECU:{name:'Equador', color:'#FFD100'},

  RMA:{name:'Real Madrid', color:'#A98F4B'},
  MCI:{name:'Manchester City', color:'#6CABDD'},
  BAY:{name:'Bayern de Munique', color:'#DC052D'},
  PSG:{name:'Paris Saint-Germain', color:'#004170'},
  LIV:{name:'Liverpool', color:'#C8102E'},
  BAR:{name:'Barcelona', color:'#A50044'},
  ARS:{name:'Arsenal', color:'#EF0107'},
  MUN:{name:'Manchester United', color:'#DA291C'},
  CHE:{name:'Chelsea', color:'#034694'},
  ATM:{name:'Atlético de Madrid', color:'#CB3524'},
  INT2:{name:'Inter de Milão', color:'#0068A8'},
  JUV:{name:'Juventus', color:'#222222'},
};

function initials(code){ return code.replace('2','').slice(0,3); }

// ---- Leagues / Competitions ----
const LEAGUES = {
  BRA_A:{name:'Brasileirão Série A', country:'Brasil', icon:'🇧🇷', color:'#1F8C3B', tier:'Nacional'},
  BRA_B:{name:'Brasileirão Série B', country:'Brasil', icon:'🇧🇷', color:'#2E7D32', tier:'Nacional'},
  CDB:{name:'Copa do Brasil', country:'Brasil', icon:'🏆', color:'#FFB23E', tier:'Copa nacional'},
  LIBERTA:{name:'Libertadores', country:'CONMEBOL', icon:'🌎', color:'#7A1FA2', tier:'Internacional'},
  SULAM:{name:'Sul-Americana', country:'CONMEBOL', icon:'🌎', color:'#E65100', tier:'Internacional'},
  UCL:{name:'Champions League', country:'UEFA', icon:'⭐', color:'#0B2D6B', tier:'Internacional'},
  UEL:{name:'Europa League', country:'UEFA', icon:'🏆', color:'#F57C00', tier:'Internacional'},
  EPL:{name:'Premier League', country:'Inglaterra', icon:'🏴', color:'#3D195B', tier:'Liga nacional'},
  LALIGA:{name:'La Liga', country:'Espanha', icon:'🇪🇸', color:'#EE8707', tier:'Liga nacional'},
  BUND:{name:'Bundesliga', country:'Alemanha', icon:'🇩🇪', color:'#D20515', tier:'Liga nacional'},
  SERIEA:{name:'Serie A', country:'Itália', icon:'🇮🇹', color:'#024494', tier:'Liga nacional'},
  LIGUE1:{name:'Ligue 1', country:'França', icon:'🇫🇷', color:'#091C3E', tier:'Liga nacional'},
  PORTUGAL:{name:'Portugal Primeira Liga', country:'Portugal', icon:'🇵🇹', color:'#046A38', tier:'Liga nacional'},
  WC:{name:'Copa do Mundo 2026', country:'EUA · México · Canadá', icon:'🏆', color:'#FFD100', tier:'Mundial'},
  CLUBWC:{name:'Mundial de Clubes', country:'FIFA', icon:'🌍', color:'#00AEEF', tier:'Mundial'},
  ELIM:{name:'Eliminatórias', country:'Mundial', icon:'🌍', color:'#21E6A1', tier:'Mundial'},
  MLS:{name:'MLS', country:'Estados Unidos', icon:'🇺🇸', color:'#0057B8', tier:'Liga nacional'},
};

// ---- Matches ----
// O app agora trabalha com dados reais da API-Football.
// Mantemos a lista vazia para não exibir jogos demo/falsos quando a API falhar.
let MATCHES = [];

// ---- AI predictions ----
// Palpites são gerados dinamicamente com base nos jogos reais carregados.
let PREDICTIONS = [];

// ---- Rankings ----
const RANKINGS = {
  scorers:[
    {pos:1, name:'Vini Jr', team:'BRA', val:14, sub:'14 jogos · 1.0 gol/jogo'},
    {pos:2, name:'Endrick', team:'BRA', val:12, sub:'15 jogos · 0.8 gol/jogo'},
    {pos:3, name:'Julián Álvarez', team:'ARG', val:11, sub:'13 jogos · 0.85 gol/jogo'},
    {pos:4, name:'Erling sub. (CAM)', team:'CAM', val:10, sub:'14 jogos'},
    {pos:5, name:'Yamal', team:'BAR', val:9, sub:'16 jogos'},
    {pos:6, name:'Mbappé', team:'RMA', val:9, sub:'12 jogos'},
    {pos:7, name:'Pedro', team:'FLA', val:8, sub:'15 jogos'},
    {pos:8, name:'Calleri', team:'SAO', val:7, sub:'14 jogos'},
  ],
  assists:[
    {pos:1, name:'Neymar', team:'BRA', val:11, sub:'14 jogos'},
    {pos:2, name:'De Bruyne', team:'MCI', val:10, sub:'15 jogos'},
    {pos:3, name:'Messi', team:'ARG', val:9, sub:'13 jogos'},
    {pos:4, name:'Arrascaeta', team:'FLA', val:8, sub:'16 jogos'},
    {pos:5, name:'Bruno G.', team:'BRA', val:7, sub:'14 jogos'},
    {pos:6, name:'Raphinha', team:'BAR', val:7, sub:'15 jogos'},
  ],
  keepers:[
    {pos:1, name:'Alisson', team:'BRA', val:9, sub:'14 jogos · 64% jogos sem sofrer'},
    {pos:2, name:'Dibu Martínez', team:'ARG', val:8, sub:'13 jogos'},
    {pos:3, name:'Ederson sub. (MCI)', team:'MCI', val:8, sub:'15 jogos'},
    {pos:4, name:'Rossi', team:'FLA', val:7, sub:'16 jogos'},
    {pos:5, name:'Hugo Souza', team:'COR', val:6, sub:'14 jogos'},
  ],
  attack:[
    {pos:1, name:'Flamengo', team:'FLA', val:'2.4', sub:'gols marcados / jogo'},
    {pos:2, name:'Palmeiras', team:'PAL', val:'2.2', sub:'gols marcados / jogo'},
    {pos:3, name:'Real Madrid', team:'RMA', val:'2.6', sub:'gols marcados / jogo'},
    {pos:4, name:'Manchester City', team:'MCI', val:'2.5', sub:'gols marcados / jogo'},
    {pos:5, name:'Barcelona', team:'BAR', val:'2.3', sub:'gols marcados / jogo'},
  ],
  defense:[
    {pos:1, name:'Palmeiras', team:'PAL', val:'0.6', sub:'gols sofridos / jogo'},
    {pos:2, name:'Botafogo', team:'BOT', val:'0.7', sub:'gols sofridos / jogo'},
    {pos:3, name:'Arsenal', team:'ARS', val:'0.7', sub:'gols sofridos / jogo'},
    {pos:4, name:'Atlético-MG', team:'CAM', val:'0.8', sub:'gols sofridos / jogo'},
    {pos:5, name:'Inter de Milão', team:'INT2', val:'0.8', sub:'gols sofridos / jogo'},
  ],
  homeForm:[
    {pos:1, name:'Flamengo', team:'FLA', val:'92%', sub:'aproveitamento em casa'},
    {pos:2, name:'Real Madrid', team:'RMA', val:'88%', sub:'aproveitamento em casa'},
    {pos:3, name:'Palmeiras', team:'PAL', val:'85%', sub:'aproveitamento em casa'},
    {pos:4, name:'Manchester City', team:'MCI', val:'83%', sub:'aproveitamento em casa'},
    {pos:5, name:'Bayern de Munique', team:'BAY', val:'81%', sub:'aproveitamento em casa'},
  ],
  awayForm:[
    {pos:1, name:'Manchester City', team:'MCI', val:'76%', sub:'aproveitamento fora'},
    {pos:2, name:'Real Madrid', team:'RMA', val:'74%', sub:'aproveitamento fora'},
    {pos:3, name:'Botafogo', team:'BOT', val:'70%', sub:'aproveitamento fora'},
    {pos:4, name:'Arsenal', team:'ARS', val:'68%', sub:'aproveitamento fora'},
    {pos:5, name:'Palmeiras', team:'PAL', val:'65%', sub:'aproveitamento fora'},
  ],
};

// ---- News ----
// Notícias demo removidas para não mostrar informação falsa ao cliente.
// Próxima etapa: conectar uma API/RSS real de notícias.
let NEWS = [];

// ---- Competitions for grid ----
const COMPETITIONS_LIST = ['WC','CLUBWC','BRA_A','LIBERTA','SULAM','UCL','UEL','EPL','LALIGA','SERIEA','BUND','LIGUE1','PORTUGAL','CDB','BRA_B','ELIM'];

// ---- Odds ----
// Odds demo removidas. O scanner só mostra oportunidade quando odds reais forem conectadas.
const ODDS = [];

// ---- helpers ----
function fmtDate(iso){
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
}
function fmtTime(iso){
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
}
function crestHTML(code, size=24){
  const t = TEAMS[code] || {name:code, color:'#444'};
  const label = initials(code);
  if(t.logo){
    return `<div class="crest crest-img" style="width:${size}px;height:${size}px;background:${t.color||'#16202d'};font-size:${Math.round(size*0.42)}px" title="${t.name||code}"><img src="${t.logo}" alt="${t.name||code}" loading="lazy" onerror="this.style.display='none';this.parentElement.classList.add('crest-fallback')"><span>${label}</span></div>`;
  }
  return `<div class="crest" style="width:${size}px;height:${size}px;background:${t.color};font-size:${Math.round(size*0.42)}px">${label}</div>`;
}
function teamName(code){ return (TEAMS[code]||{name:code}).name; }
function leagueOf(m){ return LEAGUES[m.league]; }
