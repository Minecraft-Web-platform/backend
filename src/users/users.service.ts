import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  public async getByNickname(username: string): Promise<void> {}

  public async create() {}

  public async delete() {}
}
