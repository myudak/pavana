export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** Thrown by provider adapters that are scaffolded but not implemented yet. Maps to HTTP 501. */
export class NotImplementedError extends AppError {
  constructor(what: string) {
    super(501, 'not_implemented', `${what} is not implemented yet. Run with PAVANA_MODE=demo.`);
    this.name = 'NotImplementedError';
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(400, 'bad_request', message);
    this.name = 'BadRequestError';
  }
}
