import { BaseApi } from '#src/api/http/base-api.ts';
import { registerResultSchema, type UserInput } from '#src/api/models/user.ts';

export class AuthApi extends BaseApi {
  register(input: UserInput) {
    return this.post('register', input, registerResultSchema);
  }

  login(email: string, password: string) {
    return this.post('login', { email, password }, registerResultSchema);
  }
}
