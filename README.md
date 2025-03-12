# Request Sender

Uma aplicação Node.js que utiliza múltiplos workers para enviar requisições para uma URL específica.

## Funcionalidades

- Utiliza o módulo `cluster` do Node.js para criar múltiplos workers
- Cada worker envia requisições continuamente para a URL alvo
- Rotação aleatória de User-Agents para cada requisição
- Painel de estatísticas acessível via navegador
- Configurável através de variáveis de ambiente

## Variáveis de Ambiente

| Variável | Descrição | Valor Padrão |
|----------|-----------|--------------|
| `TARGET_URL` | URL alvo para enviar as requisições | https://detran.cadastro-online.org/api-cpf.php?cpf=61575264323 |
| `PORT` | Porta para o servidor HTTP de estatísticas | 8080 |
| `NUM_CLUSTERS` | Número de workers (processos) | Número de CPUs disponíveis |
| `WEB_CONCURRENCY` | Alternativa para NUM_CLUSTERS (compatibilidade com Heroku) | Número de CPUs disponíveis |
| `REQUEST_TIMEOUT` | Timeout para cada requisição (ms) | 10000 (10 segundos) |

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

2. Faça login no Heroku:
   ```
   heroku login
   ```

3. Crie um novo aplicativo no Heroku:
   ```
   heroku create
   ```

4. Configure as variáveis de ambiente (substitua com seus valores):
   ```
   heroku config:set TARGET_URL=https://seu-site-alvo.com/api
   heroku config:set NUM_CLUSTERS=4
   ```

5. Implante a aplicação:
   ```
   git push heroku main
   ```

6. Abra a aplicação:
   ```
   heroku open
   ```

## Uso Local

1. Instale as dependências:
   ```
   npm install
   ```

2. Configure as variáveis de ambiente (opcional):
   ```
   export TARGET_URL=https://seu-site-alvo.com/api
   export NUM_CLUSTERS=4
   ```

3. Inicie a aplicação:
   ```
   npm start
   ```

4. Acesse o painel de estatísticas em `http://localhost:8080`

## Observações

- Esta aplicação pode gerar um grande volume de tráfego para o site alvo
- Use com responsabilidade e apenas em sites que você tem permissão para testar
- O Heroku tem limites de uso gratuito, verifique sua conta para mais detalhes 