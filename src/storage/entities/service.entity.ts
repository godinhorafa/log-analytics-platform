import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'services' })
export class ServiceEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
