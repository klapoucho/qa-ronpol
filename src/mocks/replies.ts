import type { z } from 'zod';
import type { errorEnvelope, successEnvelope } from '#src/api/models/envelope.ts';
import type { MockReply } from '#src/mocks/mock-api.ts';

// Each helper returns a reply in the endpoint's real wire format (4.1): the envelope for most
// endpoints, the bare object for GET /api/version and GET /api/v1/statistics.

type SuccessBody<T> = Omit<z.infer<ReturnType<typeof successEnvelope<z.ZodUnknown>>>, 'data'> & { data: T };
type ErrorBody = z.infer<typeof errorEnvelope>;

export function ok<T>(data: T, message?: string): MockReply {
  const body: SuccessBody<T> = { success: true, timestamp: new Date().toISOString(), data };
  if (message !== undefined) {
    body.message = message;
  }
  return { status: 200, body };
}

export function fail(error: string, status: number): MockReply {
  const body: ErrorBody = { success: false, timestamp: new Date().toISOString(), error };
  return { status, body };
}

export function bare<T>(body: T, status = 200): MockReply {
  return { status, body };
}
