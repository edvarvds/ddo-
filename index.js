// Carregar variáveis de ambiente do arquivo .env
require('dotenv').config();

const cluster = require('cluster');
const os = require('os');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Configuration from environment variables
const PORT = process.env.PORT || 8080;
const BASE_URL = process.env.BASE_URL || 'https://searchapi.dnnl.live/consulta';
const API_TOKEN = process.env.API_TOKEN || 'Th4scEP8zJxIEX02';
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
    return '61575264323'; // Default fallback query
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

// Simple HTTP server to keep the application alive and show stats
if (cluster.isMaster) {
  // Load queries from CSV
  loadQueriesFromCSV();
  
  const http = require('http');
  const server = http.createServer((req, res) => {
    const elapsedSeconds = (Date.now() - startTime) / 1000;
    const requestsPerSecond = requestCount / elapsedSeconds;
    
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <head><title>Request Stats</title></head>
        <body>
          <h1>Request Statistics</h1>
          <p>Base URL: ${BASE_URL}</p>
          <p>Total queries loaded: ${queries.length}</p>
          <p>Total requests: ${requestCount}</p>
          <p>Successful requests: ${successCount}</p>
          <p>Failed requests: ${failureCount}</p>
          <p>Requests per second: ${requestsPerSecond.toFixed(2)}</p>
          <p>Active workers: ${Object.keys(cluster.workers).length}</p>
          <p>Configured workers: ${NUM_CLUSTERS}</p>
          <p>Running since: ${new Date(startTime).toISOString()}</p>
          <p>Uptime: ${elapsedSeconds.toFixed(0)} seconds</p>
        </body>
      </html>
    `);
  });
  
  server.listen(PORT, () => {
    console.log(`Stats server running on port ${PORT}`);
  });
}

if (cluster.isMaster) {
  console.log(`Master process ${process.pid} is running`);
  console.log(`Starting ${NUM_CLUSTERS} workers...`);
  console.log(`Total CPU cores: ${os.cpus().length}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`API Token: ${API_TOKEN.substring(0, 4)}...${API_TOKEN.substring(API_TOKEN.length - 4)}`);

  // Fork workers
  for (let i = 0; i < NUM_CLUSTERS; i++) {
    cluster.fork();
  }

  // Log when a worker dies and fork a new one
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died with code ${code}. Restarting...`);
    cluster.fork();
  });

  // Collect statistics from workers
  Object.values(cluster.workers).forEach(worker => {
    worker.on('message', (msg) => {
      if (msg.count) {
        requestCount += msg.count;
        if (msg.success) {
          successCount += msg.count;
        } else {
          failureCount += msg.count;
        }
      }
    });
  });

  // Log statistics every second
  setInterval(logStats, 1000);

} else {
  // Worker process
  console.log(`Worker ${process.pid} started`);
  
  // Load queries in each worker
  const workerQueries = loadQueriesFromCSV();
  
  // Initialize with a random seed for this worker
  const workerSeed = Date.now() + process.pid;
  let lastQueryIndex = Math.floor(Math.random() * workerQueries.length);
  
  // Generate a random User-Agent
  function getRandomUserAgent() {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36 Edg/93.0.961.52',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36 OPR/79.0.4143.72',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:92.0) Gecko/20100101 Firefox/92.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15',
      'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:92.0) Gecko/20100101 Firefox/92.0'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }
  
  // Get a random query for this worker
  function getWorkerRandomQuery() {
    if (workerQueries.length === 0) {
      return '61575264323'; // Default fallback query
    }
    
    // Generate a new random index that's different from the last one
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * workerQueries.length);
    } while (newIndex === lastQueryIndex && workerQueries.length > 1);
    
    lastQueryIndex = newIndex;
    return workerQueries[newIndex];
  }

  async function makeRequest() {
    try {
      // Get a random query
      const query = getWorkerRandomQuery();
      const targetUrl = `${BASE_URL}?cpf=${query}&token_api=${API_TOKEN}`;
      
      // Add timeout to fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), requestTimeout);
      
      const response = await fetch(targetUrl, { 
        signal: controller.signal,
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://searchapi.dnnl.live/',
          'Connection': 'keep-alive'
        }
      });
      
      clearTimeout(timeoutId);
      
      const data = await response.text();
      console.log(`Worker ${process.pid} queried ${query}: ${data.trim().substring(0, 100)}...`);
      
      // Notify master about completed request
      process.send({ count: 1, success: true });
      
      // Continue making requests without delay
      setImmediate(makeRequest);
    } catch (error) {
      console.error(`Worker ${process.pid} error: ${error.message}`);
      
      // Notify master about failed request
      process.send({ count: 1, success: false });
      
      // Continue making requests even after an error
      setImmediate(makeRequest);
    }
  }

  // Start making requests
  makeRequest();
} 