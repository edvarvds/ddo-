// Carregar variáveis de ambiente do arquivo .env
require('dotenv').config();

const cluster = require('cluster');
const os = require('os');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const http = require('http');

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
      const response = await fetch(url, {
        headers: {
          'Host': 'enccejainscricao.info',
          'Cookie': '_fbp=fb.1.1743555698304.770986604317181072',
          'Sec-Ch-Ua-Platform': '"macOS"',
          'Accept-Language': 'pt-BR,pt;q=0.9',
          'Sec-Ch-Ua': '"Chromium";v="133", "Not(A:Brand";v="99"',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
          'Sec-Ch-Ua-Mobile': '?0',
          'Accept': '*/*',
          'Sec-Fetch-Site': 'same-origin',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Dest': 'empty',
          'Referer': 'https://enccejainscricao.info/inscricao/index.html?utm_source=organicjLj67ec8be9f7645683b1483f88&utm_campaign=&utm_medium=&utm_content=&utm_term=&xcod=organicjLj67ec8be9f7645683b1483f88hQwK21wXxRhQwK21wXxRhQwK21wXxRhQwK21wXxR&sck=organicjLj67ec8be9f7645683b1483f88hQwK21wXxRhQwK21wXxRhQwK21wXxRhQwK21wXxR',
          'Accept-Encoding': 'gzip, deflate, br',
          'Priority': 'u=1, i'
        }
      });

      const data = await response.json();
      if (data.status === 200 && data.dadosBasicos) {
        console.log(`CPF: ${cpf}`);
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
        
        // Add a small delay between requests (500ms)
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error('Error in worker:', error);
        // Add a small delay before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  // Start processing
  processQueries();
}