import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Repository } from 'typeorm';

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

  public async create() {
    // password hashes with salt 12
  }

  public async delete(id: number) {
    return this.usersRepository.delete({ id });
  }
}
