const axios = require('axios');

const BASE_URL = 'http://www.ipeadata.gov.br/api/odata4/';

/**
 * Busca a série de valores de um indicador específico.
 * @param {string} code O código da série no Ipeadata
 */
const getIndicatorData = async (code) => {
    try {
        const response = await axios.get(`${BASE_URL}ValoresSerie(SERCODIGO='${code}')`);
        return response.data.value;
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
        const response = await axios.get(`${BASE_URL}Metadados('${code}')`);
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
