export function notFoundHandler(_request, response) {
  return response.status(404).json({ message: "Route not found" });
}

export function errorHandler(error, _request, response, _next) {
  const status =
    Number.isInteger(error.status) && error.status >= 400 && error.status < 500
      ? error.status
      : 500;
  if (status === 500) {
    console.error(error);
  }
  return response.status(status).json({
    message: status === 500 ? "Internal server error" : error.message,
  });
}
