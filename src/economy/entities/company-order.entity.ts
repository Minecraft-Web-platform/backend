import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Company } from './company.entity';
import { CompanyService } from './company-service.entity';
import { CompanyOrderItem } from './company-order-item.entity';
import { CompanyOrderStatusHistory } from './company-order-status-history.entity';
import { CompanyOrderStatus } from './company-order-status.enum';


@Entity('economy_company_orders')
export class CompanyOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column()
  @Index()
  serviceId: string;

  @ManyToOne(() => CompanyService, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'serviceId' })
  service: CompanyService;

  @Column()
  @Index()
  clientUsername: string;

  @Column({ type: 'text', nullable: true })
  clientComment: string | null;

  @Column({ type: 'varchar', length: 50, default: 'player' })
  payerType: 'player' | 'company' | 'state';

  @Column({ type: 'uuid', nullable: true })
  payerCompanyId: string | null;

  @Column({ type: 'uuid', nullable: true })
  payerStateId: string | null;

  @Column({ type: 'float' })
  totalPrice: number;

  @Column({ type: 'enum', enum: CompanyOrderStatus, default: CompanyOrderStatus.NEW })
  status: CompanyOrderStatus;

  @OneToMany(() => CompanyOrderItem, (item) => item.order, { cascade: true })
  items: CompanyOrderItem[];

  @OneToMany(() => CompanyOrderStatusHistory, (history) => history.order, { cascade: true })
  statusHistory: CompanyOrderStatusHistory[];

  @Column({ type: 'boolean', default: false })
  isEscalatedToAdmin: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  adminDecision: string | null;

  @Column({ type: 'text', nullable: true })
  adminComment: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
