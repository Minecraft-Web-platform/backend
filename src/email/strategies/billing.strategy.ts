import { MailTemplateStrategy } from './mail-template.strategy';

export class BillingStrategy implements MailTemplateStrategy {
  private buyerUsername: string;
  private sellerUsername: string;
  private price: number;
  private currency: string;
  private transactionDate: Date;

  constructor(buyerName: string, sellerName: string, price: number, currency: string, transactionDate: Date) {
    this.buyerUsername = buyerName;
    this.sellerUsername = sellerName;
    this.price = price;
    this.currency = currency;
    this.transactionDate = transactionDate;
  }

  getSubject(): string {
    return ``;
  }
  getHTML(): string {
    return ``;
  }
  getText(): string {
    return ``;
  }
}
