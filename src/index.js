require('dotenv').config();
const express = require('express');
const cors = require('cors');
const indicatorRoutes = require('./routes/indicatorRoutes');
const swaggerDocs = require('./swagger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Documentação Swagger
swaggerDocs(app, PORT);

// Rotas
app.use('/api/v1/indicators', indicatorRoutes);

// Rota raiz servindo o manual em HTML
app.use('/', express.static('public'));

// Rota de Health check movida para /health
app.get('/health', (req, res) => {
    res.json({ message: 'API de Indicadores Financeiros (Ipeadata) está rodando!' });
});

// Middleware de tratamento de erro genérico
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Algo deu errado no servidor!' });
});

// Inicialização do servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
});
