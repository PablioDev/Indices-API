# API de Indicadores Financeiros (Ipeadata)

Esta é uma API Node.js desenvolvida para atuar como uma interface simplificada e limpa para os dados do Ipeadata. O objetivo é fornecer os dados dos principais indicadores financeiros brasileiros de forma rápida, formatada e acessível para o consumo por outras aplicações.

## 🚀 Funcionalidades

- **Mapeamento Simplificado**: Uso de siglas (como IPCA, IGPM, INCC) para não precisar decorar códigos complexos do Ipeadata.
- **Formatação Brasileira Nativa**: Todas as respostas trazem datas no formato `DD/MM/AAAA` e valores utilizando vírgula (`,`) como separador decimal.
- **Cálculo de Variação Mensal Nativo**: A série histórica já traz pré-calculada a variação percentual baseada no mês anterior.
- **Filtros Flexíveis**: Busque a variação de um mês específico ou um recorte histórico informando ano e mês.
- **Interface de Testes**: Um dashboard web (`/`) para testar todos os endpoints de forma visual.
- **Painel Administrativo**: Interface avançada de logs e parâmetros embutida na API.
- **Documentação com Swagger**: Especificação OpenAPI 3.0 interativa disponível.

---

## 🖥️ Painel Administrativo Integrado

A API já acompanha uma interface administrativa interna para gerenciamento da integração com o ERP Mega.

- **URL Padrão**: `http://localhost:9137/admin.html`
- **Acesso protegido**: o painel e as rotas `/api/v1/integration/*` exigem login (HTTP Basic). Defina `ADMIN_USER` e `ADMIN_PASSWORD` no `.env`; sem essas variáveis o painel fica bloqueado.
- **Configurações Dinâmicas**: Definição da URL do Mega, usuário, cron fields (dias/horas de execução automática) e senhas pela tela.
- **De-Para Visual**: Relacionamento nativo de códigos do Mega (ex: `15`) com a respectiva base governamental (ex: `IPCA`).
- **Histórico de Execuções e Filtros**: Tela de logs com suporte a pesquisa por período de datas (DD/MM/AAAA), seleção flexível de quantidade (limitador) e até buscas diretas por Status (`Sucesso`, `Atenção`, `Erro`, `Aviso`).

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

3. Crie um arquivo `.env` na raiz:
```env
PORT=9137
HOST=localhost
ADMIN_USER=admin
ADMIN_PASSWORD=troque-esta-senha
```

4. Inicie o servidor:
```bash
npm run dev
```

5. Acesse:
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
