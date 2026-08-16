import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('economy_withdrawn_shares')
export class WithdrawnShare {
  @PrimaryGeneratedColumn('uuid')
  id: string; // Уникальный токен-сертификат

  @Column()
  @Index()
  companyId: string;

  @Column({ type: 'int' })
  sharesCount: number;

  @Column({ type: 'float', default: 0 })
  boughtAtPrice: number; // средняя цена покупки (для PnL)

  @Column({ type: 'varchar', length: 255 })
  issuedBy: string; // кто вывел акции (username_lower)

  @Column({ type: 'varchar', length: 20, default: 'player' })
  issuedByType: 'player' | 'state' | 'company';

  @CreateDateColumn()
  createdAt: Date;
}
