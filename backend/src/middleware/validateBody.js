export function validateBody(schema) {
  return (request, response, next) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      return response.status(400).json({
        message: "Request validation failed",
        errors: result.error.issues.map(({ path, message }) => ({ path: path.join("."), message })),
      });
    }

    request.validatedBody = result.data;
    return next();
  };
}
