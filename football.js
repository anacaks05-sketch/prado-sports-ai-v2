const API_BASE_URL = 'https://v3.football.api-sports.io';
const ALLOWED_ENDPOINTS = new Set([
  'fixtures',
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

  const url = `${API_BASE_URL}/${endpoint}${params.toString() ? `?${params.toString()}` : ''}`;

  try{
    const upstream = await fetch(url, {
      method: 'GET',
      headers: { 'x-apisports-key': apiKey }
    });

    const text = await upstream.text();
    let body;
    try{ body = JSON.parse(text); }
    catch{ body = { raw: text }; }

    // Cache curto para economizar requisições sem deixar o app muito atrasado.
    res.setHeader('Cache-Control', 's-maxage=90, stale-while-revalidate=120');

    return res.status(upstream.status).json(body);
  }catch(error){
    return res.status(500).json({
      error: 'Falha ao consultar API-Sports.',
      message: error.message
    });
  }
};
