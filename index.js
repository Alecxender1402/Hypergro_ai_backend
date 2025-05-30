const express = require("express");
const connectDB = require("./config/db");
const cors = require("cors");
const app = express();
const userRoutes = require("./routes/userRoutes");
const propertyRoutes = require('./routes/propertyRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const insertPropertiesFromCSV = require("./config/insertiondata");

app.use(express.json());
app.use(cors());

app.use('/api/favorites', favoriteRoutes);
app.use('/api/auth', userRoutes);
app.use('/api/recommendations', require('./routes/recommendationRoutes'));
app.use('/api/properties', propertyRoutes);

async function startServer() {
  try {
    await connectDB();

    await insertPropertiesFromCSV("./resources/properties.csv");
    
    app.listen(3000, () => {
      console.log("Server is running on http://localhost:3000");
    });
  } catch (err) {
    console.error("Server startup failed:", err);
    process.exit(1);
  }
}

startServer();
