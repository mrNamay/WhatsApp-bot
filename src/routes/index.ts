import express from 'express';
import dataRouter from './data';
import bodyParser from 'body-parser';
import webhookRouter from './webhook';

const rootRouter = express.Router()

/**
 * @swagger
 * /:
 *   get:
 *     summary: Welcome message
 *     tags:
 *       - Root
 *     description: Returns a simple welcome message.
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: Hello TypeScript!
 */
rootRouter.get('/', (req, res) => {
    res.send('Hello TypeScript!');
});
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     tags:
 *       - Root
 *     description: Returns the health status of the API.
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 */
rootRouter.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
rootRouter.use('/api/data', dataRouter);
rootRouter.use('/webhook', bodyParser.urlencoded({ extended: false }), webhookRouter);


export default rootRouter
