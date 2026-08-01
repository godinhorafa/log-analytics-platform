import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

// Keyset pagination reutilizável: nunca OFFSET (custo cresce com a página;
// keyset é O(1) independente de quão fundo se está na lista) — ADR-006.
export interface Cursor {
  timestamp: string;
  id: string;
}

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

export function decodeCursor(value: string): Cursor {
  const parsed: unknown = JSON.parse(
    Buffer.from(value, 'base64url').toString('utf8'),
  );
  const candidate = parsed as Partial<Cursor> | null;
  if (
    typeof candidate?.timestamp !== 'string' ||
    typeof candidate?.id !== 'string'
  ) {
    throw new Error('Cursor inválido');
  }
  return { timestamp: candidate.timestamp, id: candidate.id };
}

export class CursorPaginationDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC' = 'DESC';
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}
