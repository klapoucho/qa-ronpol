import { z } from 'zod';
import { BaseApi } from '#src/api/http/base-api.ts';

export class DebugApi extends BaseApi {
  restoreBaseDatabase() {
    return this.post('/api/debug/database/restore-base', undefined, z.unknown());
  }
}
