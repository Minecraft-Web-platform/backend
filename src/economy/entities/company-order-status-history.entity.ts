import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CompanyOrder } from './company-order.entity';
import { CompanyOrderStatus } from './company-order-status.enum';

@Entity('economy_company_order_status_history')
export class CompanyOrderStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  orderId: string;

  @ManyToOne(() => CompanyOrder, (order) => order.statusHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: CompanyOrder;

  @Column({ type: 'enum', enum: CompanyOrderStatus })
  status: CompanyOrderStatus;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ type: 'varchar', nullable: true })
  changedByUsername: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
