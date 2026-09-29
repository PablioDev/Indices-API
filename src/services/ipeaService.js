const axios = require('axios');

const BASE_URL = 'http://www.ipeadata.gov.br/api/odata4/';
const REQUEST_TIMEOUT_MS = 30000;

/**
 * Busca a série de valores de um indicador específico.
 * Retorna os itens em ordem cronológica e sem valores nulos.
 * @param {string} code O código da série no Ipeadata
 */
const getIndicatorData = async (code) => {
    try {
        const response = await axios.get(`${BASE_URL}ValoresSerie(SERCODIGO='${encodeURIComponent(code)}')`, { timeout: REQUEST_TIMEOUT_MS });
        const values = Array.isArray(response.data && response.data.value) ? response.data.value : [];

        return values
            .filter(item => item.VALDATA && item.VALVALOR !== null && item.VALVALOR !== undefined)
            .sort((a, b) => new Date(a.VALDATA) - new Date(b.VALDATA));
    } catch (error) {
        console.error(`Erro ao buscar dados para a série ${code}:`, error.message);
        throw new Error(`Falha ao obter dados do Ipeadata para o código: ${code}`);
    }
};

/**
 * Busca os metadados (informações) de um indicador específico.
 * @param {string} code O código da série no Ipeadata
 */
const getIndicatorMetadata = async (code) => {
    try {
        const response = await axios.get(`${BASE_URL}Metadados('${encodeURIComponent(code)}')`, { timeout: REQUEST_TIMEOUT_MS });
        return response.data.value ? response.data.value[0] : response.data;
    } catch (error) {
        console.error(`Erro ao buscar metadados para a série ${code}:`, error.message);
        throw new Error(`Falha ao obter metadados do Ipeadata para o código: ${code}`);
    }
};

module.exports = {
    getIndicatorData,
    getIndicatorMetadata
};
