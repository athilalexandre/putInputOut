# 🎵 PutIn PutOut - Premium Meme Soundboard

> O bot de soundboard mais chique e premium do Discord. Feito para momentos caóticos.

![PutIn PutOut Preview](https://via.placeholder.com/800x400?text=PutIn+PutOut+Soundboard)

## ✨ Principais Funcionalidades

*   **Soundboard Visual Web:** Controle tudo por um site bonito e responsivo.
*   **MyInstants Direto:** Cole links do [MyInstants](https://myinstants.com) e toque instantaneamente.
*   **Upload de Sons:** Envie seus próprios arquivos MP3/WAV.
*   **Gerenciamento Total:** Renomeie e **Delete** sons direto pela interface (com senha de admin).
*   **Sem Comandos Complicados:** Clica e toca. Simples.

## 🚀 Como Usar

### 1. Configuração Inicial
1.  Abra o site do bot (o link que aparece no console).
2.  No Discord, ative o **Modo Desenvolvedor** (Configurações > Avançado).
3.  **Copie o ID do Servidor** (Botão direito no ícone do servidor).
4.  **Copie o ID do Canal de Voz** (Botão direito no canal).
5.  No site, cole essas IDs e clique em **"Testar Conexão"**.
6.  Se ficar **Verde**, você está pronto para a bagunça!

### 2. Tocando Sons
*   **Biblioteca:** Clique em qualquer card para tocar.
*   **Link Rápido:** Cole link do YouTube ou MyInstants e clique em "Tocar Agora".
*   **MyInstants:** O bot detecta automaticamente links do MyInstants e extrai o áudio correto.

### 3. Gerenciando Sons
*   **Renomear:** Passe o mouse no card e clique no **Lápis (✏️)**.
*   **Deletar:** Passe o mouse e clique na **Lixeira (🗑️)**.
    *   *Senha de Admin:* `admindelete`
*   **Upload:** Clique em **"+ Upload Sound"** para adicionar novos arquivos (MP3, WAV, OGG).

## 🛠️ Instalação (Para Desenvolvedores)

### Pré-requisitos
*   Node.js 18+
*   FFmpeg instalado e no PATH (ou na pasta raiz do bot).
*   Conta no Discord Developer Portal.

### Passo a Passo

1.  **Clone o repo:**
    ```bash
    git clone https://github.com/seu-usuario/putinputout.git
    cd putinputout
    ```

2.  **Configure o Backend (Bot):**
    ```bash
    cd bot
    npm install
    cp .env.example .env
    # Edite o .env com seu DISCORD_TOKEN
    ```

3.  **Configure o Frontend (Web):**
    ```bash
    cd ../web
    npm install
    # O frontend se conecta ao localhost:3001 por padrão.
    ```

4.  **Rodando:**
    *   Terminal 1 (Bot): `cd bot && node index.js`
    *   Terminal 2 (Web): `cd web && npm run dev`
    *   Terminal 3 (Tunnel): `ngrok http 3001` (para expor a API)

## 🔧 Estrutura do Projeto

*   `/bot`: Backend Node.js com Discord.js e Express.
    *   `sounds/`: Pasta onde ficam os uploads.
*   `/web`: Frontend Next.js 13 com TailwindCSS.

## 📝 Licença

Feito com caos e Next.js.