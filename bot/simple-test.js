import http from 'http';

const server = http.createServer((req, res) => {
  console.log('Requisição recebida:', req.method, req.url);
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    ok: true, 
    message: 'Servidor HTTP simples funcionando',
    timestamp: new Date().toISOString()
  }));
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🚀 Servidor HTTP simples rodando na porta ${PORT}`);
});
