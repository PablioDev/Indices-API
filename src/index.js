require('dotenv').config();
const express = require('express');
const cors = require('cors');
const indicatorRoutes = require('./routes/indicatorRoutes');
const integrationRoutes = require('./routes/integrationRoutes');
const { initializeDb } = require('./config/database');
const { startCronJob } = require('./services/integrationService');
const swaggerDocs = require('./swagger');

const app = express();
const PORT = process.env.PORT || 9137;
const HOST = process.env.HOST || 'localhost';

// Middlewares
app.use(cors());
app.use(express.json());

// Documentação Swagger
swaggerDocs(app, PORT);

// Rotas
app.use('/api/v1/indicators', indicatorRoutes);
app.use('/api/v1/integration', integrationRoutes);

const path = require('path');

// Rota raiz servindo o manual em HTML (dentro do snapshot caso use pkg)
app.use('/', express.static(path.join(__dirname, '../public')));

// Rota de Health check movida para /health
app.get('/health', (req, res) => {
    res.json({ message: 'API de Indicadores Financeiros (Ipeadata) está rodando!' });
});

// Middleware de tratamento de erro genérico
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Algo deu errado no servidor!' });
});

// Inicialização do servidor atrelada ao BD
initializeDb().then(() => {

    // Inicia os Jobs de Integração
    startCronJob();

    app.listen(PORT, HOST, () => {
        console.log(`Servidor rodando na porta ${PORT} no IP ${HOST}`);
        console.log(`Acesse: http://${HOST}:${PORT}`);
    });
}).catch(err => {
    console.error('Falha fatal ao inicializar o banco de dados e servidor:', err);
    process.exit(1);
});
