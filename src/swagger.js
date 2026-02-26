const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API de Indicadores Financeiros (Ipeadata)',
            version: '1.0.0',
            description: 'API proxy para simplificar e formatar o consumo da API oficial do Ipeadata para os principais indicadores financeiros do Brasil.',
        },
        servers: [
            {
                url: 'http://localhost:9137/api/v1',
                description: 'Servidor API (Produção)',
            },
        ],
    },
    // Arquivos que contêm as anotações do Swagger
    apis: ['./src/routes/*.js'],
};

const specs = swaggerJsdoc(options);

/**
 * Função para configurar e iniciar a página da documentação (Swagger UI)
 */
const swaggerDocs = (app, port) => {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
    console.log(`Documentação da API disponível em: http://10.95.11.143:${port}/api-docs`);
};

module.exports = swaggerDocs;
