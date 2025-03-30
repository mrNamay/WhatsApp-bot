import mongoose, { Schema } from "mongoose";

const dataSchema = new Schema({
    query: { type: String, required: true },
    answer: { type: String, required: true },
    embedding: { type: [Number], required: true } // Array of numbers for vector embeddings
});

export const Data = mongoose.model("Data", dataSchema);
