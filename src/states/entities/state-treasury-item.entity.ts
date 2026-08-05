import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, JoinColumn } from 'typeorm';
import { StateEntity } from './state.entity';

@Entity('state_treasury_items')
export class StateTreasuryItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'state_id', type: 'uuid' })
  stateId: string;

  @ManyToOne(() => StateEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'state_id' })
  state: StateEntity;

  @Column({ name: 'minecraft_item_id', type: 'varchar', length: 255 })
  minecraftItemId: string;

  @Column({ type: 'int', default: 0 })
  quantity: number;
}
