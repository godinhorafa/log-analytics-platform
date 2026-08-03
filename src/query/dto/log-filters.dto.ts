import { IsArray, IsDateString, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { CursorPaginationDto } from '../../common/dto/pagination.dto';

const splitCsv = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.split(',').filter(Boolean) : value;

export class LogFiltersDto extends CursorPaginationDto {
  @IsOptional()
  @IsArray()
  @Transform(splitCsv)
  @IsString({ each: true })
  service?: string[];

  @IsOptional()
  @IsArray()
  @Transform(splitCsv)
  @IsString({ each: true })
  severity?: string[];

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  // Correlação entre serviços: todos os logs de um mesmo request/trace
  @IsOptional()
  @IsString()
  traceId?: string;
}

export class AggregationsQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
