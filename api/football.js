const API_BASE_URL = 'https://v3.football.api-sports.io';
const ALLOWED_ENDPOINTS = new Set([
  'fixtures',
  'fixtures/statistics',
  'fixtures/events',
  'fixtures/lineups',
  'leagues',
  'standings',
  'teams',
  'odds',
  'status'
]);

function setCors(res){
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function ymd(offset=0, timezone='America/Sao_Paulo'){
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(d).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function parseYmd(dateString){
  const match = String(dateString || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!match) return null;
  return new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00Z`);
}

function formatYmdFromDate(date, timezone='America/Sao_Paulo'){
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

async function fetchApi(endpoint, params, apiKey){
  const url = `${API_BASE_URL}/${endpoint}${params.toString() ? `?${params.toString()}` : ''}`;
  const upstream = await fetch(url, {
    method: 'GET',
    headers: { 'x-apisports-key': apiKey }
  });

  const text = await upstream.text();
  let body;
  try{ body = JSON.parse(text); }
  catch{ body = { raw: text }; }

  return { status: upstream.status, body };
}

function mergeResponses(responses){
  const map = new Map();
  let firstBody = null;
  for(const body of responses){
    if(!firstBody) firstBody = body;
    const items = Array.isArray(body?.response) ? body.response : [];
    items.forEach(item => {
      const id = item?.fixture?.id || JSON.stringify(item).slice(0,80);
      map.set(String(id), item);
    });
  }
  return {
    get: 'fixtures',
    parameters: { mode: 'free-date-compat' },
    errors: [],
    results: map.size,
    paging: { current: 1, total: 1 },
    response: [...map.values()],
    account: firstBody?.account,
    requests: firstBody?.requests
  };
}

module.exports = async function handler(req, res){
  setCors(res);

  if(req.method === 'OPTIONS'){
    return res.status(204).end();
  }

  if(req.method !== 'GET'){
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.APISPORTS_KEY || process.env.API_FOOTBALL_KEY;
  if(!apiKey){
    return res.status(500).json({
      error: 'APISPORTS_KEY não configurada na Vercel.',
      message: 'Crie a variável APISPORTS_KEY em Settings > Environment Variables e faça redeploy.'
    });
  }

  const endpoint = String(req.query.endpoint || 'fixtures').replace(/^\/+|\/+$/g, '');
  if(!ALLOWED_ENDPOINTS.has(endpoint)){
    return res.status(400).json({ error: 'Endpoint não permitido.' });
  }

  const params = new URLSearchParams();
  for(const [key, value] of Object.entries(req.query)){
    if(key === 'endpoint') continue;
    if(Array.isArray(value)){
      value.forEach(v => params.append(key, String(v)));
    } else if(value !== undefined && value !== null && value !== ''){
      params.set(key, String(value));
    }
  }

  try{
    // Compatibilidade com o plano grátis: se alguém chamar fixtures?next=5,
    // trocamos internamente por buscas por data, porque o Free não aceita `next`.
    if(endpoint === 'fixtures' && params.has('next')){
      const timezone = params.get('timezone') || 'America/Sao_Paulo';
      const days = Math.max(1, Math.min(7, Number(params.get('next') || 1)));
      params.delete('next');
      const responses = [];
      for(let i=0; i<days; i++){
        const dayParams = new URLSearchParams(params);
        dayParams.set('date', ymd(i, timezone));
        const result = await fetchApi(endpoint, dayParams, apiKey);
        if(result.status >= 400) return res.status(result.status).json(result.body);
        responses.push(result.body);
      }
      res.setHeader('Cache-Control', 's-maxage=90, stale-while-revalidate=120');
      return res.status(200).json(mergeResponses(responses));
    }

    // Compatibilidade extra: se usar from/to e o plano reclamar, preferimos datas separadas.
    if(endpoint === 'fixtures' && params.has('from') && params.has('to')){
      const timezone = params.get('timezone') || 'America/Sao_Paulo';
      const fromDate = parseYmd(params.get('from'));
      const toDate = parseYmd(params.get('to'));
      if(fromDate && toDate){
        const responses = [];
        const cursor = new Date(fromDate);
        let count = 0;
        while(cursor <= toDate && count < 7){
          const dayParams = new URLSearchParams(params);
          dayParams.delete('from');
          dayParams.delete('to');
          dayParams.set('date', formatYmdFromDate(cursor, timezone));
          const result = await fetchApi(endpoint, dayParams, apiKey);
          if(result.status >= 400) return res.status(result.status).json(result.body);
          responses.push(result.body);
          cursor.setUTCDate(cursor.getUTCDate() + 1);
          count += 1;
        }
        res.setHeader('Cache-Control', 's-maxage=90, stale-while-revalidate=120');
        return res.status(200).json(mergeResponses(responses));
      }
    }

    // Compatibilidade extra: se usar last, busca datas anteriores.
    if(endpoint === 'fixtures' && params.has('last')){
      const timezone = params.get('timezone') || 'America/Sao_Paulo';
      const days = Math.max(1, Math.min(7, Number(params.get('last') || 1)));
      params.delete('last');
      const responses = [];
      for(let i=1; i<=days; i++){
        const dayParams = new URLSearchParams(params);
        dayParams.set('date', ymd(-i, timezone));
        const result = await fetchApi(endpoint, dayParams, apiKey);
        if(result.status >= 400) return res.status(result.status).json(result.body);
        responses.push(result.body);
      }
      res.setHeader('Cache-Control', 's-maxage=90, stale-while-revalidate=120');
      return res.status(200).json(mergeResponses(responses));
    }

    const result = await fetchApi(endpoint, params, apiKey);

    // Cache curto para economizar requisições sem deixar o app muito atrasado.
    res.setHeader('Cache-Control', 's-maxage=90, stale-while-revalidate=120');

    return res.status(result.status).json(result.body);
  }catch(error){
    return res.status(500).json({
      error: 'Falha ao consultar API-Sports.',
      message: error.message
    });
  }
};
