import { Injectable, Logger } from '@nestjs/common';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { FormatDetector } from './parsers/format-detector';
import { BatchWriter } from './batch-writer.service';
import { UploadsRepository } from '../storage/uploads.repository';
import { LogLineParser, ParsedLog } from './parsers/parser.interface';

const SAMPLE_SIZE = 20;
const BATCH_SIZE = 1000;

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    private readonly detector: FormatDetector,
    private readonly writer: BatchWriter,
    private readonly repo: UploadsRepository,
  ) {}

  /** Cria o registro e dispara o processamento SEM await — retorna o id imediatamente */
  async startProcessing(filename: string, stream: Readable): Promise<string> {
    const upload = await this.repo.create(filename);
    this.process(upload.id, stream).catch((err: unknown) => {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error(`Upload ${upload.id} failed`, error.stack);
      return this.repo.markFailed(upload.id, error.message);
    });
    return upload.id;
  }

  private async process(uploadId: string, stream: Readable): Promise<void> {
    const rl = createInterface({ input: stream, crlfDelay: Infinity });

    const sample: string[] = [];
    let parser: LogLineParser | null = null;
    let batch: ParsedLog[] = [];
    let total = 0,
      parsed = 0,
      errors = 0;

    for await (const line of rl) {
      total++;
      if (!line.trim()) continue;

      // Fase 1: acumula amostra até detectar o formato
      if (!parser) {
        sample.push(line);
        if (sample.length < SAMPLE_SIZE) continue;
        parser = this.detector.detect(sample);
        if (!parser) throw new Error('Formato de log não reconhecido');
        await this.repo.setFormat(uploadId, parser.format);
        // reprocessa a amostra acumulada
        for (const s of sample) {
          const log = parser.parse(s);
          if (log) {
            batch.push(log);
            parsed++;
          } else {
            errors++;
          }
        }
        continue;
      }

      // Fase 2: parse linha a linha
      const log = parser.parse(line);
      if (log) {
        batch.push(log);
        parsed++;
      } else {
        errors++;
      }

      if (batch.length >= BATCH_SIZE) {
        await this.writer.flush(uploadId, batch); // backpressure: readline espera o await
        batch = [];
        await this.repo.updateProgress(uploadId, { total, parsed, errors });
      }
    }

    // Arquivo menor que a amostra: detecta com o que tem
    if (!parser && sample.length) {
      parser = this.detector.detect(sample);
      if (!parser) throw new Error('Formato de log não reconhecido');
      await this.repo.setFormat(uploadId, parser.format);
      for (const s of sample) {
        const log = parser.parse(s);
        if (log) {
          batch.push(log);
          parsed++;
        } else {
          errors++;
        }
      }
    }

    if (batch.length) await this.writer.flush(uploadId, batch);
    await this.repo.markCompleted(uploadId, { total, parsed, errors });
    await this.writer.invalidateAggregationCache(); // ADR-005: usuário vê o resultado na hora
  }

  list() {
    return this.repo.list();
  }
  findById(id: string) {
    return this.repo.findById(id);
  }
}
