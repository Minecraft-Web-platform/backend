import { MailTemplateStrategy } from './mail-template.strategy';

export class TicketStrategy implements MailTemplateStrategy {
  constructor(
    private readonly from: string,
    private readonly subject: string,
    private readonly content: string,
    private readonly email: string,
  ) {}

  getSubject(): string {
    return `Обращение от ${this.from}`;
  }
  getHTML(): string {
    return `
    <h1>Тема: ${this.subject}</h1>
    \n\n
    <p>${this.content}</p>
    \n
    <a href="mailto: ${this.email}">Почта отправителя: ${this.email}</a>
    `;
  }
  getText(): string {
    return `Тема: ${this.subject}\n\n${this.content}\nПочта отправителя: ${this.email}`;
  }
}
