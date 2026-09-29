const { dbPromise } = require('../config/database');
const integrationService = require('../services/integrationService');
const cron = require('node-cron');
const { findIndicator } = require('../config/indicators');

const MAX_LOGS_LIMIT = 500;

/**
 * Valida a expressão CRON e o De-Para recebidos do painel.
 * Retorna a mensagem de erro, ou null se estiver tudo certo.
 */
const validateConfigPayload = (cronExpression, megaMapping) => {
    if (!cronExpression || !cron.validate(cronExpression)) {
        return `Expressão de agendamento inválida: "${cronExpression || ''}".`;
    }

    if (megaMapping !== undefined && megaMapping !== null && !Array.isArray(megaMapping)) {
        return 'O De-Para de índices deve ser uma lista.';
    }

    for (const item of megaMapping || []) {
        if (!item || !Number.isInteger(Number(item.megaCode)) || String(item.megaCode).trim() === '') {
            return `Código do índice no ERP Mega inválido: "${item && item.megaCode}".`;
        }
        if (!findIndicator(item.ipeaCode)) {
            return `Índice Ipeadata não suportado: "${item.ipeaCode}".`;
        }
    }

    return null;
};

// Recupera a configuração (sem expor a senha no json)
const getConfig = async (req, res) => {
    try {
        const db = await dbPromise;
        const config = await db.get('SELECT apiUrl, authUrl, apiUser, cronExpression, active, megaMapping FROM IntegrationConfig WHERE id = 1');

        if (config && config.megaMapping) {
            try {
                config.megaMapping = JSON.parse(config.megaMapping);
            } catch (e) {
                config.megaMapping = {};
            }
        } else if (config) {
            config.megaMapping = {};
        }

        // Retornamos os dados, note que a senha não é devolvida para a UI por segurança.
        res.json({ success: true, data: config });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Salva a configuração atualizada
const saveConfig = async (req, res) => {
    const { apiUrl, authUrl, apiUser, apiPassword, cronExpression, active, megaMapping } = req.body || {};

    const validationError = validateConfigPayload(cronExpression, megaMapping);
    if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
    }

    try {
        const db = await dbPromise;
        const isActive = active ? 1 : 0;
        const megaMappingStr = JSON.stringify(megaMapping || []);

        let query = 'UPDATE IntegrationConfig SET apiUrl = ?, authUrl = ?, apiUser = ?, cronExpression = ?, active = ?, megaMapping = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = 1';
        let params = [apiUrl, authUrl, apiUser, cronExpression, isActive, megaMappingStr];

        // Só atualizamos a senha se o usuário digitou uma nova
        if (typeof apiPassword === 'string' && apiPassword.trim() !== '') {
            query = 'UPDATE IntegrationConfig SET apiUrl = ?, authUrl = ?, apiUser = ?, apiPassword = ?, cronExpression = ?, active = ?, megaMapping = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = 1';
            params = [apiUrl, authUrl, apiUser, apiPassword, cronExpression, isActive, megaMappingStr];
        }

        await db.run(query, params);

        // Reiniciamos o cron job com a nova periodicidade ativada ou desativada
        await integrationService.reloadCron();

        res.json({ success: true, message: 'Configurações de integração salvas com sucesso!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Recupera os últimos logs
const getLogs = async (req, res) => {
    try {
        const db = await dbPromise;
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), MAX_LOGS_LIMIT);
        const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const status = req.query.status;

        let query = 'SELECT * FROM IntegrationLogs';
        let countQuery = 'SELECT COUNT(*) as total FROM IntegrationLogs';
        let params = [];
        let countParams = [];
        let conditions = [];

        // Trata startDate (inicio do dia)
        if (startDate) {
            conditions.push('syncDate >= ?');
            params.push(`${startDate} 00:00:00`);
            countParams.push(`${startDate} 00:00:00`);
        }

        // Trata endDate (fim do dia)
        if (endDate) {
            conditions.push('syncDate <= ?');
            params.push(`${endDate} 23:59:59`);
            countParams.push(`${endDate} 23:59:59`);
        }

        // Trata status
        if (status) {
            conditions.push('status = ?');
            params.push(status);
            countParams.push(status);
        }

        if (conditions.length > 0) {
            const whereClause = ' WHERE ' + conditions.join(' AND ');
            query += whereClause;
            countQuery += whereClause;
        }

        query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const totalRow = await db.get(countQuery, countParams);
        const totalLogs = totalRow ? totalRow.total : 0;

        const logs = await db.all(query, params);

        res.json({
            success: true,
            data: logs,
            pagination: {
                total: totalLogs,
                limit,
                offset
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Gatilho manual
const syncNow = async (req, res) => {
    try {
        if (integrationService.isSyncInProgress()) {
            return res.status(409).json({ success: false, message: 'Sincronização já em andamento. Aguarde a conclusão e verifique os logs.' });
        }

        // Roda em background a integração real do serviço recém criado
        integrationService.executeSync().catch(console.error);
        res.json({ success: true, message: 'Processo de sincronização iniciado em background. Verifique os logs em instantes.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getConfig,
    saveConfig,
    getLogs,
    syncNow
};
