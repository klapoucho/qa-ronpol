import { BaseApi } from '#src/api/http/base-api.ts';
import { animalListSchema, animalSchema, type AnimalInput } from '#src/api/models/animal.ts';

export class AnimalsApi extends BaseApi {
  list() {
    return this.get('animals', animalListSchema);
  }

  create(input: AnimalInput) {
    return this.post('animals', input, animalSchema);
  }
}
