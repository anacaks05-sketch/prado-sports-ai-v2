const PradoAPI = (() => {
  function headers() {
    return {
      'x-apisports-key': PRADO_CONFIG.API_KEY
    };
  }

  function ymd(offset = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  }

  async function apiGet(path) {
    const res = await fetch(`${PRADO_CONFIG.API_BASE_URL}${path}`, {
      headers: headers()
    });

    if (!res.ok) throw new Error(`API erro ${res.status}`);

    const json = await res.json();

    if (json.errors && Object.keys(json.errors).length) {
      console.warn('API errors:', json.errors);
    }

    return json.response || [];
  }

  async function fetchMatches() {
    const cacheKey = 'prado_matches_cache_v1';
    const cacheTimeKey = 'prado_matches_cache_time_v1';
    const cacheMinutes = 10;

    const saved = localStorage.getItem(cacheKey);
    const savedTime = Number(localStorage.getItem(cacheTimeKey) || 0);

    if (saved && Date.now() - savedTime < cacheMinutes * 60 * 1000) {
      console.log('Usando cache local');
      return JSON.parse(saved);
    }

    const all = [];

    try {
      const today = await apiGet(
        `/fixtures?date=${ymd(0)}&timezone=${encodeURIComponent(
          PRADO_CONFIG.TIMEZONE || 'America/Fortaleza'
        )}`
      );

      all.push(...today);
    } catch (e) {
      console.warn('Falha ao buscar jogos de hoje:', e);
    }

    const unique = [];
    const ids = new Set();

    all.forEach(match => {
      const id = match.fixture?.id;
      if (!ids.has(id)) {
        ids.add(id);
        unique.push(match);
      }
    });

    localStorage.setItem(cacheKey, JSON.stringify(unique));
    localStorage.setItem(cacheTimeKey, String(Date.now()));

    return unique;
  }

  return {
    fetchMatches
  };
})();