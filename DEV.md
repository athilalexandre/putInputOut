# 🔧 Desenvolvimento Local - Soundboard Discord

## 📋 Pré-requisitos

- **Node.js 18+** instalado
- **Git** para clonar o repositório
- **Discord Bot** configurado (ver README.md)
- **ffmpeg** instalado (para conversão de áudio)

## 🚀 Configuração Inicial

### 1. Clonar Repositório

```bash
git clone <seu-repositorio>
cd putInputOut
```

### 2. Instalar Dependências

#### Bot
```bash
cd bot
npm install
```

#### Web
```bash
cd web
npm install
```

## 🔧 Configuração de Ambiente

### 1. Bot (.env)

Crie um arquivo `.env` na pasta `bot/`:

```bash
cd bot
cp env.example .env
```

Edite o `.env` com suas credenciais:

```env
DISCORD_TOKEN=seu_token_aqui
SHARED_SECRET=chave_secreta_compartilhada
PORT=3000
CORS_ORIGIN=http://localhost:3000

# Spotify (opcional)
SPOTIFY_CLIENT_ID=seu_client_id
SPOTIFY_CLIENT_SECRET=seu_client_secret

# YouTube (opcional)
YOUTUBE_AUDIO_QUALITY=highestaudio
```

### 2. Web (.env.local)

Crie um arquivo `.env.local` na pasta `web/`:

```bash
cd web
cp env.local.example .env.local
```

Edite o `.env.local`:

```env
BOT_ENDPOINT=http://localhost:3000
SHARED_SECRET=mesma_chave_secreta_do_bot
NEXT_PUBLIC_APP_NAME=Soundboard Discord
```

## 🏃‍♂️ Executando Localmente

### 1. Iniciar Bot

```bash
cd bot
npm run dev
```

**Saída esperada:**
```
🤖 Bot SeuBot#1234 está online!
🚀 Servidor Express iniciado na porta 3000
📡 Servidor Express rodando na porta 3000
```

### 2. Iniciar Web (em outro terminal)

```bash
cd web
npm run dev
```

**Saída esperada:**
```
- ready started server on 0.0.0.0:3001, url: http://localhost:3001
```

### 3. Acessar Aplicação

- **Web**: http://localhost:3001
- **Bot API**: http://localhost:3000

## 🧪 Testando

### 1. Health Check

```bash
curl http://localhost:3000/health
```

**Resposta esperada:**
```json
{"ok": true, "timestamp": "2024-01-01T12:00:00.000Z"}
```

### 2. Testar Conexão Discord

1. Abra http://localhost:3001
2. Configure Guild ID e Voice Channel ID
3. Clique em "Test Connection"
4. Bot deve entrar no canal de voz

### 3. Testar Sons

1. Use botões da biblioteca
2. Teste "Link Rápido" com diferentes tipos:
   - **MP3 direto**: `https://exemplo.com/som.mp3`
   - **YouTube**: `https://youtube.com/watch?v=...`
   - **Spotify**: `https://open.spotify.com/track/...`

## 🔍 Debug e Logs

### 1. Logs do Bot

O bot registra todas as operações no console:

```
🎵 Processando YouTube: https://youtube.com/watch?v=...
✅ Reproduzindo áudio - Fonte: YT, Volume: 1
🎵 Áudio finalizado - Fonte: YT
```

### 2. Logs da Web

- Console do navegador (F12)
- Network tab para ver requisições à API

### 3. Verificar Status

- **Bot**: Console do terminal
- **Web**: Interface com indicadores visuais
- **Discord**: Bot deve aparecer online

## 🐛 Troubleshooting Local

### Bot não inicia

**Erro**: `Cannot find module 'ffmpeg-static'`
```bash
cd bot
npm install
```

**Erro**: `DISCORD_TOKEN is required`
- Verifique se o arquivo `.env` existe
- Confirme se `DISCORD_TOKEN` está definido

**Erro**: `Invalid token`
- Verifique se o token do Discord está correto
- Confirme se o bot foi criado no Developer Portal

### Web não inicia

**Erro**: `Port 3001 is already in use`
```bash
# Encerre o processo na porta 3001
lsof -ti:3001 | xargs kill -9
```

**Erro**: `Module not found`
```bash
cd web
npm install
```

### Bot não conecta ao Discord

1. **Verificar Token**: Confirme se `DISCORD_TOKEN` está correto
2. **Verificar Intents**: Ative os intents necessários no Developer Portal
3. **Verificar Permissões**: Confirme se o bot tem permissão para entrar no servidor
4. **Verificar Status**: Bot deve aparecer online no Discord

### Erro CORS

**Erro**: `CORS policy: No 'Access-Control-Allow-Origin' header`

1. Verifique se `CORS_ORIGIN` no bot está configurado para `http://localhost:3001`
2. Confirme se o bot está rodando na porta 3000
3. Verifique se a web está rodando na porta 3001

## 🔧 Desenvolvimento

### 1. Estrutura de Arquivos

```
bot/
├── index.js          # Servidor principal
├── package.json      # Dependências
├── .env             # Variáveis de ambiente
└── .eslintrc.json   # Configuração ESLint

web/
├── app/             # Next.js App Router
├── components/      # Componentes React
├── sounds.json      # Biblioteca de sons
├── package.json     # Dependências
└── .env.local       # Variáveis de ambiente
```

### 2. Scripts Disponíveis

#### Bot
```bash
npm run dev      # Desenvolvimento com nodemon
npm run start    # Produção
npm run lint     # Verificação de código
```

#### Web
```bash
npm run dev      # Desenvolvimento
npm run build    # Build de produção
npm run start    # Produção
npm run lint     # Verificação de código
```

### 3. Hot Reload

- **Bot**: `nodemon` reinicia automaticamente
- **Web**: Next.js tem hot reload nativo

## 📝 Adicionando Novos Sons

### 1. Editar `sounds.json`

```json
{
  "name": "Nome do Som",
  "url": "https://exemplo.com/som.mp3"
}
```

### 2. Tipos Suportados

- **Áudio direto**: `.mp3`, `.ogg`, `.wav`
- **YouTube**: `youtube.com` ou `youtu.be`
- **Spotify**: `open.spotify.com/track/...`

### 3. Testar

1. Adicione o som ao `sounds.json`
2. Recarregue a página web
3. Clique no botão do som
4. Verifique logs do bot

## 🔒 Segurança Local

### 1. SHARED_SECRET

- Use uma chave forte e única
- **NUNCA** commite no Git
- Use a mesma chave no bot e na web

### 2. Variáveis de Ambiente

- Mantenha `.env` e `.env.local` no `.gitignore`
- Use `env.example` para documentar variáveis necessárias

### 3. CORS

- Configure apenas para `http://localhost:3001` em desenvolvimento
- Em produção, configure para o domínio real

## 🚀 Preparando para Deploy

### 1. Testar Localmente

- ✅ Bot conecta ao Discord
- ✅ Web se comunica com bot
- ✅ Sons tocam corretamente
- ✅ Links rápidos funcionam
- ✅ Spotify fallback funciona

### 2. Build de Produção

#### Bot
```bash
cd bot
npm run build  # Se necessário
```

#### Web
```bash
cd web
npm run build
```

### 3. Verificar Arquivos

- ✅ `.env` configurado
- ✅ `package.json` com scripts corretos
- ✅ `Dockerfile` (se usar Docker)
- ✅ `.gitignore` configurado

## 📚 Recursos Úteis

### Documentação
- [Discord.js](https://discord.js.org/)
- [Next.js](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Ferramentas
- [Discord Developer Portal](https://discord.com/developers/applications)
- [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)

### Comunidade
- [Discord.js Discord](https://discord.gg/djs)
- [Next.js Discord](https://discord.gg/nextjs)
