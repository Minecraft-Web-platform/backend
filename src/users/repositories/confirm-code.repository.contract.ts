import { ConfirmationCode } from '../entities/confirmation-code.entity';
import { ConfirmCodeActions } from '../types/confirm-code-actions.type';

export interface IConfirmCodeRepository {
  findAllByUsername(username: string): Promise<ConfirmationCode[]>;

  findOneByUserAndType(username: string, type: ConfirmCodeActions): Promise<ConfirmationCode | null>;

  createCode(data: Partial<ConfirmationCode>): Promise<ConfirmationCode>;

  deactivate(userId: string, type: ConfirmCodeActions): Promise<void>;

  deactivateAll(userId: string): Promise<void>;

  deleteExpired(currentDate: Date): Promise<void>;
}
