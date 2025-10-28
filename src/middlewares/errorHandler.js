export function notFoundHandler(req, res, _next) {
  res.status(404).json({ error: "Ruta no encontrada", path: req.originalUrl });
}

export function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  const message = err.message || "Error interno del servidor";
  console.error("ERROR:", { status, message });
  res.status(status).json({ error: message });
}
