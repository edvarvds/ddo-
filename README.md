# Request Sender

Uma aplicação Node.js que utiliza múltiplos workers para enviar requisições para uma URL específica, utilizando queries aleatórias de um arquivo CSV.

## Funcionalidades

- Utiliza o módulo `cluster` do Node.js para criar múltiplos workers
- Cada worker envia requisições continuamente para a URL alvo
- Lê queries de um arquivo CSV e as utiliza de forma aleatória
- Rotação aleatória de User-Agents para cada requisição
- Painel de estatísticas acessível via navegador
- Configurável através de variáveis de ambiente e arquivo .env

## Arquivo CSV de Queries

A aplicação lê o arquivo `xd.csv` na raiz do projeto, que deve conter uma coluna com as queries a serem utilizadas. O formato esperado é:

```
Documento do Comprador
047.068.197-76
042.635.725-64
...
```

A aplicação automaticamente:
- Remove os pontos e hífens das queries
- Seleciona queries aleatórias para cada requisição
- Cada worker utiliza uma seed aleatória diferente para a seleção de queries

## Variáveis de Ambiente

A aplicação utiliza o pacote `dotenv` para carregar variáveis de ambiente a partir de um arquivo `.env`. Você pode configurar as seguintes variáveis:

| Variável | Descrição | Valor Padrão |
|----------|-----------|--------------|
| `BASE_URL` | URL base para enviar as requisições (sem a query) | https://detran.cadastro-online.org/api-cpf.php?cpf= |
| `PORT` | Porta para o servidor HTTP de estatísticas | 8080 |
| `NUM_CLUSTERS` | Número de workers (processos) | Número de CPUs disponíveis |
| `WEB_CONCURRENCY` | Alternativa para NUM_CLUSTERS (compatibilidade com Heroku) | Número de CPUs disponíveis |
| `REQUEST_TIMEOUT` | Timeout para cada requisição (ms) | 10000 (10 segundos) |

## Arquivo .env

Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:

```
# Configurações da aplicação
PORT=8080
BASE_URL=https://detran.cadastro-online.org/api-cpf.php?cpf=
NUM_CLUSTERS=4
REQUEST_TIMEOUT=10000
```

## Implantação no Heroku

### Pré-requisitos

- Conta no Heroku
- [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) instalado

### Passos para implantação

1. Clone este repositório:
   ```
   git clone <url-do-repositorio>
   cd <nome-do-repositorio>
   ```

2. Certifique-se de que o arquivo `xd.csv` está na raiz do projeto

3. Faça login no Heroku:
   ```
   heroku login
   ```

4. Crie um novo aplicativo no Heroku:
   ```
   heroku create
   ```

5. Configure as variáveis de ambiente (substitua com seus valores):
   ```
   heroku config:set BASE_URL=https://seu-site-alvo.com/api?cpf=
   heroku config:set NUM_CLUSTERS=4
   ```

6. Implante a aplicação:
   ```
   git push heroku main
   ```

7. Abra a aplicação:
   ```
   heroku open
   ```

## Uso Local

1. Instale as dependências:
   ```
   npm install
   ```

2. Certifique-se de que o arquivo `xd.csv` está na raiz do projeto

3. Crie ou edite o arquivo `.env` na raiz do projeto (opcional):
   ```
   # Exemplo de arquivo .env
   BASE_URL=https://seu-site-alvo.com/api?cpf=
   NUM_CLUSTERS=4
   ```

4. Inicie a aplicação:
   ```
   npm start
   ```

5. Acesse o painel de estatísticas em `http://localhost:8080`

## Observações

- Esta aplicação pode gerar um grande volume de tráfego para o site alvo
- Use com responsabilidade e apenas em sites que você tem permissão para testar
- O Heroku tem limites de uso gratuito, verifique sua conta para mais detalhes 