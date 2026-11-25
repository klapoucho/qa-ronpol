import { BaseApi } from '#src/api/http/base-api.ts';
import { aboutSchema, appVersionSchema, healthcheckSchema } from '#src/api/models/health.ts';

export class HealthApi extends BaseApi {
  healthcheck() {
    return this.get('healthcheck', healthcheckSchema);
  }

  about() {
    return this.get('about', aboutSchema);
  }

  version() {
    return this.get('/api/version', appVersionSchema, { envelope: false });
  }
}
