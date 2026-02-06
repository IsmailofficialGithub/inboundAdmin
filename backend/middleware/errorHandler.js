/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('Unhandled error:', err)

  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal server error'

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}

/**
 * 404 handler for unknown routes
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` })
}

module.exports = { errorHandler, notFoundHandler }
