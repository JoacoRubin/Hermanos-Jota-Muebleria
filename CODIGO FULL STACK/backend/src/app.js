import express from "express";
import productosRouter from "./routes/productos.routes.js";
import logger from "./middlewares/logger.js";
import { notFoundHandler, errorHandler } from "./middlewares/errorHandler.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(logger);
app.use(express.json());

// Servir archivos estáticos (imágenes)
app.use('/images', express.static('public/images'));

app.use("/api/productos", productosRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
