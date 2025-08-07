import crypto from 'crypto';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from './user.entity';
import { CreateUserType } from 'src/auth/types/create-user.type';
import { UsersServiceContract } from './users.service.contract';

@Injectable()
export class UsersService implements UsersServiceContract {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  public async getAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  public async getByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ username });
  }

  public async create(userData: CreateUserType): Promise<User> {
    const uuid = await this.generateOfflineUUID(userData.username);

    return this.usersRepository.create({
      ...userData,
      uuid,
    });
  }

  public async delete(id: number): Promise<boolean> {
    const deletionResult = await this.usersRepository.delete({ id });

    return !!deletionResult.affected;
  }

  private async generateOfflineUUID(username: string): Promise<string> {
    const name = 'OfflinePlayer:' + username;
    const hash = crypto.createHash('md5').update(name, 'utf8').digest();

    hash[6] = (hash[6] & 0x0f) | 0x30;
    hash[8] = (hash[8] & 0x3f) | 0x80;

    const hex = hash.toString('hex');

    return [
      hex.substring(0, 8),
      hex.substring(8, 12),
      hex.substring(12, 16),
      hex.substring(16, 20),
      hex.substring(20),
    ].join('-');
  }
}
