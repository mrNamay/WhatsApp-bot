import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { connectDB } from './db';
import rootRouter from './routes';
import { setupSwagger } from './swaggerConfig';

connectDB(process.env.MONGODB_URI!).catch(console.error);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

setupSwagger(app)

app.use("/", rootRouter)


app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});