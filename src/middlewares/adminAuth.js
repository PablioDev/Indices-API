const crypto = require('crypto');

// Comparação em tempo constante (evita vazar o tamanho/conteúdo da credencial pelo tempo de resposta)
const safeEqual = (a, b) => {
    const hashA = crypto.createHash('sha256').update(String(a)).digest();
    const hashB = crypto.createHash('sha256').update(String(b)).digest();
    return crypto.timingSafeEqual(hashA, hashB);
};

const isAdminAuthConfigured = () => Boolean(process.env.ADMIN_USER && process.env.ADMIN_PASSWORD);

/**
 * Protege o painel administrativo e as rotas de integração com HTTP Basic Auth.
 * As credenciais vêm de ADMIN_USER e ADMIN_PASSWORD no .env.
 * Sem essas variáveis o acesso fica bloqueado, para não expor as credenciais do ERP Mega.
 */
const adminAuth = (req, res, next) => {
    if (!isAdminAuthConfigured()) {
        return res.status(503).json({
            success: false,
            message: 'Painel administrativo bloqueado: configure ADMIN_USER e ADMIN_PASSWORD no arquivo .env e reinicie a API.'
        });
    }

    const header = req.headers.authorization || '';
    const [scheme, encoded] = header.split(' ');

    if (scheme === 'Basic' && encoded) {
        const decoded = Buffer.from(encoded, 'base64').toString('utf8');
        const separatorIndex = decoded.indexOf(':');
        const user = decoded.slice(0, separatorIndex);
        const password = decoded.slice(separatorIndex + 1);

        const userOk = safeEqual(user, process.env.ADMIN_USER);
        const passwordOk = safeEqual(password, process.env.ADMIN_PASSWORD);
        if (separatorIndex !== -1 && userOk && passwordOk) {
            return next();
        }
    }

    res.set('WWW-Authenticate', 'Basic realm="Integracao ERP Mega", charset="UTF-8"');
    return res.status(401).json({ success: false, message: 'Autenticação necessária.' });
};

module.exports = {
    adminAuth,
    isAdminAuthConfigured
};
