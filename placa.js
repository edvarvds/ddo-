const cluster = require('cluster');
const os = require('os');
const fetch = require('node-fetch');

// Configuration
const numCPUs = Math.max(2, os.cpus().length); // Use at least 2 workers, but not more than available CPUs
const url = 'https://detran.cadastro-online.org/api-placa.php?plate=NYK2793';
const requestTimeout = 5000; // 5 seconds timeout for each request
const minDelayBetweenRequests = 500; // Minimum 500ms between requests from each worker
const maxRetries = 3; // Maximum number of retries for failed requests
const maxBackoff = 10000; // Maximum backoff time in milliseconds

// Counter for requests
let requestCount = 0;
let successCount = 0;
let failureCount = 0;
const startTime = Date.now();

// Function to log statistics
function logStats() {
  const elapsedSeconds = (Date.now() - startTime) / 1000;
  const requestsPerSecond = requestCount / elapsedSeconds;
  console.log(`Total requests: ${requestCount} (${successCount} success, ${failureCount} failed) | ` +
    `Requests/second: ${requestsPerSecond.toFixed(2)} | Active workers: ${Object.keys(cluster.workers).length}`);
}

if (cluster.isMaster) {
  console.log(`Master process ${process.pid} is running`);
  console.log(`Starting ${numCPUs} workers...`);
  console.log(`Total CPU cores: ${os.cpus().length}`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
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

  // Calculate delay based on retry count (exponential backoff)
  function getBackoffDelay(retryCount) {
    const delay = Math.min(
      maxBackoff,
      minDelayBetweenRequests * Math.pow(2, retryCount)
    );
    // Add some jitter to prevent all workers from retrying at the same time
    return delay + Math.random() * 500;
  }

  async function makeRequest(retryCount = 0) {
    try {
      // Add timeout to fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), requestTimeout);
      
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      clearTimeout(timeoutId);
      
      const data = await response.text();
      console.log(`Worker ${process.pid} received: ${data.trim()}`);
      
      // Notify master about completed request
      process.send({ count: 1, success: true });
      
      // Continue making requests with a delay
      setTimeout(makeRequest, minDelayBetweenRequests);
    } catch (error) {
      console.error(`Worker ${process.pid} error: ${error.message}`);
      
      // Notify master about failed request
      process.send({ count: 1, success: false });
      
      // Retry with exponential backoff if not exceeded max retries
      if (retryCount < maxRetries) {
        const backoffDelay = getBackoffDelay(retryCount);
        console.log(`Worker ${process.pid} retrying in ${Math.round(backoffDelay)}ms (retry ${retryCount + 1}/${maxRetries})`);
        setTimeout(() => makeRequest(retryCount + 1), backoffDelay);
      } else {
        // Continue making requests with a delay after max retries
        setTimeout(makeRequest, minDelayBetweenRequests);
      }
    }
  }

  // Start making requests
  makeRequest();
} 