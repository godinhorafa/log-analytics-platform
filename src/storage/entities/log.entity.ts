import { Column, Entity, PrimaryColumn } from 'typeorm';
import { LogSeverity } from '../../ingestion/parsers/parser.interface';

// Mapeia a tabela particionada `logs` (db/schema.sql). PK composta (id, timestamp)
// é exigência do Postgres para tabelas particionadas por range de timestamp.
@Entity({ name: 'logs' })
export class LogEntity {
  @PrimaryColumn('uuid')
  id: string;

  @PrimaryColumn({ name: 'timestamp', type: 'timestamptz' })
  timestamp: Date;

  @Column({ name: 'upload_id', type: 'uuid' })
  uploadId: string;

  @Column({ name: 'service_id', type: 'smallint' })
  serviceId: number;

  @Column({ type: 'enum', enum: LogSeverity })
  severity: LogSeverity;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'trace_id', type: 'text', nullable: true })
  traceId: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;
}
