import type { BrowserContext, Request, Route } from '@playwright/test';
import type { z } from 'zod';
import type { errorEnvelope } from '#src/api/models/envelope.ts';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type MockReply = { status?: number; body: unknown };

export type MockResponder = MockReply | ((request: Request) => MockReply | Promise<MockReply>);

type Handler = { method: HttpMethod; path: string | RegExp; reply: MockResponder };

const samePath = (a: string | RegExp, b: string | RegExp): boolean => String(a) === String(b);

// search(), not test(): a RegExp with the g or y flag keeps state between test() calls.
const matches = (path: string | RegExp, pathname: string): boolean =>
  typeof path === 'string' ? path === pathname : pathname.search(path) !== -1;

/**
 * Answers every `/api/` request of a browser context from registered handlers. Handlers match on
 * the method and the URL pathname (query ignored). A request no handler matches gets 501 and is
 * recorded in `unhandled` as "<METHOD> <pathname>". A handler function that throws gets 500 and is
 * recorded as "<METHOD> <pathname> (handler threw: <message>)".
 */
export class MockApi {
  readonly #handlers: Handler[] = [];
  readonly #unhandled: string[] = [];

  static async attach(context: BrowserContext): Promise<MockApi> {
    const api = new MockApi();
    await context.route('**/api/**', (route) => api.#dispatch(route));
    return api;
  }

  /** Registers a handler. A later call for the same method and path replaces the earlier one. */
  on(method: HttpMethod, path: string | RegExp, reply: MockResponder): this {
    const existing = this.#handlers.findIndex((h) => h.method === method && samePath(h.path, path));
    if (existing !== -1) {
      this.#handlers.splice(existing, 1);
    }
    this.#handlers.push({ method, path, reply });
    return this;
  }

  get unhandled(): readonly string[] {
    return [...this.#unhandled];
  }

  clearUnhandled(): void {
    this.#unhandled.length = 0;
  }

  async #dispatch(route: Route): Promise<void> {
    const request = route.request();
    const method = request.method();
    const { pathname } = new URL(request.url());
    const handler = this.#handlers.findLast((h) => h.method === method && matches(h.path, pathname));

    if (!handler) {
      this.#unhandled.push(`${method} ${pathname}`);
      const body: z.infer<typeof errorEnvelope> = {
        success: false,
        timestamp: new Date().toISOString(),
        error: `No mock handler for ${method} ${pathname}`,
      };
      await route.fulfill({ status: 501, json: body });
      return;
    }

    let reply: MockReply;
    try {
      reply = typeof handler.reply === 'function' ? await handler.reply(request) : handler.reply;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.#unhandled.push(`${method} ${pathname} (handler threw: ${message})`);
      const body: z.infer<typeof errorEnvelope> = {
        success: false,
        timestamp: new Date().toISOString(),
        error: `Mock handler for ${method} ${pathname} threw: ${message}`,
      };
      await route.fulfill({ status: 500, json: body });
      return;
    }
    await route.fulfill({ status: reply.status ?? 200, json: reply.body });
  }
}
