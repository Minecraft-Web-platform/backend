import { ConfirmationCode } from './entities/confirmation-code.entity';
import { ConfirmCodeActions } from './types/confirm-code-actions.type';

export interface IConfirmCodeService {
  createCode(
    userId: string,
    type: ConfirmCodeActions,
  ): Promise<ConfirmationCode>;

  getCodesForUser(userId: string): Promise<ConfirmationCode[]>;

  getCodeForUserAndType(
    userId: string,
    type: ConfirmCodeActions,
  ): Promise<ConfirmationCode | null>;

  deactivateCode(userId: string, type: ConfirmCodeActions): Promise<void>;

  deactivateAllCodes(userId: string): Promise<void>;

  cleanupExpiredCodes(): Promise<void>;
}
