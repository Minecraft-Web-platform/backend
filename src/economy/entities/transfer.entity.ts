import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('economy_transfers')
export class Transfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  fromAccountNumber: string;

  @Column()
  @Index()
  toAccountNumber: string;

  @Column({ type: 'float' })
  amount: number;

  @Column({ default: 'AR' })
  currencyCode: string;

  @Column({ type: 'float', default: 0 })
  taxAmount: number; // удержанный налог в казну города/государства

  @Column({ type: 'varchar', nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;
}
