import { BaseApi } from '#src/api/http/base-api.ts';
import { fieldListSchema, fieldSchema, type FieldInput } from '#src/api/models/field.ts';

export class FieldsApi extends BaseApi {
  list() {
    return this.get('fields', fieldListSchema);
  }

  create(input: FieldInput) {
    return this.post('fields', input, fieldSchema);
  }
}
