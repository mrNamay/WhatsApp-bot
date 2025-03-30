import express from 'express';
import { z } from "zod";
import { DataService } from '../services/dataService';

const dataRouter = express.Router();
const dataService = new DataService();

/**
 * @swagger
 * /api/data:
 *   get:
 *     summary: Retrieve data with optional filters
 *     tags:
 *       - Data
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of results per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *       - in: query
 *         name: filter
 *         schema:
 *           type: object
 *         description: Filter criteria
 *     responses:
 *       200:
 *         description: A list of data items
 */
dataRouter.get('/', async (req, res) => {
    const query = z.object({
        page: z.coerce.number().min(1).optional(),
        limit: z.coerce.number().min(1).max(100).optional(),
        search: z.string().optional(),
        filter: z.record(z.any()).optional(),
    }).parse(req.query);
    const results = await dataService.getData(query);
    res.json(results);
});

/**
 * @swagger
 * /api/data/add:
 *   post:
 *     summary: Add new data entries
 *     tags:
 *       - Data
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 query:
 *                   type: string
 *                 answer:
 *                   type: string
 *     responses:
 *       200:
 *         description: Data added successfully
 */
dataRouter.post('/add', async (req, res) => {
    const body = z.array(z.object({ query: z.string(), answer: z.string() })).parse(req.body);
    await dataService.addData(body);
    res.json({ status: 'ok' });
});

/**
 * @swagger
 * /api/data/search:
 *   get:
 *     summary: Perform a similarity search
 *     tags:
 *       - Data
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: Search query
 *       - in: query
 *         name: k
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 10
 *         description: Number of results to return (max 10)
 *     responses:
 *       200:
 *         description: Search results
 */
dataRouter.get('/search', async (req, res) => {
    const q = z.string().parse(req.query.q);
    const k = z.coerce.number().min(1).max(10).optional().parse(req.query.k);
    const results = await dataService.similaritySearch(
        await dataService.createEmbeddings(q),
        req.query.k ? parseInt(req.query.k as string) : 5
    );
    res.json(results);
});

/**
 * @swagger
 * /api/data/remove:
 *   post:
 *     summary: Remove data entries
 *     tags:
 *       - Data
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Data removed successfully
 */
dataRouter.post('/remove', async (req, res) => {
    const ids = z.array(z.string()).parse(req.body.ids);
    const result = await dataService.removeData(ids);
    res.json(result);
});

export default dataRouter;
