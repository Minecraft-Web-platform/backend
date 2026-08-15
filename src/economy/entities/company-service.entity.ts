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
import { CompanyServiceSubItem } from './company-service-sub-item.entity';

@Entity('economy_company_services')
export class CompanyService {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: false })
  isComposite: boolean;

  @Column({ type: 'float', default: 0 })
  price: number;

  @Column({ type: 'simple-array', nullable: true })
  photoUrls: string[];

  @OneToMany(() => CompanyServiceSubItem, (item) => item.service, { cascade: true })
  subItems: CompanyServiceSubItem[];

  @CreateDateColumn()
  createdAt: Date;
}
