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
// status: 'live' | 'scheduled' | 'finished'
let MATCHES = [
  {
    id:'wc-bra-arg', league:'WC', date:'2026-06-12T16:00:00', status:'live', minute:67,
    home:'BRA', away:'ARG', hs:2, as:1, venue:'MetLife Stadium, Nova Jersey', round:'Grupo A · Rodada 2',
    stats:{
      possession:[58,42], shotsOnTarget:[6,3], shotsOffTarget:[5,7], corners:[7,3],
      fouls:[8,11], yellow:[1,3], red:[0,0], xg:[2.31,1.04], xa:[1.62,0.71], dangerousAttacks:[24,15]
    },
    lineups:{
      home:{formation:'4-3-3', players:[
        {n:1,p:'Alisson'},{n:2,p:'Danilo'},{n:3,p:'Marquinhos'},{n:4,p:'Gabriel'},{n:6,p:'Wendell'},
        {n:5,p:'Casemiro'},{n:8,p:'Bruno G.'},{n:10,p:'Neymar'},
        {n:7,p:'Raphinha'},{n:9,p:'Endrick'},{n:11,p:'Vini Jr'}
      ]},
      away:{formation:'4-4-2', players:[
        {n:1,p:'Dibu'},{n:4,p:'Otamendi'},{n:2,p:'Romero'},{n:3,p:'Tagliafico'},{n:26,p:'Molina'},
        {n:5,p:'De Paul'},{n:8,p:'Mac Allister'},{n:11,p:'Di María'},{n:20,p:'Enzo'},
        {n:10,p:'Messi'},{n:9,p:'Julián Á.'}
      ]}
    },
    events:[
      {min:12, type:'goal', team:'home', text:'<b>GOL!</b> Vini Jr. abre o placar após linda jogada pela esquerda.'},
      {min:24, type:'yellow', team:'away', text:'Cartão amarelo para Otamendi por falta em Endrick.'},
      {min:38, type:'goal', team:'away', text:'<b>GOL!</b> Messi cobra falta com categoria e empata o jogo.'},
      {min:52, type:'goal', team:'home', text:'<b>GOL!</b> Endrick aproveita rebote dentro da área e recoloca o Brasil na frente.'},
      {min:60, type:'sub', team:'home', text:'Substituição: entra Rodrygo, sai Raphinha.'},
      {min:65, type:'corner', team:'away', text:'Escanteio para a Argentina pela direita.'},
      {min:67, type:'var', team:'home', text:'VAR analisa possível pênalti para o Brasil.'}
    ],
    h2h:[
      {date:'2025-11-15', comp:'Eliminatórias', score:'1-0'},
      {date:'2024-09-10', comp:'Eliminatórias', score:'1-1'},
      {date:'2023-11-21', comp:'Eliminatórias', score:'1-0'},
    ]
  },
  {
    id:'wc-fra-mar', league:'WC', date:'2026-06-12T19:00:00', status:'live', minute:23,
    home:'FRA', away:'MAR', hs:0, as:0, venue:'SoFi Stadium, Los Angeles', round:'Grupo B · Rodada 2',
    stats:{ possession:[61,39], shotsOnTarget:[2,1], shotsOffTarget:[3,2], corners:[3,1], fouls:[4,6], yellow:[0,1], red:[0,0], xg:[0.42,0.21], xa:[0.30,0.15], dangerousAttacks:[9,5] }
  },
  {
    id:'epl-ars-mci', league:'EPL', date:'2026-06-12T13:30:00', status:'live', minute:78,
    home:'ARS', away:'MCI', hs:1, as:1, venue:'Emirates Stadium, Londres', round:'Rodada 38',
    stats:{ possession:[47,53], shotsOnTarget:[5,7], shotsOffTarget:[4,5], corners:[5,6], fouls:[9,7], yellow:[2,1], red:[0,0], xg:[1.45,1.78], xa:[1.02,1.30], dangerousAttacks:[19,22] }
  },
  {
    id:'bra-fla-pal', league:'BRA_A', date:'2026-06-12T20:00:00', status:'scheduled',
    home:'FLA', away:'PAL', venue:'Maracanã, Rio de Janeiro', round:'Rodada 12',
    h2h:[
      {date:'2025-10-05', comp:'Brasileirão', score:'2-1'},
      {date:'2025-06-22', comp:'Brasileirão', score:'1-1'},
      {date:'2025-04-13', comp:'Copa do Brasil', score:'0-2'},
      {date:'2024-11-30', comp:'Brasileirão', score:'3-0'},
    ]
  },
  {
    id:'bra-cor-sao', league:'BRA_A', date:'2026-06-12T21:30:00', status:'scheduled', home:'COR', away:'SAO', venue:'Neo Química Arena, São Paulo', round:'Rodada 12'},
  {
    id:'wc-esp-eng', league:'WC', date:'2026-06-13T16:00:00', status:'scheduled', home:'ESP', away:'ENG', venue:'AT&T Stadium, Dallas', round:'Grupo C · Rodada 2'},
  {
    id:'ucl-rma-mun', league:'UCL', date:'2026-06-13T15:00:00', status:'scheduled', home:'RMA', away:'MUN', venue:'Santiago Bernabéu, Madrid', round:'Final'},
  {
    id:'liberta-fla-bot', league:'LIBERTA', date:'2026-06-14T21:30:00', status:'scheduled', home:'FLA', away:'BOT', venue:'Maracanã, Rio de Janeiro', round:'Quartas de final'},

  // finished (yesterday / earlier today)
  {
    id:'f-gre-int', league:'BRA_A', date:'2026-06-11T19:00:00', status:'finished', home:'GRE', away:'INT', hs:2, as:2, round:'Rodada 11',
    stats:{ possession:[50,50], shotsOnTarget:[5,4], shotsOffTarget:[6,5], corners:[6,4], fouls:[10,12], yellow:[3,2], red:[0,1], xg:[1.9,1.7], xa:[1.1,1.0], dangerousAttacks:[18,17] } },
  {
    id:'f-cam-flu', league:'BRA_A', date:'2026-06-11T21:00:00', status:'finished', home:'CAM', away:'FLU', hs:1, as:0, round:'Rodada 11'},
  {
    id:'f-wc-uru-mex', league:'WC', date:'2026-06-11T16:00:00', status:'finished', home:'URU', away:'MEX', hs:3, as:1, round:'Grupo D · Rodada 1'},
  {
    id:'f-wc-jap-hol', league:'WC', date:'2026-06-11T13:00:00', status:'finished', home:'JAP', away:'HOL', hs:1, as:1, round:'Grupo E · Rodada 1'},
  {
    id:'f-laliga-bar-atm', league:'LALIGA', date:'2026-06-11T17:00:00', status:'finished', home:'BAR', away:'ATM', hs:2, as:1, round:'Rodada 38'},
  {
    id:'f-bund-bay-juv', league:'BUND', date:'2026-06-11T15:30:00', status:'finished', home:'BAY', away:'JUV', hs:3, as:0, round:'Amistoso'},

  // upcoming (next days)
  {
    id:'u-wc-ale-col', league:'WC', date:'2026-06-14T13:00:00', status:'scheduled', home:'ALE', away:'COL', venue:'Lincoln Financial Field, Filadélfia', round:'Grupo F · Rodada 1'},
  {
    id:'u-wc-por-ecu', league:'WC', date:'2026-06-15T16:00:00', status:'scheduled', home:'POR', away:'ECU', venue:'Mercedes-Benz Stadium, Atlanta', round:'Grupo G · Rodada 1'},
  {
    id:'u-bra-bah-cor', league:'BRA_A', date:'2026-06-15T16:00:00', status:'scheduled', home:'BAH', away:'COR', venue:'Arena Fonte Nova, Salvador', round:'Rodada 13'},
  {
    id:'u-epl-liv-che', league:'EPL', date:'2026-06-16T15:00:00', status:'scheduled', home:'LIV', away:'CHE', venue:'Anfield, Liverpool', round:'Amistoso de pré-temporada'},
];

// ---- AI predictions ----
let PREDICTIONS = [
  {
    matchId:'bra-fla-pal', confidence:78, pick:'Flamengo',
    probs:{home:54, draw:26, away:20},
    markets:[
      {label:'Vitória Flamengo', type:''}, {label:'Ambas marcam', type:'blue'},
      {label:'Over 2.5 gols', type:''}, {label:'Escanteios +9.5', type:'gold'},
    ],
    reasons:[
      'Flamengo venceu 4 dos últimos 5 jogos em casa',
      'Melhor média de gols marcados no returno (2.4 por jogo)',
      'Palmeiras com 3 desfalques importantes na defesa',
      'Histórico recente favorável no Maracanã (3 vitórias seguidas)'
    ]
  },
  {
    matchId:'bra-cor-sao', confidence:54, pick:'Empate / São Paulo',
    probs:{home:33, draw:31, away:36},
    markets:[
      {label:'Dupla chance X2', type:'blue'}, {label:'Under 2.5 gols', type:''},
      {label:'Ambas marcam: Não', type:'gold'},
    ],
    reasons:[
      'Clássico equilibrado nos últimos 6 confrontos (3 empates)',
      'Corinthians sofreu apenas 1 gol nos últimos 4 jogos em casa',
      'São Paulo melhora muito como visitante na temporada',
    ]
  },
  {
    matchId:'ucl-rma-mun', confidence:71, pick:'Real Madrid',
    probs:{home:62, draw:21, away:17},
    markets:[
      {label:'Vitória Real Madrid', type:''}, {label:'Over 2.5 gols', type:''},
      {label:'Real marca no 1º tempo', type:'blue'}, {label:'Placar: 2-1', type:'gold'},
    ],
    reasons:[
      'Real Madrid invicto há 14 jogos como mandante na Champions',
      'Melhor ataque da competição (xG médio 2.1 por jogo)',
      'United com desfalques no meio-campo titular',
      'Histórico de finais favorece o Real (3 títulos nas últimas 5)'
    ]
  },
  {
    matchId:'u-wc-ale-col', confidence:63, pick:'Alemanha',
    probs:{home:48, draw:27, away:25},
    markets:[
      {label:'Vitória Alemanha', type:''}, {label:'Over 1.5 gols', type:''},
      {label:'Ambas marcam', type:'blue'},
    ],
    reasons:[
      'Alemanha venceu 5 dos últimos 6 jogos de abertura em Copas',
      'Colômbia sem o lateral titular por suspensão',
      'Média de posse de bola superior em estreias de Mundial',
    ]
  },
  {
    matchId:'u-wc-por-ecu', confidence:69, pick:'Portugal',
    probs:{home:58, draw:24, away:18},
    markets:[
      {label:'Vitória Portugal', type:''}, {label:'Over 2.5 gols', type:''},
      {label:'Cristiano marca / assiste', type:'gold'},
    ],
    reasons:[
      'Portugal com 100% de aproveitamento nas últimas eliminatórias',
      'Equador costuma sofrer no calor e altitude reduzida da costa leste dos EUA',
      'Setor ofensivo português com média de 18 finalizações por jogo'
    ]
  },
  {
    matchId:'liberta-fla-bot', confidence:60, pick:'Flamengo',
    probs:{home:46, draw:29, away:25},
    markets:[
      {label:'Dupla chance 1X', type:'blue'}, {label:'Escanteios +9.5', type:'gold'},
      {label:'Ambas marcam', type:''},
    ],
    reasons:[
      'Clássico carioca costuma ter média alta de escanteios (10.2)',
      'Flamengo não perde para o Botafogo no Maracanã há 7 jogos',
      'Botafogo joga o returno fora de casa, historicamente mais fraco'
    ]
  },
];

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
let NEWS = [
  {tag:'Destaque', icon:'🔥', title:'Brasil x Argentina ao vivo: Endrick decide e Seleção vira na Copa do Mundo', time:'há 8 min'},
  {tag:'Transferência', icon:'🔄', title:'Mbappé é especulado em troca milionária para o futebol saudita em 2027', time:'há 32 min'},
  {tag:'Notícia', icon:'📰', title:'Flamengo confirma escalação com força máxima para clássico contra o Palmeiras', time:'há 1 h'},
  {tag:'IA Prado', icon:'🤖', title:'Palpite do dia: nossa IA aponta favoritismo de 78% para o Flamengo no clássico', time:'há 1 h'},
  {tag:'Lesão', icon:'🩹', title:'Zagueiro do Palmeiras é desfalque confirmado para a próxima rodada', time:'há 2 h'},
  {tag:'Transferência', icon:'🔄', title:'São Paulo negocia contratação de atacante argentino para o segundo semestre', time:'há 3 h'},
  {tag:'Notícia', icon:'📰', title:'Champions League: final entre Real Madrid e Manchester United já tem data confirmada', time:'há 4 h'},
];

// ---- Competitions for grid ----
const COMPETITIONS_LIST = ['WC','CLUBWC','BRA_A','LIBERTA','SULAM','UCL','UEL','EPL','LALIGA','SERIEA','BUND','LIGUE1','PORTUGAL','CDB','BRA_B','ELIM'];

// ---- Odds (mock, for the Odds area) ----
const ODDS = [
  {matchId:'bra-fla-pal', open:{h:2.10,d:3.20,a:3.60}, now:{h:1.95,d:3.30,a:3.80}, fav:'Flamengo', book:'Prado Odds'},
  {matchId:'bra-cor-sao', open:{h:2.60,d:3.00,a:2.80}, now:{h:2.75,d:3.05,a:2.65}, fav:'São Paulo', book:'Prado Odds'},
  {matchId:'ucl-rma-mun', open:{h:1.70,d:3.80,a:4.80}, now:{h:1.62,d:3.95,a:5.10}, fav:'Real Madrid', book:'Prado Odds'},
  {matchId:'u-wc-ale-col', open:{h:2.05,d:3.10,a:3.70}, now:{h:1.98,d:3.15,a:3.85}, fav:'Alemanha', book:'Prado Odds'},
];

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
