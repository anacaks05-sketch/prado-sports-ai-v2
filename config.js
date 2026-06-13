/* =====================================================
   PRADO SPORTS AI — Configuração segura

   API-Football / API-Sports:
   - NÃO coloque a chave da API neste arquivo.
   - A chave fica na Vercel em Environment Variables:
     APISPORTS_KEY = sua chave da API-Sports
   - O app chama /api/football e a função da Vercel conversa com a API.
===================================================== */

const PRADO_CONFIG = {
  PROVIDER: 'api-sports-secure',

  // Rota segura da Vercel. Ela usa a variável APISPORTS_KEY.
  API_PROXY_URL: '/api/football',

  // Quantos dias mostrar no app: hoje + próximos dias.
  // Plano grátis: busca por data (hoje + próximos dias) para não usar o parâmetro next.
  DAYS_AHEAD: 2,

  // Timezone do Brasil
  TIMEZONE: 'America/Sao_Paulo',

  /* =====================================================
     Códigos Premium externos

     Planilha publicada em CSV.
     Agora você só adiciona códigos na planilha e NÃO precisa
     publicar na Vercel toda vez que vender.

     Colunas recomendadas:
     Código | Status | Validade

     Status aceitos: ativo, liberado, pago, ok, sim
     Validade: use DD/MM/AAAA, exemplo 13/07/2026
  ===================================================== */
  PREMIUM_CODES_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQAYrBkpkkMXifpT764LcpjUwzh87XfR22QoD_UtFpP3Q47gb2kO5Khj_MYxb-q24XnO7HyCAfTsT86/pub?gid=0&single=true&output=csv'
};
