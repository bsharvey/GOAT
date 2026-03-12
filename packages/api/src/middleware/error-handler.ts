import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Async handler wrapper — eliminates try/catch boilerplate in routes
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Global error handler
export function errorHandler(err: Error & { statusCode?: number; isOperational?: boolean; code?: string }, _req: Request, res: Response, _next: NextFunction): void {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  // Supabase duplicate key (PostgreSQL unique_violation)
  if (err.code === "23505") {
    statusCode = 400;
    message = "Duplicate field value entered";
  }

  // Supabase not-null violation
  if (err.code === "23502") {
    statusCode = 400;
    message = "Missing required field";
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}

// 404 handler
export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(`Not found - ${req.originalUrl}`, 404));
}
