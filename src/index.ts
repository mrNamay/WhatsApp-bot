import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import serverless from 'serverless-http';
import { connectDB } from './db';
import rootRouter from './routes';
import { setupSwagger } from './swaggerConfig';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Initialize Swagger before routes
setupSwagger(app);

// Use main router
app.use("/", rootRouter);

(async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined");
    }
    await connectDB(process.env.MONGODB_URI);
    console.log("Connected to database");
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
})();

// Start server only in a non-serverless environment
if (process.env.NODE_ENV !== "serverless") {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

export default serverless(app);
