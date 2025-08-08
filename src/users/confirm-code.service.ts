import { Injectable } from '@nestjs/common';

import { ConfirmCodeRepository } from './repositories//confirm-code.repository';
import { ConfirmationCode } from './entities/confirmation-code.entity';
import { ConfirmCodeActions } from './types/confirm-code-actions.type';
import { IConfirmCodeService } from './confirm-code.service.contract';

@Injectable()
export class ConfirmCodeService implements IConfirmCodeService {
  constructor(private readonly confirmCodeRepo: ConfirmCodeRepository) {}

  async createCode(
    userId: string,
    type: ConfirmCodeActions,
  ): Promise<ConfirmationCode> {
    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    return this.confirmCodeRepo.createCode({
      userId,
      type,
      code,
      expiresAt,
      used: false,
    });
  }

  async getCodesForUser(userId: string): Promise<ConfirmationCode[]> {
    return this.confirmCodeRepo.findAllByUser(userId);
  }

  async getCodeForUserAndType(
    userId: string,
    type: ConfirmCodeActions,
  ): Promise<ConfirmationCode | null> {
    return this.confirmCodeRepo.findOneByUserAndType(userId, type);
  }

  async deactivateCode(
    userId: string,
    type: ConfirmCodeActions,
  ): Promise<void> {
    await this.confirmCodeRepo.deactivate(userId, type);
  }

  async deactivateAllCodes(userId: string): Promise<void> {
    await this.confirmCodeRepo.deactivateAll(userId);
  }

  async cleanupExpiredCodes(): Promise<void> {
    await this.confirmCodeRepo.deleteExpired(new Date());
  }

  private generateCode(): string {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += Math.floor(Math.random() * 10);
    }
    return code;
  }
}
