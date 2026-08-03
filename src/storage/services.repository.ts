import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceEntity } from './entities/service.entity';

@Injectable()
export class ServicesRepository {
  // Cache em memória: nomes de serviço se repetem massivamente dentro de um upload
  private readonly cache = new Map<string, number>();

  constructor(
    @InjectRepository(ServiceEntity)
    private readonly repo: Repository<ServiceEntity>,
  ) {}

  async resolveId(name: string): Promise<number> {
    const cached = this.cache.get(name);
    if (cached !== undefined) return cached;

    const existing = await this.repo.findOneBy({ name });
    if (existing) {
      this.cache.set(name, existing.id);
      return existing.id;
    }

    // upsert: uploads concorrentes podem tentar criar o mesmo serviço
    const inserted = await this.repo
      .createQueryBuilder()
      .insert()
      .values({ name, createdAt: new Date() })
      .orIgnore()
      .execute();

    const id = inserted.identifiers[0]?.id as number | undefined;
    if (id !== undefined) {
      this.cache.set(name, id);
      return id;
    }

    // conflito: outro processo já inseriu — busca de novo
    const created = await this.repo.findOneByOrFail({ name });
    this.cache.set(name, created.id);
    return created.id;
  }
}
