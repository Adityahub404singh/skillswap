/**
 * Build a normal HTTP error understood by the Connect error handler.
 */
export function httpError(status, message, details) {
  const error = new Error(message);
  error.status = status;
  error.statusCode = status;
  if (details !== undefined) error.details = details;
  return error;
}

/**
 * Translate validation failures to 400 instead of leaking them as 500s.
 * This also covers Zod .parse() calls throughout the Connect router.
 */
export function connectErrorHandler(error, _req, res, _next) {
  if (res.headersSent) return;

  const isZodError =
    error?.name === 'ZodError' ||
    (Array.isArray(error?.issues) && error?.constructor?.name === 'ZodError');

  if (isZodError) {
    const details = error.issues.map((issue) => ({
      path: Array.isArray(issue.path) ? issue.path.join('.') : '',
      message: issue.message,
      code: issue.code,
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details,
    });
  }

  const status = Number(error?.statusCode || error?.status) || 500;
  const safeStatus = status >= 400 && status <= 599 ? status : 500;
  const message = safeStatus >= 500
    ? 'Internal server error'
    : (error?.message || 'Request failed');

  const payload = { success: false, error: message };
  if (error?.details !== undefined && safeStatus < 500) {
    payload.details = error.details;
  }

  return res.status(safeStatus).json(payload);
}
