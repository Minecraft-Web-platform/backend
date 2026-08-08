import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('economy_currencies')
export class Currency {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  stateId: string | null; // ID государства-эмитента (null для общесерверной валюты)

  @Column({ unique: true })
  @Index()
  code: string; // тикер валюты, например DIA, GLD, AR

  @Column()
  name: string; // название валюты

  @Column({ default: 'createdeco:gold_coin' })
  minecraftItemId: string; // предмет в Minecraft (получение только через креатив)

  @Column({ name: 'kopeck_item_id', default: 'createdeco:copper_coin' })
  kopeckItemId: string; // предмет для копеек (1/100 основной валюты)

  @Column({ default: 'unbreaking:3' })
  minecraftEnchantment: string; // чары, которые нельзя получить в обычном выживании

  @Column({ type: 'float', default: 1000 })
  totalIssued: number; // общий объем эмиссии валюты

  @Column({ type: 'float', default: 0 })
  reserves: number; // резервы в казне в эталонном эквиваленте

  @Column({ type: 'float', default: 1.0 })
  exchangeRate: number; // текущий курс валюты

  @Column({ type: 'float', default: 0.0 })
  rateChange24h: number; // изменение курса за последние сутки (%)

  @CreateDateColumn()
  createdAt: Date;
}
