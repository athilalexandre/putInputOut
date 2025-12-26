# 🎵 PutIn PutOut - Premium Meme Soundboard

<div align="center">

![Discord.js](https://img.shields.io/badge/Discord.js-v14.25-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-14.0-000000?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

**O bot de soundboard mais chique e premium do Discord. Feito para momentos caóticos.** 🎉

[Funcionalidades](#-funcionalidades) •
[Instalação](#-instalação) •
[Como Usar](#-como-usar) •
[API Reference](#-api-reference) •
[Tecnologias](#-stack-tecnológica)

</div>

---

## 📖 Índice

- [✨ Funcionalidades](#-funcionalidades)
- [🛠️ Stack Tecnológica](#️-stack-tecnológica)
- [📦 Instalação](#-instalação)
- [🚀 Como Usar](#-como-usar)
- [📡 API Reference](#-api-reference)
- [🔊 Fontes de Áudio Suportadas](#-fontes-de-áudio-suportadas)
- [🎨 Interface Web](#-interface-web)
- [📁 Estrutura do Projeto](#-estrutura-do-projeto)
- [⚙️ Configuração](#️-configuração)
- [🤝 Contribuição](#-contribuição)
- [📝 Licença](#-licença)

---

## ✨ Funcionalidades

### 🎯 Core Features

| Feature | Descrição |
|---------|-----------|
| 🎛️ **Soundboard Visual Web** | Interface moderna e responsiva para controle total via browser |
| 🔊 **Player de Áudio em Tempo Real** | Visualizador de áudio estilo kaleidoscópio com animações dinâmicas |
| 🎵 **Multi-source Playback** | Suporte a YouTube, Spotify, MyInstants e arquivos locais |
| 📤 **Upload de Sons** | Envie seus próprios arquivos MP3/WAV/OGG/M4A (até 15MB) |
| ✏️ **Gerenciamento Completo** | Renomeie e delete sons diretamente pela interface |
| 🔐 **Autenticação Discord** | Login seguro via OAuth2 com NextAuth.js |
| 🔄 **Controles em Tempo Real** | Play, Pause, Stop e controle de volume instantâneos |
| 🌐 **Acesso Remoto** | Suporte a Ngrok para acesso de qualquer lugar |

### 🎮 Controles do Player

- ▶️ **Play/Resume** - Inicia ou retoma a reprodução
- ⏸️ **Pause** - Pausa o áudio atual
- ⏹️ **Stop** - Para completamente a reprodução
- 🔊 **Volume** - Controle de 0% a 100% em tempo real
- 🔗 **Quick Link** - Cole e toque qualquer URL instantaneamente

### 📊 Visualizador de Áudio

- 🌈 Animação kaleidoscópica estilo Windows Media Player clássico
- 📈 Barras de frequência dinâmicas
- ⏱️ Timer de reprodução em tempo real
- 🎵 Exibição do nome da faixa atual
- 🔄 Atualização automática do status do player

---

## 🛠️ Stack Tecnológica

### Backend (Bot)

| Tecnologia | Versão | Descrição |
|------------|--------|-----------|
| **Node.js** | 18+ | Runtime JavaScript |
| **Discord.js** | 14.25 | API do Discord |
| **@discordjs/voice** | 0.19 | Conexão de voz e áudio |
| **Express** | 4.18 | Servidor HTTP REST |
| **FFmpeg** | static | Processamento de áudio |
| **play-dl** | 1.9 | Streaming YouTube |
| **@distube/ytdl-core** | 4.16 | Download YouTube |
| **yt-dlp** | latest | Fallback para streaming |
| **Multer** | 2.0 | Upload de arquivos |
| **OpusScript** | 0.0.8 | Encoding Opus |
| **libsodium** | 0.7 | Criptografia |

### Frontend (Web)

| Tecnologia | Versão | Descrição |
|------------|--------|-----------|
| **Next.js** | 14.0 | Framework React |
| **React** | 18.2 | Biblioteca UI |
| **TypeScript** | 5.3 | Type Safety |
| **TailwindCSS** | 3.4 | Estilização |
| **NextAuth.js** | 4.24 | Autenticação OAuth |

---

## 📦 Instalação

### Pré-requisitos

- ✅ **Node.js 18+** instalado
- ✅ **NPM** ou **Yarn**
- ✅ **FFmpeg** (incluso via ffmpeg-static)
- ✅ Conta no **Discord Developer Portal**
- ✅ (Opcional) **yt-dlp.exe** na pasta `/bot` para suporte completo

### Passo a Passo

#### 1. Clone o Repositório

```bash
git clone https://github.com/seu-usuario/putinputout.git
cd putinputout
```

#### 2. Configure o Backend (Bot)

```bash
cd bot
npm install
```

Crie o arquivo `.env` baseado no `env.example`:

```env
# Discord
DISCORD_TOKEN=seu_token_aqui

# Server
PORT=3001
```

#### 3. Configure o Frontend (Web)

```bash
cd ../web
npm install
```

Crie o arquivo `.env.local` baseado no `env.local.example`:

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=gere-um-secret-seguro

# Discord OAuth
DISCORD_CLIENT_ID=seu_client_id
DISCORD_CLIENT_SECRET=seu_client_secret

# Bot API
NEXT_PUBLIC_BOT_ENDPOINT=http://localhost:3001
```

#### 4. (Opcional) Download do yt-dlp

Para suporte completo a YouTube e Spotify, baixe o [yt-dlp](https://github.com/yt-dlp/yt-dlp/releases) e coloque o executável na pasta `/bot`.

---

## 🚀 Como Usar

### Iniciando os Serviços

Você precisará de **3 terminais** abertos:

#### Terminal 1 - Bot (Backend)
```bash
cd bot
npm run dev
```
✅ **Sucesso:** `🔊 SERVER AUDIO ONLINE NA PORTA 3001`

#### Terminal 2 - Web (Frontend)
```bash
cd web
npm run dev
```
✅ **Sucesso:** Site acessível em `http://localhost:3000`

#### Terminal 3 - Ngrok (Opcional - Acesso Externo)
```bash
ngrok http 3001
```
📋 Copie o link `https://xxxx.ngrok-free.app` gerado

### Configurando no Discord

1. **Ative o Modo Desenvolvedor** no Discord:
   - Configurações → Avançado → Modo Desenvolvedor ✅

2. **Copie o Server ID:**
   - Clique direito no ícone do servidor → Copiar ID do Servidor

3. **Copie o Channel ID:**
   - Clique direito no canal de voz → Copiar ID do Canal

4. **No site:**
   - Cole as IDs nos campos correspondentes
   - Clique em "Testar Conexão"
   - Se o indicador ficar **verde**, está tudo pronto! 🎉

### Tocando Sons

| Método | Como fazer |
|--------|------------|
| **Biblioteca** | Clique em qualquer card na lista de sons |
| **Link Rápido** | Cole uma URL e clique em "Tocar Agora" |
| **Upload** | Clique em "+ Upload Sound" e selecione um arquivo |

### Gerenciando Sons

| Ação | Como fazer |
|------|------------|
| **Renomear** | Hover no card → Clique no ✏️ |
| **Deletar** | Hover no card → Clique no 🗑️ → Digite a senha admin |

---

## 📡 API Reference

### Endpoints Disponíveis

#### Health Check
```http
GET /health
```
**Response:**
```json
{ "status": "ok", "v": "8.0" }
```

---

#### Listar Sons
```http
GET /api/sounds
```
**Response:**
```json
[
  { "name": "Som 1", "url": "/path/to/file.mp3" },
  { "name": "Som 2", "url": "https://example.com/audio.mp3" }
]
```

---

#### Tocar Áudio
```http
POST /play
Content-Type: application/json
```
**Body:**
```json
{
  "guildId": "123456789",
  "voiceChannelId": "987654321",
  "soundUrl": "https://youtube.com/watch?v=xxx",
  "volume": 0.8
}
```
**Response:**
```json
{ "success": true, "trackName": "YouTube" }
```

---

#### Pausar Áudio
```http
POST /pause
Content-Type: application/json
```
**Body:**
```json
{ "guildId": "123456789" }
```
**Response:**
```json
{ "success": true, "status": "paused" }
```

---

#### Retomar Áudio
```http
POST /resume
Content-Type: application/json
```
**Body:**
```json
{ "guildId": "123456789" }
```
**Response:**
```json
{ "success": true, "status": "playing" }
```

---

#### Parar Áudio
```http
POST /stop
Content-Type: application/json
```
**Body:**
```json
{ "guildId": "123456789" }
```
**Response:**
```json
{ "success": true, "status": "stopped" }
```

---

#### Alterar Volume
```http
POST /volume
Content-Type: application/json
```
**Body:**
```json
{
  "guildId": "123456789",
  "volume": 0.5
}
```
**Response:**
```json
{ "success": true, "volume": 0.5 }
```

---

#### Status do Player
```http
GET /status/:guildId
```
**Response:**
```json
{
  "status": "playing",
  "trackName": "Nome da Faixa",
  "startedAt": 1703619600000,
  "source": "youtube"
}
```

---

#### Upload de Som
```http
POST /api/sounds/upload
Content-Type: multipart/form-data
```
**FormData:**
- `audio`: Arquivo de áudio (MP3, WAV, OGG, M4A - máx 15MB)
- `name`: Nome do som

**Response:**
```json
{ "success": true }
```

---

#### Renomear Som
```http
POST /api/sounds/update
Content-Type: application/json
```
**Body:**
```json
{
  "url": "/path/to/sound.mp3",
  "newName": "Novo Nome"
}
```
**Response:**
```json
{ "success": true, "sound": { "name": "Novo Nome", "url": "..." } }
```

---

#### Deletar Som
```http
POST /api/sounds/delete
Content-Type: application/json
```
**Body:**
```json
{
  "url": "/path/to/sound.mp3",
  "password": "senha_admin"
}
```
**Response:**
```json
{ "success": true }
```

---

## 🔊 Fontes de Áudio Suportadas

| Fonte | Status | Descrição |
|-------|--------|-----------|
| 📂 **Arquivos Locais** | ✅ Full | MP3, WAV, OGG, M4A |
| 🔴 **YouTube** | ✅ Full | Vídeos e Músicas via yt-dlp |
| 🟢 **Spotify** | ✅ Full | Tracks via yt-dlp (busca no YouTube) |
| 🟣 **MyInstants** | ✅ Full | Extração automática do MP3 |
| 🌐 **Links Diretos** | ✅ Full | Qualquer URL de áudio válida |

### Como o Bot Processa Cada Fonte

```
📂 Arquivo Local → FFmpeg → PCM s16le → Discord Voice
🔴 YouTube → yt-dlp → FFmpeg → PCM s16le → Discord Voice
🟢 Spotify → yt-dlp (search) → FFmpeg → PCM s16le → Discord Voice
🟣 MyInstants → Scraper → Direct Stream → Discord Voice
🌐 Direct URL → FFmpeg (interno) → Discord Voice
```

---

## 🎨 Interface Web

### Componentes Principais

#### 🎵 AudioVisualizer
Visualizador de áudio dinâmico estilo kaleidoscópio com:
- Canvas HTML5 com animações suaves
- Barras de frequência coloridas
- Gradientes dinâmicos baseados no tempo
- Informações da faixa em tempo real
- Timer de reprodução

#### 🔐 PermissionChecker
Verificador de permissões que valida:
- Conexão com o bot
- Permissões do usuário no servidor
- Status da conexão de voz

### Temas e Cores

A interface usa o sistema de cores do Discord:
- **Background:** `#1e1f22` (discord-darker)
- **Cards:** `#2b2d31` (discord-dark)
- **Accent:** `#5865F2` (discord-blurple)
- **Success:** `#57F287` (discord-green)
- **Danger:** `#ED4245` (discord-red)
- **Pink:** `#EB459E` (discord-fuchsia)

---

## 📁 Estrutura do Projeto

```
putinputout/
├── 📂 bot/                      # Backend Node.js
│   ├── index.js                 # Servidor principal (Express + Discord.js)
│   ├── package.json             # Dependências do bot
│   ├── .env                     # Variáveis de ambiente (não commitado)
│   ├── env.example              # Exemplo de configuração
│   ├── sounds/                  # Pasta de uploads de áudio
│   └── yt-dlp.exe              # Binário do yt-dlp (opcional)
│
├── 📂 web/                      # Frontend Next.js
│   ├── app/                     # App Router do Next.js 14
│   │   ├── page.tsx             # Página principal (Soundboard)
│   │   ├── layout.tsx           # Layout raiz
│   │   ├── globals.css          # Estilos globais
│   │   ├── providers.tsx        # Providers (NextAuth)
│   │   ├── api/                 # API Routes
│   │   │   ├── play/            # Proxy para o bot
│   │   │   └── auth/            # NextAuth endpoints
│   │   └── auth/                # Páginas de autenticação
│   │       └── signin/          # Página de login
│   ├── components/              # Componentes React
│   │   ├── AudioVisualizer.tsx  # Player visual
│   │   └── PermissionChecker.tsx # Verificador de permissões
│   ├── sounds.json              # Lista de sons
│   ├── package.json             # Dependências do frontend
│   ├── tailwind.config.js       # Configuração TailwindCSS
│   ├── tsconfig.json            # Configuração TypeScript
│   └── .env.local               # Variáveis de ambiente (não commitado)
│
├── 📄 README.md                 # Este arquivo
├── 📄 GUIA_INICIALIZACAO.md     # Guia rápido de inicialização
├── 📄 DEPLOY.md                 # Guia de deploy em produção
├── 📄 DEV.md                    # Guia para desenvolvedores
├── 📄 TODOS.md                  # Lista de tarefas pendentes
└── 📄 .gitignore                # Arquivos ignorados pelo Git
```

---

## ⚙️ Configuração

### Variáveis de Ambiente

#### Bot (`/bot/.env`)

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `DISCORD_TOKEN` | Token do bot do Discord | ✅ Sim |
| `PORT` | Porta do servidor Express | ❌ Não (padrão: 3001) |

#### Web (`/web/.env.local`)

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `NEXTAUTH_URL` | URL base da aplicação | ✅ Sim |
| `NEXTAUTH_SECRET` | Secret para JWT/sessões | ✅ Sim |
| `DISCORD_CLIENT_ID` | Client ID do OAuth Discord | ✅ Sim |
| `DISCORD_CLIENT_SECRET` | Client Secret do OAuth | ✅ Sim |
| `NEXT_PUBLIC_BOT_ENDPOINT` | URL da API do bot | ✅ Sim |

### Obtendo as Credenciais

#### Discord Bot Token
1. Acesse o [Discord Developer Portal](https://discord.com/developers/applications)
2. Crie uma nova aplicação
3. Vá em "Bot" → "Reset Token" → Copie o token

#### Discord OAuth Credentials
1. No mesmo portal, vá em "OAuth2"
2. Copie o Client ID
3. Gere e copie o Client Secret
4. Adicione as Redirect URIs:
   - `http://localhost:3000/api/auth/callback/discord`
   - `https://seu-dominio.com/api/auth/callback/discord`

---

## 🔧 Comandos de Texto (Discord)

| Comando | Descrição |
|---------|-----------|
| `!stop` | Para a reprodução atual |

---

## 🐛 Troubleshooting

### Problemas Comuns

| Problema | Solução |
|----------|---------|
| Bot não conecta ao canal de voz | Verifique as permissões do bot no servidor |
| Áudio não toca | Verifique se o FFmpeg está instalado corretamente |
| YouTube não funciona | Baixe o yt-dlp.exe e coloque na pasta `/bot` |
| "EADDRINUSE" | Outra instância do bot já está rodando |
| Ngrok não funciona no celular | Configure o endpoint do bot na variável de ambiente |

### Logs de Debug

O bot exibe logs detalhados no console:
- 🔌 Status da conexão de voz
- 🎵 Informações sobre o áudio sendo processado
- ❌ Erros detalhados com stack trace

---

## 🤝 Contribuição

Contribuições são bem-vindas! Siga os passos:

1. Fork o repositório
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add: AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

<div align="center">

Feito com 💜 e muito ☕ por **Alexandre**

**[⬆ Voltar ao topo](#-putin-putout---premium-meme-soundboard)**

</div>