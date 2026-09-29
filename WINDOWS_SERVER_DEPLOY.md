# Guia de Implantação no Windows Server - Integração IPEA x ERP Mega

Este documento contém as instruções de como instalar e configurar a API de forma definitiva em um ambiente Windows Server.

Existem duas abordagens para subir a aplicação:
A **Opção A** (Recomendada) utiliza o arquivo executável (`.exe`) pré-compilado, dispensando a instalação do Node.js no servidor destino.
A **Opção B** utiliza o código fonte original via gerenciador de processos PM2 (exige Node.js instalado).

---

## Preparação Comum (Firewall)
Independente do método escolhido, certifique-se de liberar a porta **9137** (ou a porta listada no arquivo `.env` caso seja alterada) no Firewall do Windows Server.

1. Abra o **Windows Defender Firewall with Advanced Security**.
2. Vá em **Inbound Rules** (Regras de Entrada) e clique em **New Rule** (Nova Regra).
3. Selecione **Port**, escolha **TCP** e defina os "Specific local ports" para `9137`.
4. Permita a conexão (Allow the connection).
5. Defina um nome (ex: `Indices API - Porta 9137`) e conclua.

---

## Opção A: Utilizando o Executável Standalone (Recomendado)
Esta opção é mais simples para ambientes de produção limpos, pois utiliza o arquivo `indices-api.exe` que já embute o código fonte, o Node.js v18 e as dependências (como os módulos de SQLite).

### 1. Preparação dos Arquivos
1. Crie uma pasta no servidor chamada, por exemplo, `C:\IndicesAPI`.
2. Pegue o arquivo gerado `indices-api.exe` da pasta `dist` deste projeto e copie para `C:\IndicesAPI`.
3. Na mesma pasta (`C:\IndicesAPI`), crie um arquivo chamado `.env` contendo:
   ```env
   PORT=9137
   HOST=localhost
   ADMIN_USER=admin
   ADMIN_PASSWORD=troque-esta-senha
   ```
   **Importante:** `ADMIN_USER` e `ADMIN_PASSWORD` são o login do painel administrativo (`/admin.html`). Sem eles o painel fica bloqueado.
   **Dica:** Ao alterar a porta no `.env`, o executável assumirá a nova porta ao iniciar!

### 2. Configurando como um Serviço do Windows com NSSM
Para que a API não morra se você fechar a tela de Prompt de Comando, e para que ela inicie automaticamente sempre que o servidor for reiniciado, usaremos o **NSSM** (Non-Sucking Service Manager).

1. Baixe o NSSM em [http://nssm.cc/download](http://nssm.cc/download) e extraia os arquivos.
2. Abra o Prompt de Comando (CMD) como Administrador e navegue até a pasta de extração (ex: `cd nssm-2.24\win64`).
3. Execute o comando para instalar o serviço na interface gráfica:
   ```cmd
   nssm install "IndicesAPIService"
   ```
4. A tela do NSSM abrirá. Configure da seguinte forma:
   - **Path**: Clique no botão "..." e selecione o seu `C:\IndicesAPI\indices-api.exe`.
   - **Directory**: `C:\IndicesAPI` (É aqui que a API procurará o seu arquivo `.env` e onde irá gerar fisicamente o banco de dados `database.sqlite` em SQLite aberto no próprio nível sem ser incluso no código).
5. (Opcional) Na aba "Details", você pode definir um "Display Name" amigável e uma descrição.
6. Clique em **Install service**.

### 3. Iniciar o Serviço
Agora você pode iniciar a API pelo Prompt:
```cmd
nssm start IndicesAPIService
```
Acesse `http://localhost:9137` (ou o IP do Servidor na porta correta) para validar que a tela do sistema está no ar!

---

## Opção B: Rodando o Código Fonte com PM2 (Requer Node.js)
Caso precise acessar/editar diretamente os scripts e prefira não usar o `.exe`, use o PM2.

1. Instale o [Node.js v18+](https://nodejs.org/) no Servidor Windows.
2. Instale o gerenciador de processos PM2 de forma global pelo CMD Administrador:
   ```cmd
   npm install -g pm2
   npm install -g pm2-windows-startup
   pm2-startup install
   ```
3. Copie todo o diretório do projeto para dentro do servidor (ex: `C:\IndicesAPI`).
4. Navegue até a pasta do projeto e instale as dependências caso ainda não existam:
   ```cmd
   cd C:\IndicesAPI
   npm install
   ```
5. Inicie a API avisando o PM2 sobre o nome:
   ```cmd
   pm2 start src/index.js --name "IndicesAPI"
   ```
6. Salve a lista atual de processos do PM2 para que eles voltem ao reiniciar o Servidor:
   ```cmd
   pm2 save
   ```

A API estará rodando nos fundos através do PM2.

## Solução de Problemas (Troubleshooting)

### Erro: `Can't open service! OpenService(): Access is denied.` no NSSM
O NSSM exige permissões administrativas para criar e gerenciar serviços do Windows.
**Solução**: Certifique-se de estar rodando o Prompt de Comando (CMD) ou PowerShell como **Administrador** (Run as administrator).

### Erro: `Unexpected status SERVICE_PAUSED in response to START control.`
O NSSM tentou iniciar a API, mas ela "morreu" (crashou) no exato momento da inicialização.
**Causas e Soluções**:
1. **O caminho Base do Aplicativo no NSSM não foi definido**: 
   - Abra o `nssm edit IndicesAPIService`.
   - Na aba **Application**, certifique-se de que o campo **Directory** aponta corretamente para a pasta raiz, ex: `C:\IndicesAPI`. Se ficar branco, o serviço vai falhar tentando gravar logs na pasta System32.
2. **Porta em uso**: A porta `9137` já está sendo usada por outro processo. Verifique se você não deixou uma janela do CMD rodando a API ou se há outro programa nesta porta.
3. **Debugando visualmente**: Na aba **I/O** do NSSM, preencha os campos `Output (stdout)` e `Error (stderr)` apontando para arquivos textuais (Ex: `C:\IndicesAPI\out.log` e `C:\IndicesAPI\err.log`). Salve, inicie de novo e abra esses logs para ler exatamente a linha do erro no script.

---

## Como funciona a arquitetura de banco de dados e arquivos
Por definição, **o banco de dados nunca é injetado ou embutido dentro do executável (`.exe`)**. 

Assim que a API é executada no Windows (no caminho que você configurou no `Directory` do NSSM), ela procura por um arquivo `.env` e lê as variáveis contidas lá dentro. Ao mesmo tempo, o ORM (SQLite) cria fisicamente um arquivo de banco de dados chamado `database.sqlite` abertamente, solto, **na mesma pasta que o executável**.

**Não apague o arquivo `database.sqlite`** sob nenhuma circunstância. Para realizar backups, você pode copiar esse arquivo. Se precisar alterar portas IP, basta abrir o `.env` com o Bloco de Notas, alterar e reiniciar o serviço no próprio Windows (NSSM).
