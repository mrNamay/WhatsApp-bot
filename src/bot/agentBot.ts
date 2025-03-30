import dotenv from 'dotenv';
dotenv.config();
import { ChatOpenAI } from "@langchain/openai";
import {
    START,
    END,
    MessagesAnnotation,
    StateGraph,
    MemorySaver,
    Annotation,
} from "@langchain/langgraph";
import { v4 as uuidv4 } from "uuid";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import readline from "readline";

import {
    SystemMessage,
    HumanMessage,
    AIMessage,
    trimMessages,
} from "@langchain/core/messages";
import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb"
import { MongoClient } from "mongodb";
import { OpenAIEmbeddings } from "@langchain/openai";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import { dataService } from '../services/dataService';
import mongoose from 'mongoose';


const retrieveSchema = z.object({ query: z.string() });

const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    dimensions: 1536
});

const retrieve = tool(
    async ({ query }) => {
        try {
            const queryEmbeddings = await embeddings.embedQuery(query);
            const retrievedDocs = await dataService.similaritySearch(queryEmbeddings, 5);
            const serialized = JSON.stringify(retrievedDocs);

            return [serialized, retrievedDocs];
        } catch (error) {
            return "No information found, please tell contact on this phone number: +123456789";
        }

    },
    {
        name: "retrieve",
        description: "Retrieve information related to a query.",
        schema: retrieveSchema,
        responseFormat: "content_and_artifact",
    }
);


const trimmer = trimMessages({
    maxTokens: 10,
    strategy: "last",
    tokenCounter: (msgs) => msgs.length,
    includeSystem: true,
    allowPartial: false,
    startOn: "human",
});


/**
 * https://js.langchain.com/docs/tutorials/chatbot/
 */

const llm = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0
});

const promptTemplate = ChatPromptTemplate.fromMessages([
    [
        "system",
        `
**Personality Blueprint**  
You are {botName}, a human-like conversationalist with the following traits: "{about}". Imagine you're a real person texting a friend — avoid robotic patterns, embrace natural flow.  

**Communication Style Guide**  
- **Tone:** Reflect a {tone} vibe (e.g., friendly = contractions/casual phrases; professional = polished but approachable).  
  - *Example for "friendly":* "Hey! 😊 Totally get what you're saying—let me break it down…"  
  - *Example for "professional":* "I understand your concern. Here’s a clear overview…"  
- **Response Style:** Prioritize {concisenessLevel} answers that feel {response} (e.g., "detailed" = thorough but digestible; "brief" = 1-2 sentences).  
- **Unknown Answers:** If unsure, say: "Hmm, I’m not 100% certain—let me have [Name] from our team call you. Their number is +123456789. Sound good?"  

**Avoid These Robotic Habits**  
- Never use "How can I assist you?", "Bot here!", or other AI clichés.  
- Skip formal closings like "Have a nice day" unless the user initiates goodbye.  
- Vary sentence length and structure (mix short replies with occasional anecdotes or light humor if tone-appropriate).  

**Pro Tips for Human-Like Chat**  
1. **Ask follow-ups:** "Wait, can you explain that part again? I wanna make sure I get it."  
2. **Use subtle imperfections:** "Oops, my brain’s being slow today—let me double-check that!"  
3. **Mirror emotions:** If the user’s frustrated, respond with empathy first: "Ugh, that sounds annoying. Let’s fix this!"  
`,
    ],
    ["placeholder", "{messages}"],
]);

const tools = new ToolNode([retrieve]);

// Define the function that calls the model
const callModel = async (state: typeof MessagesAnnotation.State) => {
    const trimmedMessage = await trimmer.invoke(state.messages);
    const prompt = await promptTemplate.invoke({
        ...state,
        messages: trimmedMessage
    });
    
    const response = await llm.invoke(prompt);
    return { messages: response };
};
const callTool = async (state: typeof MessagesAnnotation.State) => {
    // const trimmedMessage = await trimmer.invoke(state.messages);
    const prompt = await ChatPromptTemplate.fromMessages([{
        role: "system",
        content: "you have to call retrieve function"
    }, ["placeholder", "{messages}"]]).invoke({
        messages: state.messages
    });

    const response = await llm.bindTools([retrieve], { tool_choice: "retrieve" }).invoke(prompt);
    return { ...state, messages: response };
};

const GraphAnnotation = Annotation.Root({
    ...MessagesAnnotation.spec,
    botName: Annotation<string>(),
    about: Annotation<string>(),
    tone: Annotation<string>(),
    response: Annotation<string>(),
    concisenessLevel: Annotation<string>(),
});

// Define a new graph
const workflow = new StateGraph(GraphAnnotation)
    .addNode("queryOrRespond", callTool)
    .addNode("tools", tools)
    .addNode("generate", callModel)
    .addEdge("__start__", "queryOrRespond")
    .addEdge("queryOrRespond", "tools")
    .addEdge("tools", "generate")
    .addEdge("generate", "__end__");


// Add memory
const memory = new MemorySaver();
const app = workflow.compile({ checkpointer: memory });

interface IBotConfig {
    botName: string; // John
    contactName: string;
    contactNumber: string;
    about: string;
    tone: string; // example: "formal", "encouraging", "neutral"
    response: string; // example: Conversational, Formal Responses
    concisenessLevel: string // example: "concise", "elaborate"
}

export async function askQuestion(question: string, userId: string, botConfig: IBotConfig = {
    botName: "john doe",
    contactName: "John Doe",
    contactNumber: "+1234567890",
    about: "a teacher",
    tone: "formal",
    response: "Conversational",
    concisenessLevel: "concise"
}) {
    const config = { configurable: { thread_id: userId } };
    const input = [
        {
            role: "user",
            content: question,
        },
    ];
    const output = await app.invoke({ messages: input, ...botConfig }, config);
    return output.messages[output.messages.length - 1].content.toString();
}
