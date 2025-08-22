import express from 'express';
const app = express();
const PORT = 3001;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.post('/play', (req, res) => {
  console.log('Requisição recebida:', req.body);
  res.json({ 
    ok: true, 
    source: 'TEST_MODE',
    message: 'Servidor de teste funcionando'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor de teste rodando na porta ${PORT}`);
});
