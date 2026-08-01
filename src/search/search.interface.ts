export interface SearchHit {
  id: string;
  timestamp: string;
  service: string;
  severity: string;
  message: string;
  score: number;
}

export interface SearchOptions {
  from?: string; // ISO date
  to?: string;
  services?: string[];
  severities?: string[];
  limit?: number;
}

export abstract class SearchEngine {
  abstract index(log: IndexableLog): Promise<void>;
  // Indexação em lote — evita 1 request HTTP por log durante uploads grandes (ADR-002).
  abstract bulkIndex(logs: IndexableLog[]): Promise<void>;
  abstract search(query: string, opts?: SearchOptions): Promise<SearchHit[]>;
}

export interface IndexableLog {
  id: string;
  timestamp: string;
  service: string;
  severity: string;
  message: string;
  metadata?: Record<string, unknown>;
}
