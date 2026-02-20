const express = require('express');
const router = express.Router();
const indicatorController = require('../controllers/indicatorController');

/**
 * @openapi
 * /indicators:
 *   get:
 *     summary: Retorna a lista de indicadores disponíveis
 *     description: Retorna uma lista dos principais indicadores financeiros configurados (IGP-M, IPCA, INCC, IPCA12, IGPM12, INCC12) e seus metadados simplificados.
 *     responses:
 *       200:
 *         description: Lista de indicadores listada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: IPCA
 *                       code:
 *                         type: string
 *                         example: PRECOS12_IPCAG12
 *                       description:
 *                         type: string
 *                         example: Índice Nacional de Preços ao Consumidor Amplo (IPCA)
 */
// Rota para listar os indicadores disponíveis configurados
router.get('/', indicatorController.listIndicators);

/**
 * @openapi
 * /indicators/consulta_indice_variacao_mensal:
 *   get:
 *     summary: Consulta a variação mensal de um índice
 *     description: Permite buscar o valor de um índice usando um código simplificado (ex IPCA) informando o ano e o mês desejado.
 *     parameters:
 *       - in: query
 *         name: indice
 *         required: true
 *         description: Código simplificado do índice (IPCA, IGPM, INCC)
 *         schema:
 *           type: string
 *       - in: query
 *         name: ano
 *         required: true
 *         description: Ano da consulta (ex 2024)
 *         schema:
 *           type: string
 *       - in: query
 *         name: mes
 *         required: true
 *         description: Mês da consulta (ex 01, 1, 12)
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dados retornados com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 indice:
 *                   type: string
 *                   example: IPCA
 *                 descricao:
 *                   type: string
 *                 periodoConsulta:
 *                   type: string
 *                   example: 01/2024
 *                 resultadosEncontrados:
 *                   type: integer
 *                   example: 1
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         example: 01/01/2024
 *                       value:
 *                         type: string
 *                         example: 0,42
 *       400:
 *         description: Parâmetros obrigatórios faltando.
 *       404:
 *         description: Índice simplificado não cadastrado.
 */
router.get('/consulta_indice_variacao_mensal', indicatorController.getMonthlyVariation);

/**
 * @openapi
 * /indicators/consulta_indice_serie_historica:
 *   get:
 *     summary: Consulta a série histórica completa de um índice
 *     description: Permite buscar a série histórica de um índice usando um código simplificado (ex IPCA).
 *     parameters:
 *       - in: query
 *         name: indice
 *         required: true
 *         description: Código simplificado do índice (IPCA, IGPM, INCC, IPCA12, IGPM12, INCC12)
 *         schema:
 *           type: string
 *       - in: query
 *         name: ano
 *         required: false
 *         description: Filtrar dados por este ano (ex 2024)
 *         schema:
 *           type: string
 *       - in: query
 *         name: mes
 *         required: false
 *         description: Filtrar dados por este mês (ex 01, 1, 12)
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dados retornados com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 indice:
 *                   type: string
 *                   example: IPCA12
 *                 descricao:
 *                   type: string
 *                 resultadosEncontrados:
 *                   type: integer
 *                   example: 100
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         example: 01/01/2024
 *                       value:
 *                         type: string
 *                         example: 0,42
 *       400:
 *         description: Parâmetro obrigatório faltando.
 *       404:
 *         description: Índice simplificado não cadastrado.
 */
router.get('/consulta_indice_serie_historica', indicatorController.getHistoricalSeries);

/**
 * @openapi
 * /indicators/{code}:
 *   get:
 *     summary: Retorna a série histórica de um indicador
 *     description: Retorna os metadados dinâmicos vindos da API oficial e a série histórica de valores, formatando para um array onde cada objeto possui `date` e `value`.
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         description: Código da série no Ipeadata (ex: PRECOS12_IPCAG12)
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Série histórica e metadados retornados com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 indicator:
 *                   type: string
 *                   example: PRECOS12_IPCAG12
 *                 metadata:
 *                   type: object
 *                   description: Objeto com informações detalhadas da série que vêm do Ipeadata.
 *                 data:
 *                   type: array
 *                   description: Série histórica contendo datas e valores
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         example: 01/01/1980
 *                       value:
 *                         type: string
 *                         example: 6,62
 *       500:
 *         description: Erro ao buscar os dados do Ipeadata.
 */
// Rota para buscar os dados de um indicador específico pelo código da série do Ipeadata
router.get('/:code', indicatorController.getIndicatorByCode);

module.exports = router;
