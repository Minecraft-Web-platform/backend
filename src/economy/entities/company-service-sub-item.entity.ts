import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CompanyService } from './company-service.entity';

@Entity('economy_company_service_sub_items')
export class CompanyServiceSubItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  serviceId: string;

  @ManyToOne(() => CompanyService, (service) => service.subItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'serviceId' })
  service: CompanyService;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'float', default: 0 })
  price: number;

  @Column({ type: 'simple-array', nullable: true })
  photoUrls: string[];

  @Column({ type: 'int', default: 0 })
  displayOrder: number;
}
