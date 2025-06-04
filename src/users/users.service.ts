import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Repository } from 'typeorm';
import crypto from 'crypto';

@Injectable()
export class UsersService {
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

  public async create(userData: Omit<Omit<User, 'id'>, 'uuid'>) {
    const uuid = await this.generateOfflineUUID(userData.username);

    return this.usersRepository.create({
      ...userData,
      uuid,
    });
  }

  public async delete(id: number) {
    return this.usersRepository.delete({ id });
  }

  private async generateOfflineUUID(username) {
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
