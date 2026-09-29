// Mapeamento único dos indicadores suportados (usado pela API pública e pela integração com o Mega).
// isIndexNumber: a série do Ipeadata é um número-índice; a variação mensal é calculada como ((atual / anterior) - 1) * 100.
// Séries sem essa flag já vêm em % a.m. e são repassadas como estão.
const mainIndicators = [
    { id: 'IPCA', code: 'PRECOS12_IPCAG12', description: 'Índice Nacional de Preços ao Consumidor Amplo (IPCA) - variação % mensal', isIndexNumber: false },
    { id: 'IGPM', code: 'IGP12_IGPMG12', description: 'Índice Geral de Preços - Mercado (IGP-M) - variação % mensal', isIndexNumber: false },
    { id: 'INCC', code: 'IGP12_INCCG12', description: 'Índice Nacional de Custo da Construção (INCC-DI) - variação % mensal', isIndexNumber: false },

    { id: 'IPCA12', code: 'PRECOS12_IPCA12', description: 'IPCA - variação mensal calculada a partir do número-índice (dez. 1993 = 100)', isIndexNumber: true },
    { id: 'IGPM12', code: 'IGP12_IGPM12', description: 'IGP-M - variação mensal calculada a partir do número-índice (ago. 1994 = 100)', isIndexNumber: true },
    { id: 'INCC12', code: 'IGP12_INCC12', description: 'INCC-DI - variação mensal calculada a partir do número-índice (ago. 1994 = 100)', isIndexNumber: true }
];

const findIndicator = (id) => {
    if (!id) return undefined;
    const upper = String(id).toUpperCase();
    return mainIndicators.find(ind => ind.id === upper);
};

module.exports = {
    mainIndicators,
    findIndicator
};
