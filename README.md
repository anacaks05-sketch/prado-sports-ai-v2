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

## 🔌 API de futebol real — API-Sports segura na Vercel

Esta versão já vem preparada para usar a **API-Football / API-Sports** sem expor sua chave no `index.html`.

O app chama a rota:

```txt
/api/football
```

Essa rota fica no arquivo:

```txt
api/football.js
```

Ela consulta a API-Sports usando a chave secreta que você coloca na Vercel.

### Como configurar na Vercel

1. Entre no projeto na Vercel.
2. Vá em **Settings → Environment Variables**.
3. Crie esta variável:

```txt
Name: APISPORTS_KEY
Value: cole aqui sua chave da API-Sports
```

4. Clique em **Save**.
5. Faça **Redeploy** do projeto.

Depois disso o app tenta carregar:

- jogos reais por data;
- jogos de hoje;
- próximos dias;
- resultados recentes por data, caso não exista agenda;
- ligas/times que vierem na resposta.

Importante: esta versão evita o parâmetro `next`, porque o plano grátis da API-Football não libera esse parâmetro. A busca é feita por `date=AAAA-MM-DD`, que funciona no plano grátis.

Se a chave não estiver configurada, o app continua abrindo normalmente em modo demo.

### Observação sobre plano grátis

No arquivo `config.js`, deixei:

```js
DAYS_AHEAD: 2
```

Isso mostra hoje + próximos 2 dias e ajuda a economizar requisições durante os testes.

## 🔔 Notificações push
O `sw.js` já tem listeners de `push` e `notificationclick` prontos. Para ativá-las de verdade você precisará de:
- Um backend (ex: Firebase Cloud Messaging ou um servidor próprio com Web Push/VAPID) que dispare notificações quando: gol, cartão, escanteio, início/fim de jogo, escalações divulgadas — conforme as preferências salvas em "Configurações → Notificações".
- O app salva as preferências do usuário em `localStorage`; seu backend precisaria armazenar essas preferências + o "subscription" do push por usuário.

## 🚧 O que é mock vs. real hoje
| Recurso | Status |
|---|---|
| Times, ligas e jogos | Real via API-Sports quando a chave estiver ativa; demo como fallback |
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

## 💎 Prado Premium / Pagamento e código de acesso

O botão **Assinar Premium** já está configurado para abrir o checkout do Mercado Pago:

- Plano: Prado Sports AI Premium
- Preço exibido: R$ 19,90/mês
- Checkout: https://mpago.la/1mg8mFi
- Suporte/liberação manual: WhatsApp +55 98 98235-6674

### Fluxo de venda

Cliente paga no Mercado Pago → envia comprovante pelo WhatsApp → você cria um código Premium na planilha → cliente digita o código no app → Premium libera naquele aparelho.

### Como configurar a lista externa de códigos

1. Crie uma planilha no Google Sheets com estas colunas:

```
Código | Status | Validade
```

2. Exemplo de linhas:

```
PRADO-JOAO-9823 | ativo | 13/07/2026
PRADO-MARIA-4419 | ativo | 13/07/2026
```

3. No Google Sheets, clique em **Arquivo → Compartilhar → Publicar na Web**.
4. Escolha a aba da planilha e o formato **CSV**.
5. Copie o link publicado.
6. Cole esse link no arquivo `config.js`, neste campo:

```js
PREMIUM_CODES_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQAYrBkpkkMXifpT764LcpjUwzh87XfR22QoD_UtFpP3Q47gb2kO5Khj_MYxb-q24XnO7HyCAfTsT86/pub?gid=0&single=true&output=csv'
```

Depois dessa configuração inicial, você publica na Vercel uma única vez. Nas próximas vendas, basta adicionar uma nova linha na planilha. Não precisa publicar na Vercel de novo.

### Status aceitos

O app aceita os seguintes status como liberados:

```
ativo, liberado, pago, ok, sim
```

Para bloquear alguém, altere o status para `inativo`, `bloqueado` ou apague a linha da planilha.

### Atenção

Esse modelo é bom para começar a vender rápido, mas ainda é uma liberação simples no front-end. Para um sistema 100% profissional, o próximo passo é login + banco de dados + webhook do Mercado Pago.

## 🎨 Identidade visual
- Paleta "Pitch Night": fundo `#070B11`, superfícies `#131B26`, verde "confiança" `#21E6A1`, dourado das odds `#FFB23E`, vermelho ao vivo `#FF4757`.
- Tipografia: Space Grotesk (placares/títulos), Inter (texto), JetBrains Mono (dados/odds/cronômetro).
- Elemento de marca: "Anel de Confiança IA" — círculo de progresso mostrando a confiança do palpite.

---
Feito com ⚽ + 🤖 — Prado Sports AI


## Atualização v15 — Home mais rigorosa

- Remove eliminatórias, amistosos, MLS Next Pro e ligas pequenas da tela inicial.
- Mantém esses jogos em Ver todos.
- Corrige nomes parecidos com La Liga/MLS para não aparecerem como principais.
