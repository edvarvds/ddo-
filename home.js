// Carregar variáveis de ambiente do arquivo .env
require('dotenv').config();

const cluster = require('cluster');
const os = require('os');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { HttpsProxyAgent } = require('https-proxy-agent');

// Configuration
const NUM_CLUSTERS = 4; // Número fixo de workers
const BASE_URL = 'https://enccejainscricao.info/inscricao/quemroubarehgay.php';
const STATS_PORT = 3000;

// Estatísticas globais
let stats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  startTime: Date.now(),
  workerStats: {}
};

// Arrays for random header values
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPad; CPU OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.90 Mobile Safari/537.36'
];

const acceptLanguages = [
  'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  'pt-BR,pt;q=0.9,en;q=0.8',
  'pt-BR,pt;q=0.9',
  'pt-BR,pt;q=0.9,es;q=0.8',
  'pt-BR,pt;q=0.9,fr;q=0.8'
];

const platforms = [
  '"Windows"',
  '"macOS"',
  '"Linux"',
  '"Android"',
  '"iOS"'
];

// Proxy configuration
const proxyCredentials = {
  username: 'jxeauhzz',
  password: '57f579ad'
};

// Function to load proxies from file
const loadProxies = () => {
  try {
    const proxyPath = path.join(__dirname, 'proxy.txt');
    const fileContent = fs.readFileSync(proxyPath, 'utf8');
    return fileContent.split('\n')
      .filter(line => line.trim())
      .map(proxy => `http://${proxyCredentials.username}:${proxyCredentials.password}@${proxy}`);
  } catch (error) {
    console.error('Erro ao carregar proxies:', error);
    return [];
  }
};

// Function to get random item from array
const getRandomItem = (array) => array[Math.floor(Math.random() * array.length)];

// Function to get random delay between 5 and 15 seconds
const getRandomDelay = () => Math.floor(Math.random() * 10000) + 5000;

// Function to generate random UTM parameters
const generateUtmParams = () => {
  const sources = ['google', 'facebook', 'instagram', 'direct', 'organic'];
  const mediums = ['cpc', 'social', 'referral', 'organic'];
  const campaigns = ['brand', 'search', 'display', 'remarketing'];
  
  return {
    utm_source: getRandomItem(sources),
    utm_medium: getRandomItem(mediums),
    utm_campaign: getRandomItem(campaigns),
    utm_content: Math.random().toString(36).substring(7),
    utm_term: Math.random().toString(36).substring(7)
  };
};

// Function to generate random headers
const generateHeaders = () => {
  const userAgent = getRandomItem(userAgents);
  const acceptLang = getRandomItem(acceptLanguages);
  const platform = getRandomItem(platforms);
  
  return {
    'Host': 'enccejainscricao.info',
    'User-Agent': userAgent,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': acceptLang,
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
    'Sec-Ch-Ua-Platform': platform,
    'Sec-Ch-Ua-Mobile': userAgent.includes('Mobile') ? '?1' : '?0',
    'DNT': Math.random() > 0.5 ? '1' : '0'
  };
};

if (cluster.isPrimary) {
  console.log(`Master process ${process.pid} is running`);
  console.log(`Starting ${NUM_CLUSTERS} workers...`);
  console.log(`Total CPU cores: ${os.cpus().length}`);

  // Criar servidor de estatísticas
  const statsServer = http.createServer((req, res) => {
    if (req.url === '/stats') {
      const uptime = Math.floor((Date.now() - stats.startTime) / 1000);
      const requestsPerSecond = stats.totalRequests / uptime;
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        uptime: `${uptime} seconds`,
        totalRequests: stats.totalRequests,
        successfulRequests: stats.successfulRequests,
        failedRequests: stats.failedRequests,
        requestsPerSecond: requestsPerSecond.toFixed(2),
        workerStats: stats.workerStats
      }, null, 2));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  statsServer.listen(STATS_PORT, () => {
    console.log(`Stats server running on port ${STATS_PORT}`);
  });

  // Fork workers
  for (let i = 0; i < NUM_CLUSTERS; i++) {
    cluster.fork();
  }

  // Handle messages from workers
  Object.values(cluster.workers).forEach(worker => {
    worker.on('message', message => {
      if (message.type === 'stats') {
        stats.totalRequests++;
        if (message.success) {
          stats.successfulRequests++;
        } else {
          stats.failedRequests++;
        }

        // Atualizar estatísticas do worker
        if (!stats.workerStats[worker.id]) {
          stats.workerStats[worker.id] = {
            requests: 0,
            successful: 0,
            failed: 0
          };
        }
        stats.workerStats[worker.id].requests++;
        if (message.success) {
          stats.workerStats[worker.id].successful++;
        } else {
          stats.workerStats[worker.id].failed++;
        }
      }
    });
  });

  // Handle worker exit
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died with code ${code} and signal ${signal}. Restarting...`);
    const newWorker = cluster.fork();
    
    // Resetar estatísticas para o novo worker
    stats.workerStats[newWorker.id] = {
      requests: 0,
      successful: 0,
      failed: 0
    };
  });

  // Imprimir estatísticas a cada minuto
  setInterval(() => {
    const uptime = Math.floor((Date.now() - stats.startTime) / 1000);
    const requestsPerSecond = stats.totalRequests / uptime;
    
    console.log('\n--- Estatísticas ---');
    console.log(`Uptime: ${uptime} segundos`);
    console.log(`Total de requisições: ${stats.totalRequests}`);
    console.log(`Requisições com sucesso: ${stats.successfulRequests}`);
    console.log(`Requisições com falha: ${stats.failedRequests}`);
    console.log(`Requisições por segundo: ${requestsPerSecond.toFixed(2)}`);
    console.log('------------------\n');
  }, 60000);

} else {
  console.log(`Worker ${process.pid} started`);
  
  const proxies = loadProxies();
  console.log(`Carregados ${proxies.length} proxies`);
  let currentProxyIndex = 0;

  // Function to make a request
  async function makeHomeRequest() {
    try {
      // Generate UTM parameters
      const utmParams = generateUtmParams();
      const queryString = new URLSearchParams({
        cpf: '04805353961',
        ...utmParams
      }).toString();
      const url = `${BASE_URL}?${queryString}`;

      // Configuração do fetch com proxy
      const fetchOptions = {
        headers: generateHeaders(),
        timeout: 30000,
        redirect: 'follow'
      };

      // Adiciona proxy se disponível
      if (proxies.length > 0) {
        const proxy = proxies[currentProxyIndex];
        console.log(`Worker ${process.pid} usando proxy: ${proxy}`);
        fetchOptions.agent = new HttpsProxyAgent(proxy);
        currentProxyIndex = (currentProxyIndex + 1) % proxies.length;
      }

      console.log(`Worker ${process.pid} acessando: ${url}`);
      const response = await fetch(url, fetchOptions);
      
      // Enviar estatísticas para o processo principal
      process.send({ 
        type: 'stats', 
        success: response.status === 200 
      });

      console.log(`Worker ${process.pid} - Status: ${response.status}`);
      console.log('-------------------');

      // Aguarda um tempo aleatório antes da próxima requisição
      await new Promise(resolve => setTimeout(resolve, getRandomDelay()));
      return true;
    } catch (error) {
      console.error(`Worker ${process.pid} - Erro: ${error.message}`);
      // Enviar estatísticas para o processo principal
      process.send({ 
        type: 'stats', 
        success: false 
      });
      // Se houver erro, aumenta o delay antes da próxima requisição
      await new Promise(resolve => setTimeout(resolve, getRandomDelay() * 2));
      return false;
    }
  }

  // Start making requests
  async function processRequests() {
    while (true) {
      await makeHomeRequest();
    }
  }

  // Start processing
  processRequests();
} 