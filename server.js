import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Cloud Run injeta a porta via process.env.PORT. Padrão é 8080.
const PORT = parseInt(process.env.PORT) || 8080;
// É CRUCIAL ouvir em 0.0.0.0 dentro do container, não em localhost/127.0.0.1
const HOST = '0.0.0.0';

// Serve os arquivos estáticos gerados pelo Vite na pasta dist
app.use(express.static(path.join(__dirname, 'dist')));

// Endpoint de verificação de saúde (opcional, mas recomendado)
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Roteamento SPA: Qualquer rota não encontrada retorna o index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});