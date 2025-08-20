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

  async findAllByUsername(username: string): Promise<ConfirmationCode[]> {
    return this.repo.find({ where: { player_username: username } });
  }

  async findOneByUserAndType(username: string, type: ConfirmCodeActions): Promise<ConfirmationCode | null> {
    return this.repo.findOne({ where: { player_username: username, type } });
  }

  async createCode(data: Partial<ConfirmationCode>): Promise<ConfirmationCode> {
    const newCode = this.repo.create(data);
    return this.repo.save(newCode);
  }

  async deactivate(username: string, type: ConfirmCodeActions): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(ConfirmationCode)
      .set({ used: true })
      .where('player_username = :username AND type = :type AND used = false', {
        username,
        type,
      })
      .execute();
  }

  async deactivateAll(username: string): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(ConfirmationCode)
      .set({ used: true })
      .where('player_username = :username AND used = false', { username })
      .execute();
  }

  async deleteExpired(currentDate: Date): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .delete()
      .from(ConfirmationCode)
      .where('expires_at IS NOT NULL AND expires_at < :now', { now: currentDate })
      .execute();
  }
}
