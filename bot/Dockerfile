FROM node:18-alpine

# Instalar ffmpeg
RUN apk add --no-cache ffmpeg

# Criar diretório de trabalho
WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências
RUN npm ci --omit=dev

# Copiar código fonte
COPY . .

# Expor porta
EXPOSE $PORT

# Comando para iniciar
CMD ["node", "index.js"]
