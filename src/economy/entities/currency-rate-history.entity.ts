import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('economy_currency_rate_history')
export class CurrencyRateHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  currencyId: string;

  @Column({ type: 'float' })
  rate: number;

  @CreateDateColumn()
  createdAt: Date;
}
