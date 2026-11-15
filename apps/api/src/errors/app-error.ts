export interface ErrorDetail {
  path: string;
  message: string;
}

/**
 * Base operational error class with stable machine code and HTTP status code.
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: ErrorDetail[];
  public readonly isOperational: boolean;

  constructor(
    code: string,
    message: string,
    status = 500,
    details?: ErrorDetail[],
    cause?: unknown,
    isOperational = true,
  ) {
    super(message, { cause });
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}
