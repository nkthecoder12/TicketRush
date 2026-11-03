
import swaggerJsdoc from "swagger-jsdoc";
import path from "path";
import { fileURLToPath } from "url";

const routesPath = path
  .join(fileURLToPath(new URL("../routes/", import.meta.url)), "**", "*.js")
  .split(path.sep)
  .join("/");

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

  apis: [routesPath],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
