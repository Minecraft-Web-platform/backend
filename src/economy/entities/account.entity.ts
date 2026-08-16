import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type AccountType = 'personal' | 'company' | 'treasury';

@Entity('economy_accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  accountNumber: string;

  @Column()
  @Index()
  ownerUsername: string; // username_lower для игрока или ID/название компании/государства

  @Column({ type: 'varchar', default: 'personal' })
  type: AccountType;

  @Column({ type: 'float', default: 0 })
  balance: number;

  @Column({ default: 'AR' })
  currencyCode: string;

  @CreateDateColumn()
  createdAt: Date;

  bankName?: string;
}
