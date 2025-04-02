// Carregar variáveis de ambiente do arquivo .env
require('dotenv').config();

const cluster = require('cluster');
const os = require('os');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { HttpsProxyAgent } = require('https-proxy-agent');

// Configuration from environment variables
const statsPort = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || 'https://enccejainscricao.info/inscricao/api.php';
const NUM_CLUSTERS = parseInt(process.env.NUM_CLUSTERS || process.env.WEB_CONCURRENCY || os.cpus().length); // Number of worker processes
const requestTimeout = parseInt(process.env.REQUEST_TIMEOUT || '10000'); // 10 seconds timeout for each request

// Counter for requests
let requestCount = 0;
let successCount = 0;
let failureCount = 0;
const startTime = Date.now();

// Array to store queries from CSV
let queries = [];

// Function to load queries from CSV file
function loadQueriesFromCSV() {
  try {
    const csvPath = path.join(__dirname, 'xd.csv');
    const fileContent = fs.readFileSync(csvPath, 'utf8');
    
    // Split by lines and remove header
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');
    const header = lines[0];
    
    // Extract queries and remove dots
    queries = lines.slice(1).map(line => line.replace(/\./g, '').replace(/-/g, '').trim());
    
    console.log(`Loaded ${queries.length} queries from CSV file`);
    return queries;
  } catch (error) {
    console.error(`Error loading CSV file: ${error.message}`);
    return [];
  }
}

// Function to get a random query
function getRandomQuery() {
  if (queries.length === 0) {
    return '07419326100'; // Default fallback query
  }
  const randomIndex = Math.floor(Math.random() * queries.length);
  return queries[randomIndex];
}

// Function to log statistics
function logStats() {
  const elapsedSeconds = (Date.now() - startTime) / 1000;
  const requestsPerSecond = requestCount / elapsedSeconds;
  console.log(`Total requests: ${requestCount} (${successCount} success, ${failureCount} failed) | ` +
    `Requests/second: ${requestsPerSecond.toFixed(2)} | Active workers: ${Object.keys(cluster.workers).length}`);
}

if (cluster.isPrimary) {
  console.log(`Master process ${process.pid} is running`);
  console.log(`Starting ${NUM_CLUSTERS} workers...`);
  console.log(`Total CPU cores: ${os.cpus().length}`);
  console.log(`Base URL: ${BASE_URL}`);

  // Track statistics
  let totalRequests = 0;
  let successfulRequests = 0;
  let failedRequests = 0;
  let startTime = Date.now();

  // Load queries from CSV
  loadQueriesFromCSV();

  // Fork workers
  for (let i = 0; i < NUM_CLUSTERS; i++) {
    cluster.fork();
  }

  // Handle worker messages
  cluster.on('message', (worker, message) => {
    if (message.count) {
      totalRequests += message.count;
      if (message.success) {
        successfulRequests += message.count;
      } else {
        failedRequests += message.count;
      }
    }
  });

  // Handle worker exit
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died with code ${code}. Restarting...`);
    cluster.fork();
  });

  // Create stats server
  const statsServer = http.createServer((req, res) => {
    const uptime = (Date.now() - startTime) / 1000; // in seconds
    const requestsPerSecond = totalRequests / uptime;
    const activeWorkers = Object.keys(cluster.workers).length;

    const stats = `Total requests: ${totalRequests} (${successfulRequests} success, ${failedRequests} failed) | Requests/second: ${requestsPerSecond.toFixed(2)} | Active workers: ${activeWorkers}`;
    console.log(stats);

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(stats);
  });

  statsServer.listen(statsPort, () => {
    console.log(`Stats server running on port ${statsPort}`);
  });
} else if (cluster.isWorker) {
  console.log(`Worker ${process.pid} started`);
  
  let queries = [];
  
  // Arrays for random header values
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 OPR/108.0.0.0',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.90 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.90 Mobile Safari/537.36'
  ];

  const acceptLanguages = [
    'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'pt-BR,pt;q=0.9,en;q=0.8',
    'pt-BR,pt;q=0.9',
    'pt-BR,pt;q=0.9,es;q=0.8',
    'pt-BR,pt;q=0.9,fr;q=0.8',
    'pt-BR,pt;q=0.9,de;q=0.8',
    'pt-BR,pt;q=0.9,it;q=0.8',
    'pt-BR,pt;q=0.9,ja;q=0.8',
    'pt-BR,pt;q=0.9,zh;q=0.8',
    'pt-BR,pt;q=0.9,ru;q=0.8'
  ];

  const platforms = [
    '"macOS"',
    '"Windows"',
    '"Linux"',
    '"Android"',
    '"iOS"',
    '"Chrome OS"',
    '"Ubuntu"',
    '"Fedora"',
    '"Debian"',
    '"CentOS"'
  ];

  const browsers = [
    '"Chromium";v="133", "Not(A:Brand";v="99"',
    '"Chromium";v="133", "Google Chrome";v="133"',
    '"Chromium";v="133", "Microsoft Edge";v="133"',
    '"Firefox";v="123"',
    '"Safari";v="17.3"',
    '"Opera";v="119"',
    '"Chrome";v="133"',
    '"Firefox";v="123", "Gecko";v="20200101"',
    '"Safari";v="17.3", "WebKit";v="605.1.15"',
    '"Edge";v="133", "Chromium";v="133"'
  ];

  // Lista de proxies (você precisará adicionar seus próprios proxies aqui)
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

  const proxies = loadProxies();
  console.log(`Carregados ${proxies.length} proxies`);

  let currentProxyIndex = 0;

  // Function to get random item from array
  const getRandomItem = (array) => array[Math.floor(Math.random() * array.length)];

  // Function to get random delay between 3 and 8 seconds
  const getRandomDelay = () => Math.floor(Math.random() * 5000) + 3000;

  // Function to generate random headers
  const generateHeaders = () => {
    const userAgent = getRandomItem(userAgents);
    const acceptLang = getRandomItem(acceptLanguages);
    const platform = getRandomItem(platforms);
    const browser = getRandomItem(browsers);
    
    const headers = {
      'Host': 'enccejainscricao.info',
      'Cookie': '_fbp=fb.1.1743555698304.770986604317181072',
      'Sec-Ch-Ua-Platform': platform,
      'Accept-Language': acceptLang,
      'Sec-Ch-Ua': browser,
      'User-Agent': userAgent,
      'Sec-Ch-Ua-Mobile': userAgent.includes('Mobile') ? '?1' : '?0',
      'Accept': '*/*',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Dest': 'empty',
      'Referer': 'https://enccejainscricao.info/inscricao/index.html?utm_source=organicjLj67ec8be9f7645683b1483f88&utm_campaign=&utm_medium=&utm_content=&utm_term=&xcod=organicjLj67ec8be9f7645683b1483f88hQwK21wXxRhQwK21wXxRhQwK21wXxRhQwK21wXxR&sck=organicjLj67ec8be9f7645683b1483f88hQwK21wXxRhQwK21wXxRhQwK21wXxRhQwK21wXxR',
      'Accept-Encoding': 'gzip, deflate, br',
      'Priority': 'u=1, i',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'DNT': Math.random() > 0.5 ? '1' : '0',
      'Upgrade-Insecure-Requests': '1',
      'Connection': 'keep-alive'
    };

    // Adiciona X-Requested-With aleatoriamente
    if (Math.random() > 0.5) {
      headers['X-Requested-With'] = 'XMLHttpRequest';
    }

    return headers;
  };

  // Load queries from CSV file
  const loadQueries = () => {
    const csvPath = path.join(__dirname, 'xd.csv');
    const fileContent = fs.readFileSync(csvPath, 'utf8');
    queries = fileContent.split('\n')
      .filter(line => line.trim())
      .slice(1) // Skip header
      .map(line => line.replace(/\./g, '').replace(/-/g, '').trim());
    console.log(`Loaded ${queries.length} queries from CSV file`);
  };

  // Get a random query
  const getWorkerRandomQuery = () => {
    const index = Math.floor(Math.random() * queries.length);
    return queries[index];
  };

  // Function to make a request
  async function makeRequest(cpf) {
    try {
      const url = `https://enccejainscricao.info/inscricao/api.php?cpf=${cpf}`;
      
      // Configuração do fetch com proxy (se disponível)
      const fetchOptions = {
        headers: generateHeaders(),
        timeout: 15000, // Aumentado para 15 segundos
        redirect: 'follow'
      };

      // Adiciona proxy se disponível
      if (proxies.length > 0) {
        const proxy = proxies[currentProxyIndex];
        console.log(`Usando proxy: ${proxy}`);
        fetchOptions.agent = new HttpsProxyAgent(proxy);
        currentProxyIndex = (currentProxyIndex + 1) % proxies.length;
      }

      const response = await fetch(url, fetchOptions);
      
      // Verifica se a resposta é um redirecionamento
      if (response.redirected) {
        console.log(`CPF: ${cpf} | Redirecionamento detectado`);
        return false;
      }

      const data = await response.json();
      
      // Log the complete response for debugging
      console.log(`CPF: ${cpf}`);
      console.log('Status:', response.status);
      console.log('Headers:', response.headers);
      console.log('Resposta:', JSON.stringify(data, null, 2));
      
      if (data.error) {
        console.error(`CPF: ${cpf} | Erro da API: ${data.error}`);
        // Se houver erro, aumenta o delay antes da próxima requisição
        await new Promise(resolve => setTimeout(resolve, getRandomDelay() * 2));
        return false;
      }
      
      if (data.status === 200 && data.dadosBasicos) {
        console.log(`Nome: ${data.dadosBasicos.nome}`);
        console.log(`Sexo: ${data.dadosBasicos.sexo}`);
        console.log(`Data de Nascimento: ${data.dadosBasicos.nascimento}`);
        console.log('-------------------');
        return true;
      } else {
        console.error(`CPF: ${cpf} | Erro: Dados não encontrados`);
        return false;
      }
    } catch (error) {
      console.error(`CPF: ${cpf} | Erro: ${error.message}`);
      // Se houver erro de conexão, aumenta o delay antes da próxima requisição
      await new Promise(resolve => setTimeout(resolve, getRandomDelay() * 2));
      return false;
    }
  }

  // Load queries initially
  loadQueries();

  // Start making requests
  async function processQueries() {
    while (true) {
      try {
        const cpf = getWorkerRandomQuery();
        const success = await makeRequest(cpf);
        
        // Notify master about completed request
        process.send({ count: 1, success });
        
        // Add a random delay between requests (1-5 seconds)
        await new Promise(resolve => setTimeout(resolve, getRandomDelay()));
      } catch (error) {
        console.error('Error in worker:', error);
        // Add a longer delay before retrying
        await new Promise(resolve => setTimeout(resolve, getRandomDelay() * 2));
      }
    }
  }

  // Start processing
  processQueries();
}