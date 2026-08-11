import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('economy_companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', nullable: true })
  logoUrl: string | null;

  @Column()
  @Index()
  ownerUsername: string; // username_lower

  @Column({ type: 'varchar', nullable: true })
  @Index()
  cityId: string | null; // юрисдикция города

  @Column({ type: 'varchar', nullable: true })
  @Index()
  stateId: string | null; // юрисдикция государства

  @Column({ type: 'varchar', nullable: true })
  accountId: string | null; // ID коммерческого счета компании

  @Column({ default: false })
  isPublic: boolean; // выведена ли компания на биржу (IPO)

  @Column({ type: 'varchar', nullable: true })
  @Index()
  exchangeStateId: string | null; // ID государства, на бирже которого торгуется компания

  @Column({ type: 'int', default: 1000 })
  totalShares: number; // всего акций в обращении

  @Column({ type: 'int', default: 1000 })
  availableShares: number; // доступно акций для покупки на бирже

  @Column({ type: 'float', default: 10.0 })
  sharePrice: number; // текущая цена одной акции

  @Column({ type: 'float', default: 0.0 })
  priceChange24h: number; // изменение цены за 24ч (%)

  @CreateDateColumn()
  createdAt: Date;
}
