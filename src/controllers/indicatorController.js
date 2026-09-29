const ipeaService = require('../services/ipeaService');
const { mainIndicators, findIndicator } = require('../config/indicators');

// Códigos do Ipeadata contêm apenas letras, números e underscore
const SERIES_CODE_PATTERN = /^[A-Za-z0-9_]+$/;

/**
 * Função utilitária para formatar a data (AAAA-MM-DD para DD/MM/AAAA)
 * e o valor numérico (trocando ponto por vírgula).
 */
const formatBR = (item) => {
    // Isola apenas a data (antes do T) e divide em ano, mês e dia
    const dateParts = item.VALDATA.split('T')[0].split('-');
    const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

    // Troca o separador decimal de '.' para ',' mantendo como string (se a requisição for usar JSON, os valores de ponto flutuante precisam ser string para suportar vírgula)
    const formattedValue = item.VALVALOR !== null && item.VALVALOR !== undefined
        ? item.VALVALOR.toString().replace('.', ',')
        : null;

    return {
        date: formattedDate,
        value: formattedValue
    };
};

/**
 * Retorna a lista de indicadores disponíveis configurados na API.
 */
const listIndicators = (req, res) => {
    res.json({
        success: true,
        data: mainIndicators
    });
};

/**
 * Retorna os dados (série histórica e metadados) de um índicador específico pelo código.
 */
const getIndicatorByCode = async (req, res) => {
    const { code } = req.params;

    if (!SERIES_CODE_PATTERN.test(code)) {
        return res.status(400).json({
            success: false,
            message: 'Código de série inválido. Use apenas letras, números e "_".'
        });
    }

    try {
        // Busca os metadados e os valores da série em paralelo
        const [metadata, seriesData] = await Promise.all([
            ipeaService.getIndicatorMetadata(code).catch(() => null),
            ipeaService.getIndicatorData(code)
        ]);

        // Formata os dados para um JSON mais limpo e legível com o padrão Brasileiro
        const formattedData = seriesData.map(formatBR);

        res.json({
            success: true,
            indicator: code,
            metadata: metadata || { notice: 'Metadados não encontrados para este índice.' },
            data: formattedData
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Consulta a variação mensal de um índice usando código simplificado, ano e mês.
 */
const getMonthlyVariation = async (req, res) => {
    const { indice, ano, mes } = req.query;

    if (!indice || !ano || !mes) {
        return res.status(400).json({
            success: false,
            message: 'Os parâmetros "indice", "ano" e "mes" são obrigatórios via query string.'
        });
    }

    // Busca nas configurações locais
    const indicatorConfig = findIndicator(indice);

    if (!indicatorConfig) {
        const available = mainIndicators.map(i => i.id).join(', ');
        return res.status(404).json({
            success: false,
            message: `Índice '${indice}' não cadastrado. Disponíveis: ${available}`
        });
    }

    try {
        const seriesData = await ipeaService.getIndicatorData(indicatorConfig.code);

        // Formatação do mês para garantir 2 dígitos (ex: "5" -> "05")
        const mesPadded = mes.toString().padStart(2, '0');
        const targetPrefix = `${ano}-${mesPadded}`;

        // Filtra a série histórica pelo ano e mês baseados no prefixo da string de data ISO
        const monthlyData = seriesData.filter(item => item.VALDATA.startsWith(targetPrefix));

        const formattedData = monthlyData.map(formatBR);

        res.json({
            success: true,
            indice: indicatorConfig.id,
            descricao: indicatorConfig.description,
            periodoConsulta: `${mesPadded}/${ano}`,
            resultadosEncontrados: formattedData.length,
            data: formattedData
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Consulta a série histórica completa de um índice usando o código simplificado.
 */
const getHistoricalSeries = async (req, res) => {
    const { indice, ano, mes } = req.query;

    if (!indice) {
        return res.status(400).json({
            success: false,
            message: 'O parâmetro "indice" é obrigatório via query string.'
        });
    }

    // Busca nas configurações locais
    const indicatorConfig = findIndicator(indice);

    if (!indicatorConfig) {
        const available = mainIndicators.map(i => i.id).join(', ');
        return res.status(404).json({
            success: false,
            message: `Índice '${indice}' não cadastrado. Disponíveis: ${available}`
        });
    }

    try {
        const seriesData = await ipeaService.getIndicatorData(indicatorConfig.code);

        // Para números-índice calculamos a variação: (valor_atual / valor_anterior - 1) * 100,
        // usando o array completo (seriesData, já em ordem cronológica) para ter acesso ao mês
        // anterior mesmo se ele ficar fora do filtro de data.
        // Séries que já vêm em % a.m. são repassadas como estão.
        const calculatedData = seriesData.map((item, index, array) => {
            if (!indicatorConfig.isIndexNumber) {
                return { ...item, VALVALOR_VAR: item.VALVALOR };
            }

            let varValor = 0;
            if (index > 0) {
                const prev = array[index - 1].VALVALOR;
                const curr = item.VALVALOR;
                if (prev) {
                    varValor = ((curr / prev) - 1) * 100;
                }
            }
            return {
                ...item,
                VALVALOR_VAR: varValor
            };
        });

        // Aplica o filtro de data se ano ou mes foram informados
        const filteredData = calculatedData.filter(item => {
            const dataISO = item.VALDATA.split('T')[0]; // "YYYY-MM-DD"

            if (ano) {
                if (!dataISO.startsWith(ano)) return false;
            }
            if (mes) {
                // Formata o mês para ter 2 dígitos (ex: "5" -> "05")
                const mesPadded = mes.toString().padStart(2, '0');
                // Pega a parte do mês da string "YYYY-MM-DD" (índice 5 a 6)
                const monthPart = dataISO.substring(5, 7);
                if (monthPart !== mesPadded) return false;
            }

            return true;
        });

        // Formata os dados para o retorno, usando o valor calculado
        const formattedData = filteredData.map(item => {
            const dateParts = item.VALDATA.split('T')[0].split('-');
            const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

            // Corrige casas decimais para no máximo 8 e troca ponto por vírgula
            const formattedValue = item.VALVALOR_VAR !== null && item.VALVALOR_VAR !== undefined
                ? item.VALVALOR_VAR.toFixed(8).replace('.', ',')
                : null;

            return {
                date: formattedDate,
                value: formattedValue
            };
        });

        res.json({
            success: true,
            indice: indicatorConfig.id,
            descricao: indicatorConfig.description,
            resultadosEncontrados: formattedData.length,
            data: formattedData
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    listIndicators,
    getIndicatorByCode,
    getMonthlyVariation,
    getHistoricalSeries
};
