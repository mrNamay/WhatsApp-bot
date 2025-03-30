import swaggerJSDoc from "swagger-jsdoc";
import { Express } from "express";
import swaggerUi from "swagger-ui-express";

// Define Swagger options
const options: swaggerJSDoc.Options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Your API",
            version: "1.0.0",
            description: "API documentation using Swagger",
        },
        servers: [
            {
                url: "/",
            },
        ],
    },
    apis: ["./src/routes/*.ts"], // Path to your route files
};

// Initialize Swagger docs
const swaggerSpec = swaggerJSDoc(options);

// Function to setup Swagger in Express
export function setupSwagger(app: Express) {
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    console.log("Swagger docs available at /api-docs");
}
