import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGODB_URI!;

async function run() {
    try {
        await mongoose.connect(uri);
        const collection = mongoose.connection.db?.collection("datas");
        // define your Atlas Vector Search index
        const index = {
            name: "vector_index",
            type: "vectorSearch",
            definition: {
                "fields": [
                    {
                        "type": "vector",
                        "numDimensions": 1536,
                        "path": "embedding",
                        "similarity": "cosine",
                        "quantization": "scalar"
                    }
                ]
            }
        }
        if (!collection) throw new Error("Collection not found");
        // run the helper method
        const result = await collection.createSearchIndex(index);
        console.log(`New search index named ${result} is building.`);

        // wait for the index to be ready to query
        console.log("Polling to check if the index is ready. This may take up to a minute.")
        let isQueryable = false;
        while (!isQueryable) {
            const cursor = collection.listSearchIndexes();
            for await (const index of cursor) {
                if (index.name === result) {
                    if ((index as any).definition?.queryable) {
                        console.log(`${result} is ready for querying.`);
                        isQueryable = true;
                    } else {
                        await new Promise(resolve => setTimeout(resolve, 5000));
                    }
                }
            }
        }
    } finally {
        await mongoose.connection.close();
    }
}

run().catch(console.error);