import type { APIRequestContext } from '@playwright/test';
import { z } from 'zod';
import { ApiResponse } from '#src/api/http/api-response.ts';
import { errorEnvelope, successEnvelope } from '#src/api/models/envelope.ts';

export type RequestOptions = { envelope?: boolean };

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export abstract class BaseApi {
  constructor(
    protected readonly request: APIRequestContext,
    protected readonly token?: string,
  ) {}

  protected get<T>(path: string, schema: z.ZodType<T>, options?: RequestOptions) {
    return this.send('GET', path, undefined, schema, options);
  }

  protected post<T>(path: string, body: unknown, schema: z.ZodType<T>, options?: RequestOptions) {
    return this.send('POST', path, body, schema, options);
  }

  protected put<T>(path: string, body: unknown, schema: z.ZodType<T>, options?: RequestOptions) {
    return this.send('PUT', path, body, schema, options);
  }

  protected patch<T>(path: string, body: unknown, schema: z.ZodType<T>, options?: RequestOptions) {
    return this.send('PATCH', path, body, schema, options);
  }

  protected delete<T>(path: string, schema: z.ZodType<T>, options?: RequestOptions) {
    return this.send('DELETE', path, undefined, schema, options);
  }

  private async send<T>(
    method: Method,
    path: string,
    body: unknown,
    schema: z.ZodType<T>,
    options: RequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const url = path.startsWith('/') ? path : `/api/v1/${path}`;
    const response = await this.request.fetch(url, {
      method,
      data: body,
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : undefined,
    });
    const status = response.status();
    const line = `${method} ${url} -> ${status}`;
    const text = await response.text();

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return new ApiResponse<T>({
        method,
        path: url,
        status,
        ok: false,
        error: 'Non-JSON response',
        body: text,
        data: undefined,
      });
    }

    const ok = this.isOk(json, status, options.envelope ?? true);
    const error = ok ? undefined : this.errorOf(json, status, options.envelope ?? true);
    const payload = options.envelope === false ? json : this.dataOf(json);
    let data: T | undefined;
    if (ok) {
      const parsed = schema.safeParse(payload);
      if (!parsed.success) {
        const issues = parsed.error.issues
          .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
          .join('\n');
        throw new Error(`${line}: response does not match the schema\n${issues}`);
      }
      data = parsed.data;
    }
    return new ApiResponse<T>({ method, path: url, status, ok, error, body: json, data });
  }

  private isOk(json: unknown, status: number, envelope: boolean): boolean {
    if (!envelope) {
      return status >= 200 && status < 300;
    }
    return successEnvelope(z.unknown()).safeParse(json).success;
  }

  private dataOf(json: unknown): unknown {
    const parsed = successEnvelope(z.unknown()).safeParse(json);
    return parsed.success ? parsed.data.data : undefined;
  }

  private errorOf(json: unknown, status: number, envelope: boolean): string {
    const parsed = errorEnvelope.safeParse(json);
    if (parsed.success) {
      return parsed.data.error;
    }
    if (typeof json === 'object' && json !== null && 'error' in json && typeof json.error === 'string') {
      return json.error;
    }
    if (envelope && status >= 200 && status < 300) {
      return `HTTP ${status}: 2xx response is not an envelope`;
    }
    return `HTTP ${status}`;
  }
}

export type ApiClientClass<T extends BaseApi> = new (request: APIRequestContext, token?: string) => T;
