const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

// Garante que o banco seja salvo fisicamente na pasta onde o executável for aberto
const dataDir = process.cwd();
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Inicializa a promessa de conexão com o banco
const dbPromise = open({
    filename: path.join(dataDir, 'database.sqlite'),
    driver: sqlite3.Database
});

const initializeDb = async () => {
    try {
        const db = await dbPromise;

        // Cria a tabela de configurações da integração
        await db.exec(`
            CREATE TABLE IF NOT EXISTS IntegrationConfig (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                apiUrl TEXT,
                authUrl TEXT,
                apiUser TEXT,
                apiPassword TEXT,
                cronExpression TEXT,
                active INTEGER DEFAULT 0,
                megaMapping TEXT,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Migração para adicionar a coluna authUrl em DBs já existentes
        const tableInfo = await db.all("PRAGMA table_info(IntegrationConfig)");
        const hasAuthUrl = tableInfo.some(col => col.name === 'authUrl');
        if (!hasAuthUrl) {
            await db.exec('ALTER TABLE IntegrationConfig ADD COLUMN authUrl TEXT');
        }

        // Migração para adicionar a coluna megaMapping em DBs já existentes
        const hasMegaMapping = tableInfo.some(col => col.name === 'megaMapping');
        if (!hasMegaMapping) {
            await db.exec('ALTER TABLE IntegrationConfig ADD COLUMN megaMapping TEXT');
        }

        // Caso a tabela de config esteja vazia, insere uma row padrão
        const configCount = await db.get('SELECT COUNT(*) as count FROM IntegrationConfig');
        if (configCount.count === 0) {
            await db.run(`
                INSERT INTO IntegrationConfig (apiUrl, authUrl, apiUser, apiPassword, cronExpression, active, megaMapping)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, ['', '', '', '', '0 8 * * *', 0, '{}']); // Cron default: Todo dia às 8h
            console.log('Configuração padrão inserida no banco de dados.');
        }

        // Cria a tabela de logs de execução
        await db.exec(`
            CREATE TABLE IF NOT EXISTS IntegrationLogs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                syncDate DATETIME DEFAULT (DATETIME('now', 'localtime')),
                status TEXT,
                message TEXT
            )
        `);

        console.log('Banco de dados em SQLite inicializado com sucesso.');
        return db;
    } catch (error) {
        console.error('Erro ao inicializar o banco de dados:', error);
        throw error;
    }
};

module.exports = {
    dbPromise,
    initializeDb
};
