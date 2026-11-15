import { AppError, type ErrorDetail } from "./app-error.js";

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: ErrorDetail[]) {
    super("VALIDATION_ERROR", message, 400, details);
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = "Authentication required") {
    super("UNAUTHENTICATED", message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Access forbidden") {
    super("FORBIDDEN", message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super("NOT_FOUND", message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource conflict") {
    super("CONFLICT", message, 409);
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = "Payload exceeds size limit") {
    super("PAYLOAD_TOO_LARGE", message, 413);
  }
}

export class UnsupportedMediaTypeError extends AppError {
  constructor(message = "Unsupported media type") {
    super("UNSUPPORTED_MEDIA_TYPE", message, 415);
  }
}

export class RateLimitedError extends AppError {
  constructor(message = "Too many requests. Please try again later.") {
    super("RATE_LIMITED", message, 429);
  }
}

export class UpstreamError extends AppError {
  constructor(message = "Upstream service failed") {
    super("UPSTREAM_ERROR", message, 502);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = "Service temporarily unavailable") {
    super("SERVICE_UNAVAILABLE", message, 503);
  }
}
