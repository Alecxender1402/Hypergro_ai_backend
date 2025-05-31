const express = require("express");
const connectDB = require("./config/db");
const { connectRedis, disconnectRedis } = require("./config/redis"); // Add this line
const cors = require("cors");
const app = express();
const userRoutes = require("./routes/userRoutes");
const propertyRoutes = require('./routes/propertyRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const insertPropertiesFromCSV = require("./config/insertiondata");
const diagnosticsRoutes = require('./routes/diagnosticsRoutes');

app.use(express.json());
app.use(cors());

app.use('/api/favorites', favoriteRoutes);
app.use('/api/auth', userRoutes);
app.use('/api/recommendations', require('./routes/recommendationRoutes'));
app.use('/api/properties', propertyRoutes);
app.use('/api/diagnostics', diagnosticsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date() });
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
