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

/** An upstream data source failed (timeout, 5xx, bad payload). Maps to HTTP 502. */
export class UpstreamError extends AppError {
  constructor(
    public readonly source: string,
    reason: string,
  ) {
    super(502, 'upstream_unavailable', `${source} is unavailable right now (${reason}).`);
    this.name = 'UpstreamError';
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(400, 'bad_request', message);
    this.name = 'BadRequestError';
  }
}
