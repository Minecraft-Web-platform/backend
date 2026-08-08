import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, JoinColumn } from 'typeorm';
import { Account } from './account.entity';

@Entity('account_treasury_items')
export class AccountTreasuryItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId: string;

  @ManyToOne(() => Account, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @Column({ name: 'minecraft_item_id', type: 'varchar', length: 255 })
  minecraftItemId: string;

  @Column({ type: 'int', default: 0 })
  quantity: number;
}
