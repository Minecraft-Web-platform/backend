import { createHash } from 'crypto';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from './entities/user.entity';
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

  /**
   *
   * @param {string} username - username or username_lower
   * @returns { User | null }
   */
  public async getByUsername(username: string): Promise<User | null> {
    const usernameLower = username.toLowerCase();

    return this.usersRepository.findOneBy({ username_lower: usernameLower });
  }

  /**
   *
   * @param {string} email - email of the user
   * @returns { User | null }
   */
  public async getByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ email });
  }

  public async create(userData: CreateUserType): Promise<User> {
    const uuid = await this.generateOfflineUUID(userData.username);

    const newUser = this.usersRepository.create({
      ...userData,
      uuid,
      codes: [],
    });

    return this.usersRepository.save(newUser);
  }

  public async update(username: string, dataToUpdate: Partial<Omit<User, 'username'>>) {
    await this.usersRepository.update({ username }, dataToUpdate);

    return this.usersRepository.findOne({ where: { username } });
  }

  public async delete(id: number): Promise<boolean> {
    const deletionResult = await this.usersRepository.delete({ id });

    return !!deletionResult.affected;
  }

  private async generateOfflineUUID(username: string): Promise<string> {
    const name = 'OfflinePlayer:' + username;
    const hash = createHash('md5').update(name, 'utf8').digest();

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
