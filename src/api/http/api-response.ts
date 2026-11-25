export class ApiRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

type ApiResponseInit<T> = {
  method: string;
  path: string;
  status: number;
  ok: boolean;
  error: string | undefined;
  body: unknown;
  data: T | undefined;
};

export class ApiResponse<T> {
  readonly status: number;
  readonly ok: boolean;
  readonly error: string | undefined;
  readonly body: unknown;
  readonly #method: string;
  readonly #path: string;
  readonly #data: T | undefined;

  constructor(init: ApiResponseInit<T>) {
    this.status = init.status;
    this.ok = init.ok;
    this.error = init.error;
    this.body = init.body;
    this.#method = init.method;
    this.#path = init.path;
    this.#data = init.data;
  }

  get data(): T {
    if (!this.ok) {
      throw new ApiRequestError(`${this.#method} ${this.#path} -> ${this.status}: ${this.error}`);
    }
    return this.#data as T;
  }
}
