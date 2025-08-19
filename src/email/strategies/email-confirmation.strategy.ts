import { MailTemplateStrategy } from './mail-template.strategy';

export class EmailConfirmationStrategy implements MailTemplateStrategy {
  private readonly formattedCode: string;
  private readonly username: string;

  constructor(code: string, username: string) {
    this.formattedCode = `${code.slice(0, 3)}-${code.slice(3)}`;
    this.username = username;
  }

  getSubject(): string {
    return 'Подтверждение аккаунта';
  }
  getHTML(): string {
    return `<h2>Привет, ${this.username}! Вот твой код для активации аккаунта: ${this.formattedCode}</h2>`;
  }
  getText(): string {
    return `Привет, ${this.username}! Вот твой код для активации аккаунта: ${this.formattedCode}`;
  }
}
