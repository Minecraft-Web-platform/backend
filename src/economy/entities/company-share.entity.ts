import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('economy_company_shares')
export class CompanyShare {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  companyId: string;

  @Column()
  @Index()
  ownerUsername: string; // username_lower

  @Column({ type: 'int', default: 0 })
  sharesCount: number;

  @Column({ type: 'float', default: 0 })
  boughtAtPrice: number; // средняя цена покупки для расчета прибыли/убытка

  @CreateDateColumn()
  createdAt: Date;
}
