const axios = require('axios');
const ipeaService = require('./ipeaService');
const { dbPromise } = require('../config/database');
const cron = require('node-cron');
const { findIndicator } = require('../config/indicators');

const REQUEST_TIMEOUT_MS = 30000;
const CRON_TIMEZONE = 'America/Sao_Paulo';

let currentCronJob = null;
// Impede que o Cron e o botão "Sincronizar Agora" enviem os mesmos dados em paralelo
let isSyncRunning = false;

/**
 * Registra um log de execução no banco de dados SQLite.
 */
const logExecution = async (status, message) => {
    try {
        const db = await dbPromise;

        // Pega a data e hora local do sistema ajustada para o fuso brasileiro, 
        // ou usa local string e formata para o formato do SQLite (YYYY-MM-DD HH:MM:SS)
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        const localTimestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

        await db.run('INSERT INTO IntegrationLogs (syncDate, status, message) VALUES (?, ?, ?)', [localTimestamp, status, message]);
    } catch (err) {
        console.error('Falha ao gravar log no banco:', err);
    }
};

/**
 * Efetua login na API do ERP Mega para obter o Bearer Token.
 * O endpoint de login agora é exatamente a 'authUrl' da Configuração.
 */
const authenticateMega = async (authUrl, apiUser, apiPassword) => {
    try {
        // Usa "userName" em vez de "username" conforme exigido pela API do ERP Mega
        const response = await axios.post(authUrl, {
            userName: apiUser,
            password: apiPassword
        }, { timeout: REQUEST_TIMEOUT_MS });

        // Supondo que a API retorna { token: 'seu_jwt_aqui' }
        if (response.data && response.data.token) {
            return response.data.token;
        } else if (response.data && response.data.access_token) {
            return response.data.access_token; // Variação comum OAuth2
        } else {
            throw new Error("Token não encontrado na resposta de login.");
        }
    } catch (error) {
        const errMsg = error.response ? JSON.stringify(error.response.data) : error.message;
        throw new Error(`Falha na autenticação: ${errMsg}`);
    }
};

/**
 * Coleta o último valor atualizado de cada índice no IPEA formatado para o Mega ERP.
 * Agora suporta múltiplos mapeamentos para o mesmo índice e regra de Zero se Negativo.
 */
const gatherLatestIndicators = async (megaMappingArray) => {
    const results = [];

    // Fallback para o dicionário antigo se o JSON do banco estiver no formato velho {IPCA: 15}
    let mappings = [];
    if (Array.isArray(megaMappingArray)) {
        mappings = megaMappingArray;
    } else if (typeof megaMappingArray === 'object' && megaMappingArray !== null) {
        for (const [key, val] of Object.entries(megaMappingArray)) {
            if (val !== null && val !== '') {
                mappings.push({ ipeaCode: key, megaCode: val, zeroIfNegative: false });
            }
        }
    }

    // Cache simples em memória por ciclo para não sobrecarregar a API do IPEA caso o usuário mapeie 10 vezes o IPCA
    const ipeaCache = {};

    for (const mapItem of mappings) {
        const { megaCode, ipeaCode, description, zeroIfNegative } = mapItem;

        // Acha o código real do Ipea baseado na nossa lista simplificada
        const indConfig = findIndicator(ipeaCode);
        if (!indConfig) continue;

        try {
            if (!ipeaCache[ipeaCode]) {
                ipeaCache[ipeaCode] = await ipeaService.getIndicatorData(indConfig.code);
            }
            const seriesData = ipeaCache[ipeaCode];

            // Pega o último item da série histórica (mais recente)
            if (seriesData && seriesData.length > 0) {
                const latest = seriesData[seriesData.length - 1];

                // Formatação da Data: do padrão IPEA (AAAA-MM-DD) para ERP Mega (DD/MM/AAAA)
                let formattedDate = null;
                if (latest.VALDATA) {
                    const dateParts = latest.VALDATA.split('T')[0].split('-');
                    const year = parseInt(dateParts[0], 10);
                    const month = parseInt(dateParts[1], 10) - 1; // Mês 0-11
                    const day = parseInt(dateParts[2], 10);
                    
                    const dateObj = new Date(year, month, day);
                    
                    // Ajusta para dia útil (pula finais de semana para a próxima segunda-feira)
                    if (dateObj.getDay() === 6) { // Sábado
                        dateObj.setDate(dateObj.getDate() + 2);
                    } else if (dateObj.getDay() === 0) { // Domingo
                        dateObj.setDate(dateObj.getDate() + 1);
                    }
                    
                    const finalDay = String(dateObj.getDate()).padStart(2, '0');
                    const finalMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const finalYear = dateObj.getFullYear();
                    
                    formattedDate = `${finalDay}/${finalMonth}/${finalYear}`;
                }

                // Cálculo do valor final
                let finalValue = latest.VALVALOR;

                // Aplica o cálculo de variação ((atual / anterior) - 1) * 100 para os números de índice agregados
                if (indConfig.isIndexNumber) {
                    if (seriesData.length > 1) {
                        const prev = seriesData[seriesData.length - 2].VALVALOR;
                        const curr = latest.VALVALOR;
                        if (prev) {
                            finalValue = ((curr / prev) - 1) * 100;
                            // Arredondando para 8 casas decimais, conforme a consulta da série histórica
                            finalValue = parseFloat(finalValue.toFixed(8));
                        }
                    }
                }

                // Regra: Informar 0 caso índice negativo
                if (zeroIfNegative && finalValue < 0) {
                    finalValue = 0;
                }

                results.push({
                    "p_IND_IN_CODIGO": parseInt(megaCode),
                    "p_VAL_DT_INDICE": formattedDate,
                    "p_VAL_RE_VALOR": finalValue,
                    "p_VAL_CH_TIPO": "R",
                    "p_USU_IN_CODIGO": 1,
                    "p_OPERACAO": "I",
                    "_description": description || ipeaCode // Adicionado para exibir no Log depois
                });
            }
        } catch (err) {
            console.error(`Erro ao coletar índice ${ipeaCode} para o Mega ${megaCode}:`, err.message);
        }
    }

    return results;
};

/**
 * Indica se há uma sincronização em andamento.
 */
const isSyncInProgress = () => isSyncRunning;

/**
 * Função principal que realiza a Sincronização.
 */
const executeSync = async () => {
    if (isSyncRunning) {
        return { success: false, alreadyRunning: true, message: 'Sincronização já em andamento.' };
    }
    isSyncRunning = true;

    try {
        const db = await dbPromise;
        const config = await db.get('SELECT * FROM IntegrationConfig WHERE id = 1');

        if (!config || !config.apiUrl) {
            await logExecution('Erro', 'Configuração de URL da API destino não definida.');
            return { success: false, message: 'URL não configurada.' };
        }

        // Deserializa o mapeamento
        const megaMappingStr = config.megaMapping || '{}';
        const megaMapping = JSON.parse(megaMappingStr);

        // 1. Obter os dados locais (IPEA) mapeados para a nova estrutura Mega
        const payloadData = await gatherLatestIndicators(megaMapping);
        if (payloadData.length === 0) {
            const msg = 'Nenhum dado retornado ou Índices não foram mapeados (De-Para) no painel de configurações.';
            await logExecution('Aviso', msg);
            return { success: false, message: msg };
        }

        // 2. Autenticar no ERP Mega usando o usuário e senha da Configuração
        let token = null;
        if (config.authUrl && config.apiUser && config.apiPassword) {
            token = await authenticateMega(config.authUrl, config.apiUser, config.apiPassword);
        } else if (!config.authUrl && config.apiUser) {
            await logExecution('Aviso', 'Usuário configurado mas a URL de Autenticação foi esquecida, tentando sem Token.');
        } else if (config.authUrl && (!config.apiUser || !config.apiPassword)) {
            await logExecution('Aviso', 'URL de Autenticação configurada mas usuário ou senha não informados, tentando sem Token.');
        }

        // 3. Montar cabeçalhos
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        } else {
            console.warn("Nenhuma credencial configurada. Tentando enviar requisição sem Bearer Token...");
        }

        const ingestUrl = config.apiUrl;

        // O Mega API espera uma "array" de objetos. Para termos um log individual e a resposta, mandaremos um por um dentro da transação.
        let successCount = 0;
        let failCount = 0;

        for (const item of payloadData) {
            const singlePayload = [item];
            const codigoMega = item.p_IND_IN_CODIGO;

            try {
                const response = await axios.post(ingestUrl, singlePayload, { headers, timeout: REQUEST_TIMEOUT_MS });

                // Extrai os dados da resposta do Mega
                const responseBody = response.data
                    ? (typeof response.data === 'string' ? response.data : JSON.stringify(response.data))
                    : 'Sem retorno no corpo da mensagem';

                let apiMessage = "Sucesso";
                let responseDataObj = response.data;

                // Trata o caso onde a API retorna um array de objetos
                if (Array.isArray(response.data) && response.data.length > 0) {
                    responseDataObj = response.data[0];
                }

                if (responseDataObj && responseDataObj.status_message) {
                    apiMessage = responseDataObj.status_message;
                } else if (responseDataObj && responseDataObj.message) {
                    apiMessage = responseDataObj.message;
                }

                const summaryMsg = `[${item._description}] Ref: ${item.p_VAL_DT_INDICE} | Valor: ${item.p_VAL_RE_VALOR} | Retorno: ${apiMessage}`;
                const logData = JSON.stringify({ summary: summaryMsg, details: responseBody });

                // Verifica se a mensagem indica que o índice já existe
                if (responseDataObj && responseDataObj.status_code === 1 && typeof apiMessage === 'string' && apiMessage.toLowerCase().includes('ja existe')) {
                    await logExecution('Atenção', logData);
                } else {
                    await logExecution('Sucesso', logData);
                }
                successCount++;

            } catch (error) {
                // Tenta capturar o status de erro HTTP e a mensagem específica
                let errorDetails = error.message;
                let httpStatus = '';

                if (error.response) {
                    httpStatus = `(HTTP ${error.response.status})`;
                    // Tenta pegar do .data caso a API externa retorne mensagem formatada, senao usar o texto puro
                    errorDetails = typeof error.response.data === 'string'
                        ? error.response.data
                        : JSON.stringify(error.response.data);
                }

                const summaryMsg = `[${item._description}] Ref: ${item.p_VAL_DT_INDICE} | Valor: ${item.p_VAL_RE_VALOR} | Retorno: Falha ${httpStatus}`;
                const logData = JSON.stringify({ summary: summaryMsg, details: errorDetails });

                await logExecution('Erro', logData);
                failCount++;
            }
        }

        const msgFinal = `Sincronização processada. Sucessos: ${successCount}. Falhas: ${failCount}. Veja a tabela de LOG para mais detalhes de cada índice.`;
        return { success: failCount === 0, message: msgFinal };

    } catch (globalError) {
        // Log Falha Estrutural ou de Autenticação
        const errMsg = `[✗] Erro Crítico na Integração. Erro reportado: ${globalError.message}`;
        await logExecution('Erro', errMsg);
        return { success: false, message: errMsg };
    } finally {
        isSyncRunning = false;
    }
};

/**
 * Inicia o Cron Job com base na expressão do banco de dados.
 */
const startCronJob = async () => {
    try {
        const db = await dbPromise;
        const config = await db.get('SELECT cronExpression, active FROM IntegrationConfig WHERE id = 1');

        if (currentCronJob) {
            currentCronJob.destroy();
            currentCronJob = null;
        }

        if (config && config.active) {
            const expr = config.cronExpression || '0 8 * * *'; // Padrão 8 AM se nulo

            // Valida se a expressão é válida
            if (cron.validate(expr)) {
                currentCronJob = cron.schedule(expr, async () => {
                    console.log('Iniciando sincronização via Cron Job...');
                    await executeSync();
                }, { timezone: CRON_TIMEZONE });
                console.log(`Cron Job de Integração agendado. Expressão: [${expr}] (${CRON_TIMEZONE})`);
            } else {
                console.error(`Expressão CRON inválida: ${expr}`);
            }
        } else {
            console.log('Integração desativada via painel.');
        }
    } catch (error) {
        console.error('Erro ao iniciar Cron Job:', error);
    }
};

// Reinicia o cron programaticamente caso o painel altere a configuração
const reloadCron = async () => {
    await startCronJob();
};

module.exports = {
    executeSync,
    isSyncInProgress,
    startCronJob,
    reloadCron
};
