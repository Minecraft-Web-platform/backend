import { MailTemplateStrategy } from './mail-template.strategy';

export class PasswordRecoveryStrategy implements MailTemplateStrategy {
  private readonly formattedCode: string;

  constructor(code: string) {
    this.formattedCode = `${code.slice(0, 3)}-${code.slice(3)}`;
  }

  getSubject(): string {
    return 'Восстановление пароля';
  }
  getHTML(): string {
    return `Жаль, что ты забыл пароль... Ой, забыл - держи код: ${this.formattedCode}`;
  }
  getText(): string {
    return `Жаль, что ты забыл пароль... Ой, забыл - держи код: ${this.formattedCode}`;
  }
}
