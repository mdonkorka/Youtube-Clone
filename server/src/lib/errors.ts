export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public details?: Array<{ field?: string; message: string }>,
    public extra?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}
