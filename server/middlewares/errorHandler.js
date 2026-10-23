export const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  let status = err.statusCode || 500;
  let message = err.message;

  if (err.code === 11000) {
    status = 409;
    message = "A record with this value already exists";
  } else if (err.name === "CastError") {
    status = 400;
    message = "Invalid ID";
  } else if (err.name === "ValidationError") {
    status = 400;
  } else if (err.name === "MulterError") {
  status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
  message = err.code === "LIMIT_FILE_SIZE" ? "File is too large (maximum 2 MB)" : "Invalid file upload";
  }

  if (status === 500) {
    console.error(err);
    message = "Internal server error";
  }
  res.status(status).json({ message });
};