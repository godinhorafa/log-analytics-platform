import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type UploadStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type DetectedFormat = 'jsonl' | 'nginx' | 'syslog';

@Entity({ name: 'uploads' })
export class UploadEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  filename: string;

  @Column({ name: 'detected_format', type: 'text', nullable: true })
  detectedFormat: DetectedFormat | null;

  @Column({
    type: 'enum',
    enum: ['PROCESSING', 'COMPLETED', 'FAILED'],
    default: 'PROCESSING',
  })
  status: UploadStatus;

  @Column({ name: 'total_lines', type: 'int', default: 0 })
  totalLines: number;

  @Column({ name: 'parsed_lines', type: 'int', default: 0 })
  parsedLines: number;

  @Column({ name: 'error_lines', type: 'int', default: 0 })
  errorLines: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt: Date | null;
}
