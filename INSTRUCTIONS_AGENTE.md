# 🧠 Instruções Críticas para o Agente AI (Antigravity)

Este documento contém regras comportamentais estritas que o Agente AI (você) deve seguir neste repositório.

## 🚀 Inicialização Proativa de Serviços para Teste

> [!IMPORTANT]
> **O usuário não deve ser solicitado a iniciar os serviços manualmente.** 
> Sempre que iniciar uma tarefa de teste, depuração ou concluir uma alteração, o agente deve, por iniciativa própria:
> 1. Identificar se os serviços locais (Bot Discord e Túnel ngrok) estão ativos.
> 2. Encerrar quaisquer processos zumbis ou conflitantes nas portas `3000`, `3001` ou `5173`.
> 3. Iniciar o bot local em background (`node index.js` na pasta `/bot`).
> 4. Iniciar o túnel ngrok associado à URL estática configurada (`npx ngrok http 3001 --url saltily-unprovident-xavier.ngrok-free.dev`).
> 5. Certificar-se de que a API local do ngrok e do bot estão saudáveis e respondendo antes de finalizar o turno e liberar o usuário para os testes.

---

## ⚙️ Comandos Padrão de Inicialização Automática

### 1. Limpeza de Portas (Kill de Processos Conflitantes)
No Windows, se as portas estiverem ocupadas:
```powershell
# Encontrar e encerrar processos que estejam escutando na porta 3001 (Bot)
$pid3001 = (Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue).OwningProcess
if ($pid3001) { Stop-Process -Id $pid3001 -Force }

# Encontrar e encerrar processos que estejam escutando na porta 3000 (Backend StreamForge)
$pid3000 = (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess
if ($pid3000) { Stop-Process -Id $pid3000 -Force }

# Encontrar e encerrar qualquer instância residual do ngrok
Stop-Process -Name "ngrok" -Force -ErrorAction SilentlyContinue
```

### 2. Inicialização do Bot Local
Na pasta `bot/`:
```bash
node index.js
```

### 3. Inicialização do Túnel ngrok Estático
Na pasta raiz ou `bot/`:
```bash
npx ngrok http 3001 --url saltily-unprovident-xavier.ngrok-free.dev
```

### 4. Validação do Túnel
Sempre execute o comando a seguir para garantir que a resposta do bot através do ngrok esteja respondendo `status: ok`:
```powershell
Invoke-RestMethod -Uri https://saltily-unprovident-xavier.ngrok-free.dev/health -Headers @{'ngrok-skip-browser-warning'='true'}
```
