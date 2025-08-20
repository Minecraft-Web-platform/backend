import { ConfirmationCode } from './entities/confirmation-code.entity';
import { ConfirmCodeActions } from './types/confirm-code-actions.type';

export interface IConfirmCodeService {
  createCode(username: string, type: ConfirmCodeActions): Promise<ConfirmationCode>;

  getCodesForUser(username: string): Promise<ConfirmationCode[]>;

  getCodeForUserAndType(username: string, type: ConfirmCodeActions): Promise<ConfirmationCode | null>;

  deactivateCode(username: string, type: ConfirmCodeActions): Promise<void>;

  deactivateAllCodes(username: string): Promise<void>;

  cleanupExpiredCodes(): Promise<void>;
}
