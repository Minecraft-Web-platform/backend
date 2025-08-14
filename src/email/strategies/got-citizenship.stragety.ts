import { MailTemplateStrategy } from './mail-template.strategy';

export class GotCitizenshipStrategy implements MailTemplateStrategy {
  private readonly username: string;
  private readonly governmentName: string;

  constructor(username: string, governmentName: string) {
    this.username = username;
    this.governmentName = governmentName;
  }

  getSubject(): string {
    return 'Что там по гражданству?';
  }
  getHTML(): string {
    return `Уважаемый ${this.username}, поздавляю тебя с получением гражданства в государстве ${this.governmentName}!`;
  }
  getText(): string {
    return `Уважаемый ${this.username}, поздавляю тебя с получением гражданства в государстве ${this.governmentName}!`;
  }
}
