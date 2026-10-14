import { z } from 'zod';
import { BadRequestError } from '../domain/errors';

/** Parse request input with a zod schema; invalid input → HTTP 400 with a readable message. */
export function parseInput<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const r = schema.safeParse(input);
  if (!r.success) throw new BadRequestError(z.prettifyError(r.error));
  return r.data;
}
