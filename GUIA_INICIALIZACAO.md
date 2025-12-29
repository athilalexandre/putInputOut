# 🚀 Guia de Inicialização: Servidores + Ngrok

Este documento explica como iniciar todos os componentes do projeto e como usar o Ngrok para acesso externo.

## 📋 Resumo dos Terminais
Você precisará de **3 terminais** abertos simultaneamente:
1. Terminal do **Bot** (Porta 3001)
2. Terminal da **Web** (Porta 3000)
3. Terminal do **Ngrok** (Tunelamento)

---

## 1️⃣ Iniciar o Bot (Backend)
O bot controla a música e a conexão com o Discord.

1. Abra o Terminal.
2. Navegue até a pasta do bot e inicie:
```bash
cd bot
npm run dev
```
✅ **Sucesso:** Você verá logs como `Bot ONLINE!` e `SERVER AUDIO ONLINE NA PORTA 3001`.

---

## 2️⃣ Iniciar o Site (Frontend)
A interface web onde você clica nos botões.

1. Abra um **novo** Terminal (Mantenha o anterior aberto).
2. Navegue até a pasta web e inicie:
```bash
cd web
npm run dev
```
✅ **Sucesso:** O site estará acessível em `http://localhost:3000`.

---

## 3️⃣ Iniciar o Ngrok
O Ngrok permite que você acesse o site de outros dispositivos (celular, outros PCs) fora da sua rede.

### Passo Simples (Acesso Visual)
Se você quer apenas ver o site em outro lugar:

1. Abra um **terceiro** Terminal.
2. Rode o comando:
```bash
ngrok http 3001
```
3. Copie o link **Forwarding** que aparece (ex: `https://a1b2-c3d4.ngrok-free.app`).
4. Envie esse link para seu celular ou amigos.

### ⚠️ Atenção Importante sobre Conectividade
Por padrão, o site (`localhost:3000`) tenta falar com o bot em `localhost:3001`. 
- **No seu PC:** Funciona perfeito.
- **No Celular (via Ngrok):** O site vai abrir, mas **os botões podem falhar** porque o celular não entende o que é "localhost".

**Para funcionar 100% no celular (Avançado):**
Configure a variável `NEXT_PUBLIC_BOT_ENDPOINT` no arquivo `.env.local` da pasta web com a URL do Ngrok.
