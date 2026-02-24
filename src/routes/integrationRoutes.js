const express = require('express');
const router = express.Router();
const integrationController = require('../controllers/integrationController');

// Endpoints da Interface de Gerenciamento da Integração
router.get('/config', integrationController.getConfig);
router.post('/config', integrationController.saveConfig);
router.get('/logs', integrationController.getLogs);
router.post('/sync', integrationController.syncNow);

module.exports = router;
