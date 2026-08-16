import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type IpoRequestStatus = 'pending' | 'approved' | 'rejected';

@Entity('economy_ipo_requests')
export class IpoRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  companyId: string; // ID компании, подающей заявку

  @Column()
  companyName: string; // Название компании (для удобства отображения)

  @Column()
  @Index()
  stateId: string; // ID государства (биржи)

  @Column({ type: 'int' })
  totalShares: number;

  @Column({ type: 'float' })
  initialPrice: number;

  @Column({ type: 'float' })
  feeAmount: number; // Рассчитанная пошлина на момент подачи заявки

  @Column({
    type: 'varchar',
    default: 'pending',
  })
  status: IpoRequestStatus;

  @CreateDateColumn()
  createdAt: Date;
}
