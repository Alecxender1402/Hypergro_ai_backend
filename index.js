const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { connectRedis, disconnectRedis } = require("./config/redis"); 
const app = express();
const userRoutes = require("./routes/userRoutes");
const propertyRoutes = require('./routes/propertyRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const insertPropertiesFromCSV = require("./config/insertiondata");
const diagnosticsRoutes = require('./routes/diagnosticsRoutes');

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:8080',
    'http://localhost:5173',
    'https://www.abhibhingradiya.shop',
    'http://www.abhibhingradiya.shop',
    'https://hypergro-ai-backend1.onrender.com'
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

app.use('/api/favorites', favoriteRoutes);
app.use('/api/auth', userRoutes);
app.use('/api/recommendations', require('./routes/recommendationRoutes'));
app.use('/api/properties', propertyRoutes);
app.use('/api/diagnostics', diagnosticsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date() });
});

app.get('/', (req, res) => {
  res.status(200).send("Welcome to the Real Estate API");
});

// Server instance
let server;

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('MongoDB connected successfully');
    
    // Connect to Redis
    try {
      await connectRedis();
      console.log('Redis connected successfully');
    } catch (redisError) {
      console.error(`Redis setup failed: ${redisError.message}`);
      console.log('Continuing without Redis caching');
    }
    
    // Import sample data
    await insertPropertiesFromCSV("./resources/properties.csv");
    
    // Start the server
    server = app.listen(3000, () => {
      console.log("Server is running on http://localhost:3000");
    });
    
    // Handle graceful shutdown
    setupGracefulShutdown(server);
    
  } catch (err) {
    console.error("Server startup failed:", err);
    process.exit(1);
  }
}

// Graceful shutdown handler
function setupGracefulShutdown(server) {
  // Handle termination signals
  ['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach(signal => {
    process.on(signal, async () => {
      console.log(`\nReceived ${signal}, gracefully shutting down...`);
      
      // Close HTTP server
      server.close(() => {
        console.log('HTTP server closed.');
      });
      
      // Disconnect from Redis
      try {
        await disconnectRedis();
      } catch (err) {
        console.error('Error disconnecting from Redis:', err.message);
      }
      
      // Any other cleanup...
      
      console.log('Shutdown complete');
      process.exit(0);
    });
  });
}

startServer();
