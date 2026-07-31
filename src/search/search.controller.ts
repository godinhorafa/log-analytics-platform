import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { SearchEngine } from './search.interface';

@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchEngine) {}

  @Get()
  find(
    @Query('q') query: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('service') service?: string,
    @Query('severity') severity?: string,
    @Query('limit') limit?: string,
  ) {
    if (!query?.trim())
      throw new BadRequestException('Parâmetro "q" é obrigatório');
    return this.search.search(query, {
      from,
      to,
      services: service ? service.split(',') : undefined,
      severities: severity ? severity.split(',') : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
