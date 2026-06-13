# Prado Sports AI ⚽🤖

App de estatísticas de futebol em tempo real (estilo Sofascore/FotMob) com palpites gerados por IA, para Brasileirão, Libertadores, Champions League, Copa do Mundo 2026 e mais — instalável como app no celular (PWA).

## 📁 Estrutura

```
prado/
├── index.html      → estrutura do app
├── style.css       → design (tema escuro "pitch-night", tema claro)
├── data.js         → DADOS (times, ligas, jogos, rankings, notícias, odds, palpites IA)
├── app.js          → lógica do app (navegação, renderização, simulador, IA, PWA)
├── manifest.json   → manifest do PWA
├── sw.js           → service worker (modo offline + notificações push)
└── icons/          → ícones do app (192px, 512px, maskable)
```

## 📱 Como instalar no celular (PWA)

Hospede a pasta inteira em qualquer servidor estático (GitHub Pages, Vercel, Netlify, Cloudflare Pages funcionam de graça) e acesse o link no celular.

**iPhone (Safari):**
1. Abra o link do app no Safari.
2. Toque no ícone de Compartilhar (quadrado com seta).
3. Toque em "Adicionar à Tela de Início".

**Android (Chrome):**
1. Abra o link no Chrome.
2. Toque no menu (⋮) → "Instalar app" ou "Adicionar à tela inicial".
3. Ou aguarde o banner automático de instalação que o app já mostra.

O app funciona offline (cache via `sw.js`) depois da primeira visita.

## 🔌 Como conectar a uma API de futebol real (substituir os dados mockados)

Hoje todos os dados (jogos, times, rankings, notícias, odds, palpites) estão em `data.js`, no formato de objetos/arrays JavaScript estáticos. Para deixar o app 100% real, a ideia é **substituir esses dados estáticos por chamadas fetch() a uma API**, mantendo o mesmo "formato" (mesmas chaves) que `app.js` já espera.

### Opção recomendada: API-Football (via RapidAPI)
- Site: https://www.api-football.com/ (plano grátis: ~100 requisições/dia)
- Cobre: Brasileirão A/B, Libertadores, Sul-Americana, Copa do Brasil, Champions, ligas europeias, Copa do Mundo, ao vivo minuto a minuto, escalações, estatísticas, odds.

**Passo a passo:**
1. Crie conta gratuita no RapidAPI e assine o plano free do "API-Football".
2. Copie sua `X-RapidAPI-Key`.
3. Em `data.js`, crie funções assíncronas que façam `fetch` aos endpoints, por exemplo:

```js
const API_KEY = "SUA_CHAVE_AQUI";
const API_HOST = "api-football-v1.p.rapidapi.com";

async function fetchLiveMatches() {
  const res = await fetch("https://api-football-v1.p.rapidapi.com/v3/fixtures?live=all", {
    headers: {
      "X-RapidAPI-Key": API_KEY,
      "X-RapidAPI-Host": API_HOST
    }
  });
  const json = await res.json();
  return json.response.map(mapFixtureToMatch); // função que converte para o formato MATCHES
}
```

4. Crie uma função `mapFixtureToMatch(fixture)` que converte a resposta da API para o mesmo formato que os objetos dentro de `MATCHES` em `data.js` (mesmos campos: `id`, `league`, `home`, `away`, `status`, `minute`, `score`, `stats`, `events`, `lineups`, etc.).
5. Em `app.js`, troque os lugares que usam `MATCHES` diretamente por uma versão que primeiro tenta `await fetchLiveMatches()` e cai no mock como fallback (bom para desenvolvimento/offline).
6. Repita o processo para:
   - Classificações/rankings → endpoint `/standings` e `/players/topscorers`
   - Odds → endpoint `/odds`
   - Notícias → uma API de notícias separada (ex: NewsAPI, ou RSS de portais esportivos)

### Alternativa gratuita sem RapidAPI: football-data.org
- Site: https://www.football-data.org/ (plano grátis com limite menor de ligas/requisições, mas sem precisar de RapidAPI).
- Bom para começar com Premier League, Champions League, La Liga, Bundesliga, Serie A, Ligue 1, Brasileirão Série A.

### Palpites de IA (Prado IA)
A IA de palpites pode continuar sendo gerada pelo próprio Claude/Anthropic:
- Envie os dados reais do jogo (forma recente, H2H, escalações, odds) para a API da Anthropic (`/v1/messages`) pedindo uma análise estruturada em JSON com: probabilidades, confiança, mercados sugeridos e "motivos" (mesmo formato do array `PREDICTIONS` em `data.js`).
- Assim o app mantém o mesmo card de "Confiança IA" e barras de probabilidade, só que com dados gerados dinamicamente.

## 🔔 Notificações push
O `sw.js` já tem listeners de `push` e `notificationclick` prontos. Para ativá-las de verdade você precisará de:
- Um backend (ex: Firebase Cloud Messaging ou um servidor próprio com Web Push/VAPID) que dispare notificações quando: gol, cartão, escanteio, início/fim de jogo, escalações divulgadas — conforme as preferências salvas em "Configurações → Notificações".
- O app salva as preferências do usuário em `localStorage`; seu backend precisaria armazenar essas preferências + o "subscription" do push por usuário.

## 🚧 O que é mock vs. real hoje
| Recurso | Status |
|---|---|
| Times, ligas, jogos, eventos, escalações | Mock (dados de exemplo) |
| Estatísticas (xG, posse, chutes, mapas de calor/chutes) | Mock (gerado de forma consistente) |
| Rankings (artilheiros, assistências, etc.) | Mock |
| Odds (abertura x atual) | Mock |
| Notícias | Mock |
| Palpites de IA + anel de confiança | Mock (estrutura pronta para receber dados reais) |
| Simulador de apostas / Scanner de valor | Funcional com qualquer odd/probabilidade digitada |
| PWA (instalação, ícone, offline) | Funcional |
| Tema claro/escuro, idioma, favoritos | Funcional (salvo localmente) |
| Notificações push reais | Estrutura pronta, requer backend |
| Apps nativos iOS/Android | Fora do escopo (use o PWA) |

## 🎨 Identidade visual
- Paleta "Pitch Night": fundo `#070B11`, superfícies `#131B26`, verde "confiança" `#21E6A1`, dourado das odds `#FFB23E`, vermelho ao vivo `#FF4757`.
- Tipografia: Space Grotesk (placares/títulos), Inter (texto), JetBrains Mono (dados/odds/cronômetro).
- Elemento de marca: "Anel de Confiança IA" — círculo de progresso mostrando a confiança do palpite.

---
Feito com ⚽ + 🤖 — Prado Sports AI


## Ajuste mobile final (13/06)

- Tela inicial compactada para caber melhor no iPhone.
- Corrigido vazamento lateral/horizontal.
- Adicionado espaço extra para a barra inferior não cobrir jogos.
- Service Worker atualizado para evitar cache antigo após publicar.
