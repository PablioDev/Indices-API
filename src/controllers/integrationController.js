const { dbPromise } = require('../config/database');
const integrationService = require('../services/integrationService');

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
    const { apiUrl, authUrl, apiUser, apiPassword, cronExpression, active, megaMapping } = req.body;
    try {
        const db = await dbPromise;
        const isActive = active ? 1 : 0;
        const megaMappingStr = JSON.stringify(megaMapping || {});

        let query = 'UPDATE IntegrationConfig SET apiUrl = ?, authUrl = ?, apiUser = ?, cronExpression = ?, active = ?, megaMapping = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = 1';
        let params = [apiUrl, authUrl, apiUser, cronExpression, isActive, megaMappingStr];

        // Só atualizamos a senha se o usuário digitou uma nova
        if (apiPassword && apiPassword.trim() !== '') {
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
        const limit = parseInt(req.query.limit) || 100;

        // Traz as 100 últimas execuções ordenadas da mais recente para a mais antiga
        const logs = await db.all('SELECT * FROM IntegrationLogs ORDER BY id DESC LIMIT ?', [limit]);
        res.json({ success: true, data: logs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Gatilho manual
const syncNow = async (req, res) => {
    try {
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
