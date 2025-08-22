# 🚀 Guia de Deploy - Soundboard Discord

## 📋 Pré-requisitos

- Conta no [Discord Developer Portal](https://discord.com/developers/applications)
- Conta no [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) (opcional)
- Conta no [Vercel](https://vercel.com) para a web
- Conta no [Railway](https://railway.app), [Render](https://render.com) ou [Fly.io](https://fly.io) para o bot

## 🤖 Deploy do Bot

### 1. Railway (Recomendado)

1. **Conectar Repositório**
   - Acesse [Railway](https://railway.app)
   - Clique em "New Project" → "Deploy from GitHub repo"
   - Selecione seu repositório
   - Escolha a pasta `/bot`

2. **Configurar Variáveis de Ambiente**
   - Vá em "Variables" → "New Variable"
   - Adicione cada variável do arquivo `env.example`:
   ```
   DISCORD_TOKEN=seu_token_aqui
   SHARED_SECRET=chave_secreta_compartilhada
   PORT=3000
   CORS_ORIGIN=https://seu-site.vercel.app
   SPOTIFY_CLIENT_ID=seu_client_id
   SPOTIFY_CLIENT_SECRET=seu_client_secret
   YOUTUBE_AUDIO_QUALITY=highestaudio
   ```

3. **Deploy**
   - Railway detecta automaticamente que é Node.js
   - Build Command: `npm ci --omit=dev`
   - Start Command: `node index.js`
   - Deploy automático a cada push

### 2. Render

1. **Conectar Repositório**
   - Acesse [Render](https://render.com)
   - Clique em "New" → "Web Service"
   - Conecte seu repositório GitHub
   - Escolha a pasta `/bot`

2. **Configuração**
   - **Name**: `discord-soundboard-bot`
   - **Environment**: `Node`
   - **Build Command**: `npm ci --omit=dev`
   - **Start Command**: `node index.js`
   - **Plan**: Free (ou pago para melhor performance)

3. **Variáveis de Ambiente**
   - Vá em "Environment" → "Add Environment Variable"
   - Adicione as mesmas variáveis do Railway

### 3. Fly.io

1. **Instalar Flyctl**
   ```bash
   # macOS
   brew install flyctl
   
   # Windows
   # Baixe de https://fly.io/docs/hands-on/install-flyctl/
   
   # Linux
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login e Deploy**
   ```bash
   cd bot
   fly auth login
   fly launch
   ```

3. **Configurar Variáveis**
   ```bash
   fly secrets set DISCORD_TOKEN=seu_token
   fly secrets set SHARED_SECRET=sua_chave
   fly secrets set CORS_ORIGIN=https://seu-site.vercel.app
   # ... outras variáveis
   ```

## 🌐 Deploy da Web (Vercel)

### 1. Conectar Repositório

1. Acesse [Vercel](https://vercel.com)
2. Clique em "New Project"
3. Importe seu repositório GitHub
4. Escolha a pasta `/web`

### 2. Configuração

- **Framework Preset**: Next.js (detectado automaticamente)
- **Root Directory**: `web`
- **Build Command**: `npm run build` (padrão)
- **Output Directory**: `.next` (padrão)

### 3. Variáveis de Ambiente

Vá em "Settings" → "Environment Variables" e adicione:

```
BOT_ENDPOINT=https://seu-bot.railway.app
SHARED_SECRET=mesma_chave_secreta_do_bot
NEXT_PUBLIC_APP_NAME=Soundboard Discord
```

### 4. Deploy

- Clique em "Deploy"
- Vercel fará build e deploy automático
- URL será algo como: `https://seu-projeto.vercel.app`

## 🔧 Configuração do Bot Discord

### 1. Criar Aplicação

1. Acesse [Discord Developer Portal](https://discord.com/developers/applications)
2. Clique em "New Application"
3. Dê um nome (ex: "Soundboard Bot")
4. Vá em "Bot" → "Add Bot"

### 2. Configurar Bot

1. **Token**: Copie o token (será seu `DISCORD_TOKEN`)
2. **Intents**: Ative:
   - Server Members Intent
   - Message Content Intent
3. **Privileged Gateway Intents**: Ative todos se necessário

### 3. Convidar para Servidor

1. Vá em "OAuth2" → "URL Generator"
2. **Scopes**: Selecione `bot` e `applications.commands`
3. **Bot Permissions**: Selecione:
   - Connect
   - Speak
   - Use Voice Activity
   - View Channels
4. Use a URL gerada para convidar o bot

### 4. Obter IDs

1. **Developer Mode**: Discord → Configurações → Avançado → Developer Mode
2. **Guild ID**: Clique direito no servidor → "Copiar ID"
3. **Voice Channel ID**: Clique direito no canal de voz → "Copiar ID"

## 🎵 Configuração Spotify (Opcional)

### 1. Criar App

1. Acesse [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Clique em "Create App"
3. Preencha nome e descrição
4. Copie `Client ID` e `Client Secret`

### 2. Configurar

- Adicione as credenciais no `.env` do bot
- **Nota**: Usamos Client Credentials Flow (apenas metadados)

## 🔐 Segurança

### 1. SHARED_SECRET

- Gere uma chave aleatória forte
- Use a **mesma chave** no bot e na web
- **NUNCA** exponha no client-side

### 2. CORS

- Configure `CORS_ORIGIN` no bot para o domínio da web
- Exemplo: `https://seu-site.vercel.app`

## 📱 Testando

### 1. Verificar Bot

- Bot deve aparecer online no Discord
- Endpoint `/health` deve retornar `{ ok: true }`

### 2. Testar Conexão

1. Configure Guild ID e Voice Channel ID na web
2. Clique em "Test Connection"
3. Bot deve entrar no canal de voz

### 3. Testar Sons

1. Use botões da biblioteca
2. Teste "Link Rápido" com diferentes tipos:
   - MP3 direto
   - YouTube
   - Spotify

## 🐛 Troubleshooting

### Bot não conecta
- Verifique `DISCORD_TOKEN`
- Confirme permissões do bot
- Verifique se está no servidor

### Erro CORS
- Confirme `CORS_ORIGIN` no bot
- Verifique domínio da web

### Spotify falha
- Configure credenciais ou use apenas YouTube
- Verifique se o track tem preview

### YouTube falha
- Ajuste `YOUTUBE_AUDIO_QUALITY`
- Verifique se o vídeo é acessível

## 📊 Monitoramento

### Logs do Bot
- Railway/Render: Logs automáticos
- Fly.io: `fly logs`

### Status da Web
- Vercel: Dashboard com métricas
- Health check: `/api/play` endpoint

## 🔄 Atualizações

### Bot
- Push para `main` = deploy automático
- Railway/Render: Sem configuração adicional

### Web
- Push para `main` = deploy automático
- Vercel: Sem configuração adicional

## 💰 Custos

### Free Tier
- **Railway**: $5/mês após uso gratuito
- **Render**: 750h/mês gratuitas
- **Fly.io**: 3 VMs gratuitas
- **Vercel**: 100GB bandwidth/mês

### Recomendação
- **Desenvolvimento**: Free tiers suficientes
- **Produção**: Considere planos pagos para melhor performance
