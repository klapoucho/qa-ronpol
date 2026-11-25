import { BaseApi } from '#src/api/http/base-api.ts';
import { profileSchema } from '#src/api/models/user.ts';

export class UsersApi extends BaseApi {
  profile() {
    return this.get('users/profile', profileSchema);
  }
}
