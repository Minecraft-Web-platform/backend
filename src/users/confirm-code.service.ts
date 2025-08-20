import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { ConfirmCodeRepository } from './repositories//confirm-code.repository';
import { ConfirmationCode } from './entities/confirmation-code.entity';
import { ConfirmCodeActions } from './types/confirm-code-actions.type';
import { IConfirmCodeService } from './confirm-code.service.contract';

@Injectable()
export class ConfirmCodeService implements IConfirmCodeService {
  constructor(private readonly confirmCodeRepo: ConfirmCodeRepository) {}

  async createCode(username: string, type: ConfirmCodeActions): Promise<ConfirmationCode> {
    const code = this.generateCode();
    const expires_at = new Date(Date.now() + 15 * 60 * 1000);

    return this.confirmCodeRepo.createCode({
      id: uuidv4(),
      player_username: username,
      type,
      code,
      expires_at,
      used: false,
    });
  }

  async getCodesForUser(username: string): Promise<ConfirmationCode[]> {
    return this.confirmCodeRepo.findAllByUsername(username);
  }

  async getCodeForUserAndType(username: string, type: ConfirmCodeActions): Promise<ConfirmationCode | null> {
    return this.confirmCodeRepo.findOneByUserAndType(username, type);
  }

  async deactivateCode(username: string, type: ConfirmCodeActions): Promise<void> {
    await this.confirmCodeRepo.deactivate(username, type);
  }

  async deactivateAllCodes(username: string): Promise<void> {
    await this.confirmCodeRepo.deactivateAll(username);
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
