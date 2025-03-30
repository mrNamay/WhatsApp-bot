import { Data } from '../models/data';
import { OpenAIEmbeddings } from '@langchain/openai';

export class DataService {
    private embeddings = new OpenAIEmbeddings({
        model: "text-embedding-3-small",
        dimensions: 1536
    });

    async createEmbeddings(embedding: string) {
        return await this.embeddings.embedQuery(embedding);
    }

    // Add data with embeddings
    async addData(items: { query: string; answer: string }[]) {
        const docs = await Promise.all(items.map(async (item) => {
            const embedding = await this.embeddings.embedQuery(item.query);
            return {
                query: item.query,
                answer: item.answer,
                embedding
            };
        }));

        return Data.insertMany(docs);
    }

    // Remove data by IDs
    async removeData(ids: string[]) {
        return Data.deleteMany({ _id: { $in: ids } });
    }

    // Get paginated data with filters
    async getData({
        page = 1,
        limit = 10,
        search,
        filter = {}
    }: {
        page?: number;
        limit?: number;
        search?: string;
        filter?: Record<string, any>;
    }) {
        const query: any = { ...filter };

        if (search) {
            query.query = { $regex: search, $options: 'i' };
        }

        const [results, total] = await Promise.all([
            Data.find(query, { _id: 1, query: 1, answer: 1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Data.countDocuments(query)
        ]);

        return {
            results,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };
    }

    // Similarity search using embeddings
    async similaritySearch(embedding: number[], k = 5) {
        const results = await Data.aggregate([
            {
                $vectorSearch: {
                    queryVector: embedding, // The query vector
                    path: "embedding", // The field where vectors are stored
                    numCandidates: 100, // The number of candidates for refining
                    limit: k, // Number of final results
                    index: "vector_index" // Ensure this matches your actual index name
                }
            },
            { $project: { query: 1, answer: 1, _id: 1 } } // Select only relevant fields
        ]);

        return results;
    }
}

export const dataService = new DataService();