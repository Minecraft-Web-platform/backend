export interface MailTemplateStrategy {
  getSubject(): string;
  getHTML(): string;
  getText(): string;
  getAttachments?(): { filename: string, content: string | Buffer }[];
}
