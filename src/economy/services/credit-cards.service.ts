import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CreditCard } from '../entities/credit-card.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class CreditCardsService {
  constructor(
    @InjectRepository(CreditCard)
    private repo: Repository<CreditCard>,
  ) {}

  public async getAll(username: User['username']): Promise<CreditCard[]> {
    return [];
  }

  public async getByUUID(uuid: CreditCard['id']): Promise<CreditCard | null> {
    return null;
  }

  public async create() {}

  public async delete(uuid: CreditCard['id']): Promise<void> {}
}
