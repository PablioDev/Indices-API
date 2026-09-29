const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

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
                // Relativo ao host que serve a documentação (funciona por localhost ou pelo IP do servidor)
                url: '/api/v1',
                description: 'Servidor API (Produção)',
            },
        ],
    },
    // Arquivos que contêm as anotações do Swagger
    // Caminho absoluto: relativo ao cwd não funciona quando o serviço roda de outra pasta ou pelo executável
    apis: [path.join(__dirname, 'routes', '*.js').replace(/\\/g, '/')],
};

const specs = swaggerJsdoc(options);

/**
 * Função para configurar e iniciar a página da documentação (Swagger UI)
 */
const swaggerDocs = (app, port) => {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
    const host = process.env.HOST || 'localhost';
    console.log(`Documentação da API disponível em: http://${host}:${port}/api-docs`);
};

module.exports = swaggerDocs;
