/* =====================================================
   PRADO SPORTS AI — Configuração da sua API

   1) Crie sua conta em https://www.api-football.com/ ou RapidAPI API-Football.
   2) Cole sua chave abaixo.
   3) No Vercel/Netlify, suba esse arquivo junto com o projeto.

   Atenção: em app 100% profissional, o ideal é esconder essa chave em um backend/proxy.
   Para teste e app pessoal, funciona direto aqui.
===================================================== */

const PRADO_CONFIG = {
  PROVIDER: 'api-football',
  API_KEY: 'COLE_SUA_CHAVE_AQUI',

  // RapidAPI:
  API_HOST: 'api-football-v1.p.rapidapi.com',
  API_BASE_URL: 'https://api-football-v1.p.rapidapi.com/v3',

  // Quantos dias mostrar no app: hoje + próximos dias
  DAYS_AHEAD: 7,

  // Timezone do Brasil
  TIMEZONE: 'America/Fortaleza',

  /* =====================================================
     Códigos Premium externos

     Cole aqui o link CSV da sua planilha publicada.
     Depois dessa configuração, você só adiciona códigos na planilha
     e NÃO precisa publicar na Vercel toda vez que vender.

     Colunas recomendadas na planilha:
     Código | Status | Validade

     Status aceitos: ativo, liberado, pago, ok, sim
     Validade: use DD/MM/AAAA, exemplo 13/07/2026
  ===================================================== */
  PREMIUM_CODES_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQAYrBkpkkMXifpT764LcpjUwzh87XfR22QoD_UtFpP3Q47gb2kO5Khj_MYxb-q24XnO7HyCAfTsT86/pub?gid=0&single=true&output=csv'
};
