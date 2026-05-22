# Soundboard Automation MCP Server

Este é um servidor customizado compatível com o **Model Context Protocol (MCP)**, desenvolvido para simplificar e automatizar o fluxo completo de sincronização de túneis locais com serviços na nuvem para o projeto **putInputOut**.

## 🚀 O que ele faz?

Ele fornece 4 ferramentas (tools) para que seu assistente de IA possa realizar tarefas complexas de automação diretamente:

1. **`get_active_tunnel`**: Consulta o ngrok rodando localmente na sua máquina (`http://localhost:4040`) para capturar a URL pública atual do bot de forma automática.
2. **`update_vercel_endpoint`**: Atualiza a variável de ambiente `BOT_ENDPOINT` no projeto da Vercel com a URL capturada do ngrok (ou com qualquer outra URL fornecida).
3. **`trigger_vercel_redeploy`**: Dispara automaticamente um novo deploy da sua aplicação na Vercel para aplicar a alteração da variável.
4. **`check_discord_bot`**: Faz chamadas seguras para a API do Discord para validar se o bot está ativo no servidor (`guildId`), se o canal de voz é válido e se os tokens configurados são legítimos.

---

## 🛠️ Requisitos e Configuração

### 1. Instalar as dependências do MCP
Na pasta `/mcp-automation`, execute:
```bash
npm install
```

### 2. Adicionar as credenciais no seu arquivo de configuração
Para registrar este MCP no seu cliente de IA (como Cline, Claude Desktop ou IDE), adicione as seguintes configurações ao seu arquivo `mcp_config.json`:

```json
{
  "mcpServers": {
    "soundboard-automation": {
      "command": "node",
      "args": [
        "c:/Users/athil/Documents/Projects/Personal/putInputOut/mcp-automation/index.js"
      ],
      "env": {
        "VERCEL_API_TOKEN": "SEU_TOKEN_DE_ACESSO_PESSOAL_VERCEL",
        "VERCEL_PROJECT_ID": "ID_DO_SEU_PROJETO_NA_VERCEL",
        "VERCEL_TEAM_ID": "OPCIONAL_ID_DO_SEU_TIME_NA_VERCEL",
        "DISCORD_BOT_TOKEN": "TOKEN_DO_SEU_BOT_DISCORD"
      }
    }
  }
}
```

> [!IMPORTANT]
> - **Como obter VERCEL_API_TOKEN**: Vá em Vercel Dashboard > Account Settings > Tokens e gere um token com acesso total.
> - **Como obter VERCEL_PROJECT_ID**: Vá nas configurações do seu projeto na Vercel, o ID estará visível logo abaixo do nome do projeto na página inicial de configurações.
