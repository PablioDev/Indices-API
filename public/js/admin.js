document.addEventListener('DOMContentLoaded', () => {

    const configForm = document.getElementById('configForm');
    const btnSyncNow = document.getElementById('btnSyncNow');
    const btnRefreshLogs = document.getElementById('btnRefreshLogs');
    const logsTableBody = document.getElementById('logsTableBody');
    const statusBadge = document.getElementById('statusBadge');

    // Novas referências Mapeamento Dinâmico
    const btnAddMapping = document.getElementById('btnAddMapping');
    const mappingContainer = document.getElementById('mappingContainer');

    // Referências Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // Inicialização
    loadConfig();
    loadLogs();

    // -----------------------------------------
    // Eventos
    // -----------------------------------------

    // Tabs
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active classes
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Add active to clicked and target content
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });

    configForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        saveConfig();
    });

    btnAddMapping.addEventListener('click', () => {
        createMappingRow();
    });

    btnSyncNow.addEventListener('click', async () => {
        const originalText = btnSyncNow.innerHTML;
        btnSyncNow.innerHTML = `<svg class="spin" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> Sincronizando...`;
        btnSyncNow.disabled = true;

        try {
            const res = await fetch('/api/v1/integration/sync', { method: 'POST' });
            const data = await res.json();

            if (data.success) {
                showToast(data.message, 'success');
                // Adicional delay para dar tempo do background gravar o log
                setTimeout(() => {
                    loadLogs();
                    btnSyncNow.innerHTML = originalText;
                    btnSyncNow.disabled = false;
                }, 2000);
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            showToast(`Erro na sincronização: ${error.message}`, 'error');
            btnSyncNow.innerHTML = originalText;
            btnSyncNow.disabled = false;
        }
    });

    btnRefreshLogs.addEventListener('click', () => {
        const svg = btnRefreshLogs.querySelector('svg');
        svg.classList.add('spin');
        loadLogs().finally(() => {
            setTimeout(() => svg.classList.remove('spin'), 500);
        });
    });

    // -----------------------------------------
    // Funções
    // -----------------------------------------

    async function loadConfig() {
        try {
            const res = await fetch('/api/v1/integration/config');
            const result = await res.json();

            if (result.success && result.data) {
                const config = result.data;
                document.getElementById('apiUrl').value = config.apiUrl || '';
                document.getElementById('authUrl').value = config.authUrl || '';
                document.getElementById('apiUser').value = config.apiUser || '';
                document.getElementById('cronExpression').value = config.cronExpression || '0 8 * * *';
                document.getElementById('active').checked = config.active === 1;

                // Limpa container e injeta os mapeamentos
                mappingContainer.innerHTML = '';
                if (config.megaMapping && Array.isArray(config.megaMapping) && config.megaMapping.length > 0) {
                    config.megaMapping.forEach(item => createMappingRow(item));
                } else if (config.megaMapping && typeof config.megaMapping === 'object' && !Array.isArray(config.megaMapping)) {
                    // Compatibilidade com a versão velha de dicionário { "IPCA": 15 }
                    const keys = Object.keys(config.megaMapping);
                    if (keys.length > 0) {
                        keys.forEach(key => {
                            if (config.megaMapping[key] !== null && config.megaMapping[key] !== '') {
                                createMappingRow({ ipeaCode: key, megaCode: config.megaMapping[key], description: '', zeroIfNegative: false });
                            }
                        });
                    } else {
                        // Linha vazia inicial
                        createMappingRow();
                    }
                } else {
                    // Linha vazia inicial
                    createMappingRow();
                }

                updateStatusBadge(config.active === 1);
            } else {
                updateStatusBadge(false);
            }
        } catch (error) {
            console.error("Erro ao carregar configurações:", error);
            showToast("Falha ao carregar configurações do servidor.", "error");
        }
    }

    async function saveConfig() {
        const btnSave = document.getElementById('btnSaveConfig');
        const originalText = btnSave.innerText;
        btnSave.innerText = 'Salvando...';
        btnSave.disabled = true;

        // Constrói array dinâmico lendo os campos do DOM
        const mapeamentosNodes = mappingContainer.querySelectorAll('.mapping-row');
        const megaMapping = [];

        mapeamentosNodes.forEach(row => {
            const megaCodeInput = row.querySelector('.mega-code').value;
            const descriptionInput = row.querySelector('.mapping-description').value;
            const ipeaCodeSelect = row.querySelector('.ipea-code').value;
            const zeroIfNegativeInput = row.querySelector('.zero-negative').checked;

            if (megaCodeInput && ipeaCodeSelect) {
                megaMapping.push({
                    megaCode: parseInt(megaCodeInput),
                    description: descriptionInput,
                    ipeaCode: ipeaCodeSelect,
                    zeroIfNegative: zeroIfNegativeInput
                });
            }
        });

        const payload = {
            apiUrl: document.getElementById('apiUrl').value,
            authUrl: document.getElementById('authUrl').value,
            apiUser: document.getElementById('apiUser').value,
            apiPassword: document.getElementById('apiPassword').value, // Envia vazio caso não digitado, backend lida com isso
            cronExpression: document.getElementById('cronExpression').value,
            active: document.getElementById('active').checked,
            megaMapping: megaMapping
        };

        try {
            const res = await fetch('/api/v1/integration/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
                showToast("Configurações atualizadas com sucesso!", "success");
                updateStatusBadge(payload.active);
                // Limpa campo da senha
                document.getElementById('apiPassword').value = '';
            } else {
                throw new Error(data.message);
            }

        } catch (error) {
            showToast(error.message, "error");
        } finally {
            btnSave.innerText = originalText;
            btnSave.disabled = false;
        }
    }

    async function loadLogs() {
        try {
            const res = await fetch('/api/v1/integration/logs?limit=30');
            const data = await res.json();

            if (data.success) {
                renderLogs(data.data);
            }
        } catch (error) {
            console.error("Erro ao carregar logs:", error);
            logsTableBody.innerHTML = `<tr><td colspan="3" class="text-center" style="color:var(--danger)">Erro ao carregar histórico</td></tr>`;
        }
    }

    function renderLogs(logs) {
        if (!logs || logs.length === 0) {
            logsTableBody.innerHTML = `<tr><td colspan="3" class="text-center" style="color:var(--text-muted)">Nenhuma sincronização registrada.</td></tr>`;
            return;
        }

        logsTableBody.innerHTML = logs.map(log => {
            const dateStr = new Date(log.syncDate).toLocaleString('pt-BR');
            const isSuccess = log.status === 'Sucesso';

            let summary = log.message;
            let details = '';

            try {
                const parsed = JSON.parse(log.message);
                if (parsed && parsed.summary) {
                    summary = parsed.summary;
                    details = parsed.details;
                }
            } catch (e) {
                // Log em formato antigo (texto puro), mantém apenas o summary
            }

            return `
                <tr class="log-row" style="cursor: pointer; transition: background 0.2s;" onclick="this.nextElementSibling.classList.toggle('hidden')">
                    <td style="white-space: nowrap">${dateStr}</td>
                    <td>
                        <span class="status-indicator">
                            <span class="status-dot ${isSuccess ? 'dot-success' : 'dot-error'}"></span>
                            ${log.status}
                        </span>
                    </td>
                    <td style="word-break: break-word">${summary}</td>
                </tr>
                <tr class="log-details hidden">
                    <td colspan="3" style="background: rgba(0, 0, 0, 0.2); border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <div style="padding: 1rem;">
                            <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; margin-bottom: 0.5rem; display: block;">Resposta Bruta da API:</span>
                            <pre style="white-space: pre-wrap; word-break: break-all; font-size: 0.8rem; color: #cbd5e1; margin: 0; font-family: monospace;">${details}</pre>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function updateStatusBadge(isActive) {
        if (isActive) {
            statusBadge.textContent = 'Status: Ativo';
            statusBadge.className = 'badge success';
        } else {
            statusBadge.textContent = 'Status: Inativo';
            statusBadge.className = 'badge inactive';
        }
    }

    function showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    function createMappingRow(data = null) {
        const row = document.createElement('div');
        row.className = 'mapping-row';
        row.style.cssText = 'display: flex; gap: 10px; align-items: flex-end; padding: 10px; background: rgba(255, 255, 255, 0.05); border-radius: 8px; border: 1px solid var(--border-glass);';

        const megaCode = data ? data.megaCode : '';
        const description = data && data.description ? data.description : '';
        const ipeaCode = data ? data.ipeaCode : 'IPCA';
        const isZeroChecked = data && data.zeroIfNegative ? 'checked' : '';

        // Template da linha
        row.innerHTML = `
            <div class="form-group" style="margin-bottom:0; flex: 1">
                <label style="font-size: 0.8rem">Cod. Índice ERP Mega</label>
                <input type="number" class="mega-code" placeholder="Ex: 15" value="${megaCode}" required>
            </div>
            <div class="form-group" style="margin-bottom:0; flex: 1.5">
                <label style="font-size: 0.8rem">Descrição</label>
                <input type="text" class="mapping-description" placeholder="Ex: IPCA Acumulado" value="${description}">
            </div>
            <div class="form-group" style="margin-bottom:0; flex: 1.5">
                <label style="font-size: 0.8rem">Índice Ipeadata</label>
                <select class="ipea-code" style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-glass); background: rgba(30, 41, 59, 0.5); color: #fff; font-size: 1rem;">
                    <option value="IPCA" ${ipeaCode === 'IPCA' ? 'selected' : ''}>IPCA Mensal</option>
                    <option value="IGPM" ${ipeaCode === 'IGPM' ? 'selected' : ''}>IGP-M Mensal</option>
                    <option value="INCC" ${ipeaCode === 'INCC' ? 'selected' : ''}>INCC Mensal</option>
                    <option value="IPCA12" ${ipeaCode === 'IPCA12' ? 'selected' : ''}>IPCA Acumulado 12m</option>
                    <option value="IGPM12" ${ipeaCode === 'IGPM12' ? 'selected' : ''}>IGP-M Acumulado 12m</option>
                    <option value="INCC12" ${ipeaCode === 'INCC12' ? 'selected' : ''}>INCC Acumulado 12m</option>
                </select>
            </div>
            <div class="form-group checkbox-group" style="margin-bottom:0; flex: 2; display: flex; align-items: center; justify-content: center;">
                <label class="switch" style="transform: scale(0.8)">
                    <input type="checkbox" class="zero-negative" ${isZeroChecked}>
                    <span class="slider round"></span>
                </label>
                <span class="toggle-label" style="font-size: 0.8rem; margin-left: 5px;">Informar 0 caso índice negativo</span>
            </div>
            <button type="button" class="btn btn-icon btn-remove-row" style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); padding: 0.6rem; border-radius: 6px; cursor: pointer;">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
        `;

        // Evento para remover linha localmente
        row.querySelector('.btn-remove-row').addEventListener('click', () => {
            row.remove();
        });

        mappingContainer.appendChild(row);
    }
});
