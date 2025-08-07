export interface MailTemplateStrategy {
  getSubject(): string;
  getHTML(): string;
  getText(): string;
}
