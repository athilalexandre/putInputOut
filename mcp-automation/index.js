import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Inicializa o servidor MCP
const server = new Server(
  {
    name: "soundboard-automation",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Auxiliar para respostas padronizadas do MCP
function makeTextResponse(text) {
  return {
    content: [
      {
        type: "text",
        text,
      },
    ],
  };
}

// Auxiliar para requisições seguras com fetch nativo
async function apiRequest(url, options = {}) {
  try {
    const response = await fetch(url, options);
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      data: { error: error.message },
    };
  }
}

// Define a lista de ferramentas disponíveis
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_active_tunnel",
        description: "Consulta a API local do ngrok (http://localhost:4040/api/tunnels) para obter a URL pública ativa do bot.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "update_vercel_endpoint",
        description: "Atualiza a variável de ambiente BOT_ENDPOINT na Vercel com a nova URL do túnel.",
        inputSchema: {
          type: "object",
          properties: {
            newUrl: {
              type: "string",
              description: "A nova URL pública do bot obtida do ngrok.",
            },
          },
          required: ["newUrl"],
        },
      },
      {
        name: "trigger_vercel_redeploy",
        description: "Aciona um novo deploy do frontend na Vercel para aplicar a alteração da variável de ambiente.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "check_discord_bot",
        description: "Verifica se o bot está no servidor Discord informado e se o canal de voz é válido.",
        inputSchema: {
          type: "object",
          properties: {
            guildId: {
              type: "string",
              description: "ID do servidor Discord.",
            },
            voiceChannelId: {
              type: "string",
              description: "ID do canal de voz.",
            },
          },
          required: ["guildId", "voiceChannelId"],
        },
      },
    ],
  };
});

// Manipula a execução das ferramentas
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "get_active_tunnel": {
        console.error("Consultando API local do ngrok...");
        const res = await apiRequest("http://localhost:4040/api/tunnels");
        if (!res.ok) {
          return makeTextResponse(
            `❌ Falha ao conectar com a API local do ngrok. Certifique-se de que o ngrok está rodando na porta padrão (4040). Detalhes: ${JSON.stringify(res.data)}`
          );
        }

        const tunnels = res.data.tunnels || [];
        const activeTunnel = tunnels.find((t) => t.proto === "https" || t.proto === "http");

        if (!activeTunnel) {
          return makeTextResponse("❌ Nenhum túnel ativo encontrado no ngrok.");
        }

        return makeTextResponse(
          `✅ Túnel ativo encontrado com sucesso!\n• Nome: ${activeTunnel.name}\n• URL Pública: ${activeTunnel.public_url}\n• Endpoint Local: ${activeTunnel.config?.addr || "Desconhecido"}`
        );
      }

      case "update_vercel_endpoint": {
        const { newUrl } = args;
        const vercelToken = process.env.VERCEL_API_TOKEN;
        const projectId = process.env.VERCEL_PROJECT_ID;
        const teamId = process.env.VERCEL_TEAM_ID;

        if (!vercelToken || !projectId) {
          return makeTextResponse(
            "❌ Variáveis de ambiente VERCEL_API_TOKEN e VERCEL_PROJECT_ID são obrigatórias para este comando."
          );
        }

        console.error(`Buscando variáveis de ambiente do projeto Vercel: ${projectId}...`);
        
        // 1. Obter lista de envs
        const queryParams = teamId ? `?teamId=${teamId}` : "";
        const envsRes = await apiRequest(
          `https://api.vercel.com/v9/projects/${projectId}/env${queryParams}`,
          {
            headers: { Authorization: `Bearer ${vercelToken}` },
          }
        );

        if (!envsRes.ok) {
          return makeTextResponse(
            `❌ Erro ao listar variáveis da Vercel: ${JSON.stringify(envsRes.data)}`
          );
        }

        const envList = envsRes.data.envs || [];
        const botEnvVar = envList.find((e) => e.key === "BOT_ENDPOINT");

        if (!botEnvVar) {
          // Criar se não existir
          console.error("Variável BOT_ENDPOINT não encontrada. Criando nova variável...");
          const createRes = await apiRequest(
            `https://api.vercel.com/v10/projects/${projectId}/env${queryParams}`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${vercelToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                key: "BOT_ENDPOINT",
                value: newUrl,
                type: "plain",
                target: ["production", "preview", "development"],
              }),
            }
          );

          if (!createRes.ok) {
            return makeTextResponse(
              `❌ Falha ao criar variável BOT_ENDPOINT na Vercel: ${JSON.stringify(createRes.data)}`
            );
          }

          return makeTextResponse(`✅ Variável BOT_ENDPOINT criada com sucesso com o valor: ${newUrl}`);
        }

        // 2. Atualizar se já existir
        console.error(`Atualizando BOT_ENDPOINT (ID: ${botEnvVar.id}) para: ${newUrl}...`);
        const updateRes = await apiRequest(
          `https://api.vercel.com/v9/projects/${projectId}/env/${botEnvVar.id}${queryParams}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${vercelToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              value: newUrl,
            }),
          }
        );

        if (!updateRes.ok) {
          return makeTextResponse(
            `❌ Falha ao atualizar variável BOT_ENDPOINT na Vercel: ${JSON.stringify(updateRes.data)}`
          );
        }

        return makeTextResponse(
          `✅ Variável de ambiente BOT_ENDPOINT atualizada com sucesso para: ${newUrl}!`
        );
      }

      case "trigger_vercel_redeploy": {
        const vercelToken = process.env.VERCEL_API_TOKEN;
        const projectId = process.env.VERCEL_PROJECT_ID;
        const teamId = process.env.VERCEL_TEAM_ID;

        if (!vercelToken || !projectId) {
          return makeTextResponse(
            "❌ Variáveis de ambiente VERCEL_API_TOKEN e VERCEL_PROJECT_ID são obrigatórias para este comando."
          );
        }

        console.error("Disparando novo redeploy na Vercel...");
        const queryParams = teamId ? `?teamId=${teamId}` : "";
        
        // Criar deploy apontando para o último commit do projeto
        const deployRes = await apiRequest(
          `https://api.vercel.com/v13/deployments${queryParams}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${vercelToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: "put-input-out-redeploy",
              projectId: projectId,
            }),
          }
        );

        if (!deployRes.ok) {
          return makeTextResponse(
            `❌ Erro ao disparar redeploy na Vercel: ${JSON.stringify(deployRes.data)}`
          );
        }

        return makeTextResponse(
          `🚀 Redeploy iniciado com sucesso!\n• ID do Deploy: ${deployRes.data.id}\n• URL de Acompanhamento: https://${deployRes.data.url}`
        );
      }

      case "check_discord_bot": {
        const { guildId, voiceChannelId } = args;
        const botToken = process.env.DISCORD_BOT_TOKEN;

        if (!botToken) {
          return makeTextResponse("❌ Variável de ambiente DISCORD_BOT_TOKEN é obrigatória para esta validação.");
        }

        console.error("Verificando servidor e permissões na API do Discord...");
        
        // 1. Validar Guild (Ver se o bot está no servidor)
        const guildRes = await apiRequest(`https://discord.com/api/v10/guilds/${guildId}`, {
          headers: { Authorization: `Bot ${botToken}` },
        });

        if (!guildRes.ok) {
          if (guildRes.status === 401) {
            return makeTextResponse("❌ O token do bot Discord (DISCORD_BOT_TOKEN) é inválido ou foi rotacionado.");
          }
          if (guildRes.status === 404) {
            return makeTextResponse(
              "❌ Servidor não encontrado. Certifique-se de que o ID do Servidor está correto e que o bot foi convidado para o servidor."
            );
          }
          return makeTextResponse(`❌ Erro ao buscar servidor no Discord: ${JSON.stringify(guildRes.data)}`);
        }

        // 2. Validar Canal de Voz
        const channelRes = await apiRequest(`https://discord.com/api/v10/channels/${voiceChannelId}`, {
          headers: { Authorization: `Bot ${botToken}` },
        });

        if (!channelRes.ok) {
          return makeTextResponse(
            `❌ Canal de voz não encontrado ou inacessível para o bot. Detalhes: ${JSON.stringify(channelRes.data)}`
          );
        }

        const channel = channelRes.data;
        if (channel.guild_id !== guildId) {
          return makeTextResponse("❌ O canal de voz informado não pertence a este servidor Discord.");
        }

        // 2: GUILD_VOICE, 13: GUILD_STAGE_VOICE
        if (channel.type !== 2 && channel.type !== 13) {
          return makeTextResponse(`❌ O canal '${channel.name}' não é um canal de voz válido.`);
        }

        return makeTextResponse(
          `✅ Tudo OK no Discord!\n• Servidor: ${guildRes.data.name} (Bot Presente)\n• Canal de Voz: #${channel.name} (Válido e Acessível)`
        );
      }

      default:
        throw new Error(`Ferramenta desconhecida: ${name}`);
    }
  } catch (error) {
    console.error(`Erro ao executar ferramenta ${name}:`, error);
    return makeTextResponse(`❌ Erro interno durante a execução: ${error.message}`);
  }
});

// Inicialização do servidor MCP
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Soundboard Automation MCP Server rodando na porta StdIO!");
}

run().catch((error) => {
  console.error("Erro fatal ao iniciar servidor MCP:", error);
  process.exit(1);
});
