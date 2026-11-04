
import swaggerJsdoc from "swagger-jsdoc";
import path from "path";
import { fileURLToPath } from "url";



const options = {
  definition: {
    openapi: "3.0.0",

    info: {
      title: "TicketRush API",
      version: "1.0.0",
      description: "TicketRush Backend API Documentation",
    },

    servers: [
      {
        url: "http://localhost:5000/api",
      },
    ],
  },

  apis: ["C:/TicketRush/routes/**/*.js"]
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
