import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfirmationCode } from '../entities/confirmation-code.entity';
import { ConfirmCodeActions } from '../types/confirm-code-actions.type';
import { IConfirmCodeRepository } from './confirm-code.repository.contract';

@Injectable()
export class ConfirmCodeRepository implements IConfirmCodeRepository {
  constructor(
    @InjectRepository(ConfirmationCode)
    private readonly repo: Repository<ConfirmationCode>,
  ) {}

  async findAllByUser(userId: string): Promise<ConfirmationCode[]> {
    return this.repo.find({ where: { userId } });
  }

  async findOneByUserAndType(
    userId: string,
    type: ConfirmCodeActions,
  ): Promise<ConfirmationCode | null> {
    return this.repo.findOne({ where: { userId, type } });
  }

  async createCode(data: Partial<ConfirmationCode>): Promise<ConfirmationCode> {
    const newCode = this.repo.create(data);
    return this.repo.save(newCode);
  }

  async deactivate(userId: string, type: ConfirmCodeActions): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(ConfirmationCode)
      .set({ used: true })
      .where('userId = :userId AND type = :type AND used = false', {
        userId,
        type,
      })
      .execute();
  }

  async deactivateAll(userId: string): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(ConfirmationCode)
      .set({ used: true })
      .where('userId = :userId AND used = false', { userId })
      .execute();
  }

  async deleteExpired(currentDate: Date): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .delete()
      .from(ConfirmationCode)
      .where('expiresAt IS NOT NULL AND expiresAt < :now', { now: currentDate })
      .execute();
  }
}
