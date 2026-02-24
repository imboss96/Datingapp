/**
 * Error handling middleware for Express
 * This middleware should be used at the end of all other middleware/routes
 */

export class APIError extends Error {
  constructor(message, status = 500, details = {}) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/**
 * Main error handler middleware
 * Must be used as: app.use(errorHandler)
 */
export const errorHandler = (err, req, res, next) => {
  // Default error properties
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details || {};

  // Handle specific error types
  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation Error';
    details = { 
      fields: Object.keys(err.errors).reduce((acc, field) => {
        acc[field] = err.errors[field].message;
        return acc;
      }, {})
    };
  } else if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    if (err.code === 11000) {
      status = 409;
      message = 'Duplicate Entry';
      const field = Object.keys(err.keyPattern)[0];
      details = { field, value: err.keyValue[field] };
    } else {
      status = 500;
      message = 'Database Error';
      details = { code: err.code };
    }
  } else if (err.name === 'JsonWebTokenError') {
    status = 401;
    message = 'Invalid Token';
  } else if (err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Token Expired';
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid ID Format';
  }

  // Log error with details
  const logLevel = status >= 500 ? 'error' : 'warn';
  console[logLevel](`[${req.method} ${req.path}] Status: ${status}`, {
    message,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.userId || 'anonymous',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });

  // Send response
  res.status(status).json({
    success: false,
    error: {
      message,
      status,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: err.stack,
        raw: err.toString()
      }),
      ...(Object.keys(details).length > 0 && { details })
    },
    timestamp: new Date().toISOString()
  });
};

/**
 * Validation error formatting
 */
export const formatValidationError = (fields) => {
  return new APIError('Validation Error', 400, { fields });
};

/**
 * Async route wrapper to catch errors
 * Usage: router.get('/route', catchAsync(async (req, res) => { ... }))
 */
export const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 handler - should be added after all routes
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route Not Found',
      status: 404,
      path: req.originalUrl,
      method: req.method
    },
    timestamp: new Date().toISOString()
  });
};

/**
 * Request validation middleware
 */
export const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const fields = error.details.reduce((acc, detail) => {
        acc[detail.path.join('.')] = detail.message;
        return acc;
      }, {});

      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation Error',
          status: 400,
          details: { fields }
        },
        timestamp: new Date().toISOString()
      });
    }

    req.body = value;
    next();
  };
};

/**
 * Rate limiting error handler
 */
export const rateLimitErrorHandler = (req, res, next) => {
  return res.status(429).json({
    success: false,
    error: {
      message: 'Too Many Requests',
      status: 429,
      retryAfter: req.rateLimit?.resetTime ? 
        new Date(req.rateLimit.resetTime * 1000).toISOString() : 
        null
    },
    timestamp: new Date().toISOString()
  });
};
