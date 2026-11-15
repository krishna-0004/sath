export interface ApiErrorDetail {
  path: string;
  message: string;
}

/**
 * Standard client error class holding parsed backend error envelope fields.
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: ApiErrorDetail[];
  public readonly requestId?: string;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: ApiErrorDetail[],
    requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

/**
 * Type guard to identify ApiError instances.
 */
export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

/**
 * Converts machine error codes or general errors into empathetic, plain-language sentences.
 * Never displays raw error codes or technical stack jargon to the elder or family.
 */
export function getErrorMessage(err: unknown): string {
  if (isApiError(err)) {
    switch (err.code) {
      case "NETWORK_ERROR":
      case "SERVER_UNAVAILABLE":
        return "We could not connect to the care service. Please check your internet or wait a moment while the server wakes up.";
      case "TIMEOUT":
        return "The request took longer than expected. Please try again.";
      case "OFFLINE":
        return "You appear to be offline. Please check your internet connection.";
      case "UNAUTHENTICATED":
        return "Your session has ended. Please sign in again to continue.";
      case "FORBIDDEN":
        return "You do not have permission to view or change this information.";
      case "NOT_FOUND":
        return "The requested record could not be found.";
      case "RATE_LIMITED":
        return "A large number of requests were made. Please rest for a moment and try again.";
      case "VALIDATION_ERROR":
        return err.message || "Please check the entered information and try again.";
      default:
        return err.message || "Something went wrong. Our team is looking into it.";
    }
  }

  if (err instanceof Error) {
    return err.message;
  }

  return "An unexpected error occurred. Please try again.";
}
