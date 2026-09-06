const { AppError } = require('../utils/errors');
const { errorResponse } = require('../utils/response');

function errorHandler(err, req, res, next) {
  // Operational App Errors
  if (err instanceof AppError) {
    return errorResponse(res, err.message, err.statusCode, err.details);
  }

  // Express JSON body parser SyntaxError
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return errorResponse(res, 'Malformed JSON payload in request body', 400);
  }

  // Joi Validation Errors
  if (err.isJoi) {
    const details = err.details ? err.details.map((d) => d.message) : [err.message];
    return errorResponse(res, 'Validation error', 400, details);
  }

  // MySQL specific errors
  if (err.code) {
    if (err.code === 'ER_DUP_ENTRY') {
      return errorResponse(res, 'A record with this unique identifier already exists', 409);
    }
    if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
      return errorResponse(res, 'Referenced parent record does not exist', 404);
    }
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
      return errorResponse(res, 'Cannot delete or modify record because it is referenced by other records', 400);
    }
    if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
      return errorResponse(res, 'Database check constraint violated', 400);
    }
  }

  // Unhandled / Internal Server Error
  console.error('[CRITICAL UNHANDLED ERROR]:', err);
  return errorResponse(
    res,
    process.env.NODE_ENV === 'development' ? err.message : 'An unexpected internal server error occurred',
    500
  );
}

module.exports = errorHandler;
