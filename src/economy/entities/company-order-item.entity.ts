import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CompanyOrder } from './company-order.entity';
import { CompanyServiceSubItem } from './company-service-sub-item.entity';

@Entity('economy_company_order_items')
export class CompanyOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  orderId: string;

  @ManyToOne(() => CompanyOrder, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: CompanyOrder;

  @Column({ nullable: true })
  subItemId: string | null;

  @ManyToOne(() => CompanyServiceSubItem, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'subItemId' })
  subItem: CompanyServiceSubItem | null;

  @Column()
  name: string;

  @Column({ type: 'float' })
  price: number;

  @Column({ type: 'int', default: 1 })
  quantity: number;
}
