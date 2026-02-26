# API de Indicadores Financeiros (Ipeadata)

Esta é uma API Node.js desenvolvida para atuar como uma interface simplificada e limpa para os dados do Ipeadata. O objetivo é fornecer os dados dos principais indicadores financeiros brasileiros de forma rápida, formatada e acessível para o consumo por outras aplicações.

## 🚀 Funcionalidades

- **Mapeamento Simplificado**: Uso de siglas (como IPCA, IGPM, INCC) para não precisar decorar códigos complexos do Ipeadata.
- **Formatação Brasileira Nativa**: Todas as respostas trazem datas no formato `DD/MM/AAAA` e valores utilizando vírgula (`,`) como separador decimal.
- **Cálculo de Variação Mensal Nativo**: A série histórica já traz pré-calculada a variação percentual baseada no mês anterior.
- **Filtros Flexíveis**: Busque a variação de um mês específico ou um recorte histórico informando ano e mês.
- **Interface Gráfica de Teste**: Um dashboard embutido para testar todos os endpoints de forma visual.
- **Documentação com Swagger**: Especificação OpenAPI 3.0 interativa disponível.

---

## 🛠️ Tecnologias Utilizadas

- **Node.js** com **Express**
- **Axios** (para realizar as integrações com a API governamental OData)
- **Swagger UI Express** (para a interface de documentação da API)
- Frontend de testes servido nativamente via `express.static`

---

## 📦 Como Instalar e Rodar Localmente

1. Clone este repositório:
```bash
git clone https://github.com/PablioLuiguedaCruzBi/Indices-API.git
cd Indices-API
```

2. Instale as dependências:
```bash
npm install
```

3. Inicie o servidor:
```bash
npm run dev
```

4. Acesse:
- **Painel de Testes Interativo**: [http://localhost:9137/](http://localhost:9137/)
- **Documentação Swagger**: [http://localhost:9137/api-docs/](http://localhost:9137/api-docs/)

---

## 📄 Endpoints Principais

### 1. Listar Indicadores Configuradas
`GET /api/v1/indicators`
Retorna todos os indicadores que esta API possui mapeados nativamente, permitindo o descobrimento dos IDs aceitos.

### 2. Buscar Variação de um Mês Específico
`GET /api/v1/indicators/consulta_indice_variacao_mensal`

**Parâmetros (Query):**
- `indice` (Obrigatório): Sigla do índice (ex: `IPCA`, `IGPM`, `INCC`).
- `ano` (Obrigatório): Ano consultado (ex: `2024`).
- `mes` (Obrigatório): Mês consultado (ex: `01`).

### 3. Consultar Série Histórica
`GET /api/v1/indicators/consulta_indice_serie_historica`
Busca a série completa e calcula a variação mensal de forma fluida: `(mês atual / mês anterior - 1) * 100`.

**Parâmetros (Query):**
- `indice` (Obrigatório): Sigla da série desejada (ex: `IPCA12`, `IGPM12`, `INCC12`).
- `ano` (Opcional): Filtra apenas os dados a partir de um ano específico.
- `mes` (Opcional): Filtra usando este mês como restrição adicional ao ano.

---

## 💡 Sobre os Dados Base

Os dados em tempo real são consumidos de forma transparente a partir do hub de OData Oficial do Governo (http://www.ipeadata.gov.br/). Este projeto não é afiliado ao Ipea e serve apenas como uma interface de consumo livre.
