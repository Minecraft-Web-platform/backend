import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('economy_company_share_price_history')
export class CompanySharePriceHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  companyId: string;

  @Column({ type: 'float' })
  price: number;

  @CreateDateColumn()
  createdAt: Date;
}
