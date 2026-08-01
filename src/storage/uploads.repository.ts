import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DetectedFormat, UploadEntity } from './entities/upload.entity';

interface ProgressCounts {
  total: number;
  parsed: number;
  errors: number;
}

@Injectable()
export class UploadsRepository {
  constructor(
    @InjectRepository(UploadEntity)
    private readonly repo: Repository<UploadEntity>,
  ) {}

  async create(filename: string): Promise<UploadEntity> {
    const upload = this.repo.create({
      filename,
      status: 'PROCESSING',
      startedAt: new Date(),
    });
    return this.repo.save(upload);
  }

  findById(id: string): Promise<UploadEntity | null> {
    return this.repo.findOneBy({ id });
  }

  list(): Promise<UploadEntity[]> {
    return this.repo.find({ order: { startedAt: 'DESC' } });
  }

  async setFormat(id: string, format: DetectedFormat): Promise<void> {
    await this.repo.update(id, { detectedFormat: format });
  }

  async updateProgress(id: string, counts: ProgressCounts): Promise<void> {
    await this.repo.update(id, {
      totalLines: counts.total,
      parsedLines: counts.parsed,
      errorLines: counts.errors,
    });
  }

  async markCompleted(id: string, counts: ProgressCounts): Promise<void> {
    await this.repo.update(id, {
      status: 'COMPLETED',
      totalLines: counts.total,
      parsedLines: counts.parsed,
      errorLines: counts.errors,
      finishedAt: new Date(),
    });
  }

  async markFailed(id: string, errorMessage: string): Promise<void> {
    await this.repo.update(id, {
      status: 'FAILED',
      errorMessage,
      finishedAt: new Date(),
    });
  }
}
