FROM node:18-alpine

# Instalar ffmpeg e yt-dlp
RUN apk add --no-cache ffmpeg yt-dlp

# Criar diretório de trabalho
WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências (versão alternativa)
RUN npm install --production

# Copiar código fonte
COPY . .

# Expor porta
EXPOSE $PORT

# Comando para iniciar
CMD ["node", "index.js"]
