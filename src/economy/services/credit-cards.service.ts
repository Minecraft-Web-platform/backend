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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async getAll(_username: User['username']): Promise<CreditCard[]> {
    return [];
  }

// eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async getByUUID(_uuid: CreditCard['id']): Promise<CreditCard | null> {
    return null;
  }

  public async create() {}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async delete(_uuid: CreditCard['id']): Promise<void> {}
}
