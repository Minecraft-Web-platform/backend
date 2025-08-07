import { MailTemplateStrategy } from './mail-template.strategy';

export class EmailConfirmationStrategy implements MailTemplateStrategy {
  private readonly formattedCode: string;

  constructor(code: string) {
    this.formattedCode = `${code.slice(0, 3)}-${code.slice(3)}`;
  }

  getSubject(): string {
    return 'Подтверждение аккаунта';
  }
  getHTML(): string {
    return `<h2>Привет! Вот твой код для активации аккаунта: ${this.formattedCode}</h2>`;
  }
  getText(): string {
    return `Привет! Вот твой код для активации аккаунта: ${this.formattedCode}`;
  }
}
