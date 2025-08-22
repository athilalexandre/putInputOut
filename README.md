# Soundboard Discord

Um soundboard completo para Discord com interface web moderna e bot inteligente que suporta áudio direto, YouTube e Spotify.

## 🚀 Funcionalidades

- **Interface Web**: Next.js 14 com Tailwind CSS e TypeScript
- **Bot Discord**: Node.js com discord.js v14 e suporte a voz
- **Múltiplas Fontes**: 
  - Áudio direto (mp3/ogg/wav)
  - YouTube (stream direto)
  - Spotify (preview + fallback para YouTube)
- **Controles**: Volume, seleção de canal de voz, busca de sons
- **Link Rápido**: Cole qualquer link suportado e toque instantaneamente

## 📁 Estrutura do Projeto

```
putInputOut/
├── web/                 # Interface Next.js
│   ├── app/            # App Router
│   ├── components/     # Componentes React
│   ├── sounds.json     # Biblioteca de sons
│   └── package.json    # Dependências web
├── bot/                # Bot Discord
│   ├── index.js        # Servidor Express + Bot
│   ├── package.json    # Dependências bot
│   └── Dockerfile      # Container Docker
└── README.md           # Este arquivo
```

## 🛠️ Configuração

### 1. Bot Discord

#### Criar Aplicação Discord
1. Acesse [Discord Developer Portal](https://discord.com/developers/applications)
2. Clique em "New Application"
3. Vá em "Bot" → "Add Bot"
4. Copie o **Token** (será seu `DISCORD_TOKEN`)
5. Em "Privileged Gateway Intents", ative:
   - Server Members Intent
   - Message Content Intent

#### Configurar Bot no Servidor
1. Vá em "OAuth2" → "URL Generator"
2. Selecione escopos: `bot`, `applications.commands`
3. Selecione permissões: `Connect`, `Speak`, `Use Voice Activity`
4. Use a URL gerada para convidar o bot
5. **Importante**: O bot precisa estar no servidor antes de usar

#### Obter IDs do Servidor
1. Ative "Developer Mode" no Discord (Configurações → Avançado)
2. Clique com botão direito no servidor → "Copiar ID" (Guild ID)
3. Clique com botão direito no canal de voz → "Copiar ID" (Voice Channel ID)

### 2. Credenciais Spotify (Opcional, mas Recomendado)

#### Criar App Spotify
1. Acesse [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Clique em "Create App"
3. Preencha nome e descrição
4. Copie `Client ID` e `Client Secret`
5. **Nota**: Usamos Client Credentials Flow (apenas metadados, sem login de usuário)

### 3. Variáveis de Ambiente

#### Bot (.env)
```bash
DISCORD_TOKEN=seu_token_aqui
SHARED_SECRET=chave_secreta_compartilhada
PORT=3000
CORS_ORIGIN=https://seu-site.vercel.app

# Spotify (opcional)
SPOTIFY_CLIENT_ID=seu_client_id
SPOTIFY_CLIENT_SECRET=seu_client_secret

# YouTube (opcional)
YOUTUBE_AUDIO_QUALITY=highestaudio
```

#### Web (.env.local)
```bash
BOT_ENDPOINT=https://seu-bot.railway.app
SHARED_SECRET=mesma_chave_secreta_do_bot
NEXT_PUBLIC_APP_NAME=Soundboard Discord
```

## 🚀 Deploy

### Bot (Railway/Render/Fly.io)

#### Railway (Recomendado)
1. Conecte seu repositório GitHub
2. Configure as variáveis de ambiente
3. Deploy automático a cada push

#### Render
1. Conecte repositório GitHub
2. Build Command: `npm ci --omit=dev`
3. Start Command: `node index.js`
4. Configure variáveis de ambiente

#### Fly.io
1. Instale `flyctl`
2. `fly launch`
3. Configure `fly.toml` e variáveis

### Web (Vercel)
1. Conecte repositório GitHub
2. Framework: Next.js
3. Configure variáveis de ambiente
4. Deploy automático

## 🎵 Como Usar

### Interface Web
1. Configure `Guild ID` e `Voice Channel ID`
2. Ajuste volume (0-1)
3. Clique em "Test Connection" para verificar
4. Use botões de sons pré-definidos ou cole links no "Link Rápido"

### Tipos de Links Suportados
- **Áudio Direto**: `https://exemplo.com/som.mp3`
- **YouTube**: `https://youtube.com/watch?v=...` ou `https://youtu.be/...`
- **Spotify**: `https://open.spotify.com/track/...`

### Funcionamento Spotify
- Se o track tem `preview_url` → toca preview de 30s
- Se não tem preview → busca equivalente no YouTube automaticamente
- Mensagem: "Sem preview no Spotify — reproduzindo equivalente do YouTube"

## 🔧 Desenvolvimento

### Bot
```bash
cd bot
npm install
npm run dev
```

### Web
```bash
cd web
npm install
npm run dev
```

### Scripts Disponíveis
- `npm run dev` - Desenvolvimento
- `npm run build` - Build de produção
- `npm run start` - Produção
- `npm run lint` - Verificação de código

## 📝 Logs e Debug

O bot registra a origem de cada stream:
- `DIRECT` - Áudio direto
- `YT` - YouTube
- `SPOTIFY_PREVIEW` - Preview do Spotify
- `SPOTIFY_FALLBACK_YT` - Spotify → YouTube (fallback)

## ⚠️ Restrições e Boas Práticas

### Direitos Autorais
- Respeite ToS de cada plataforma
- Use apenas conteúdo que você tem permissão para reproduzir
- Não armazene mídia localmente

### Limitações Técnicas
- **Spotify**: Sem credenciais → apenas fallback YouTube
- **YouTube**: Lives longas podem ter latência
- **Qualidade**: Ajuste `YOUTUBE_AUDIO_QUALITY` conforme necessário

### Erros Comuns
- **CORS bloqueado**: Verifique `CORS_ORIGIN` no bot
- **Bot não conecta**: Verifique permissões e se está no servidor
- **Spotify sem preview**: Sistema faz fallback automático para YouTube
- **YouTube sem resultados**: Verifique se o link é válido

## 🆘 Suporte

### Verificar Status
- Bot: `GET /health` retorna `{ ok: true }`
- Web: Interface mostra status de conexão
- Logs: Console do bot mostra detalhes de cada operação

### Troubleshooting
1. **Bot não responde**: Verifique `DISCORD_TOKEN` e permissões
2. **Erro CORS**: Confirme `CORS_ORIGIN` no bot
3. **Áudio não toca**: Verifique IDs do servidor e canal
4. **Spotify falha**: Configure credenciais ou use apenas YouTube

## 📄 Licença

Este projeto é para uso educacional e pessoal. Respeite os termos de serviço das plataformas utilizadas.