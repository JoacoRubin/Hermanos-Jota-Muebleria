import express from "express";
import cors from "cors";
import productosRouter from "./routes/productos.routes.js";
import logger from "./middlewares/logger.js";
import { notFoundHandler, errorHandler } from "./middlewares/errorHandler.js";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(logger);
app.use(express.json());


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


app.use('/images', express.static(path.join(__dirname, '../public/images')));

// Servir archivos estáticos (imágenes)
//app.use('/images', express.static('public/images'));

app.use("/api/productos", productosRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
