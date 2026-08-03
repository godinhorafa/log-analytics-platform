import { Controller, Get, Query } from '@nestjs/common';
import { QueryService } from './query.service';
import { AggregationsQueryDto, LogFiltersDto } from './dto/log-filters.dto';

@Controller('logs')
export class QueryController {
  constructor(private readonly query: QueryService) {}

  @Get()
  list(@Query() filters: LogFiltersDto) {
    return this.query.listLogs(filters);
  }

  @Get('aggregations')
  aggregations(@Query() query: AggregationsQueryDto) {
    return this.query.aggregations(query);
  }
}
