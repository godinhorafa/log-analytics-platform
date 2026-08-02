import type { Severity } from '../api/types';

export const SEVERITY_ORDER: Severity[] = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];

/**
 * Única fonte de cor por severidade em todo o app.
 * Paleta validada (6 checagens: banda de luminosidade, croma, separação CVD
 * deutan/protan/tritan, piso de visão normal e contraste >= 3:1 sobre branco);
 * pior par adjacente: ΔE 16,3 em deutan.
 */
export const SEVERITY_COLORS: Record<Severity, string> = {
  DEBUG: '#0d9488', // teal
  INFO: '#3b82f6', // azul
  WARN: '#d97706', // âmbar
  ERROR: '#be123c', // vermelho profundo
  FATAL: '#7c3aed', // violeta — "além do vermelho"
};

/** Tints suaves para badges (fundo claro + texto escuro — texto nunca veste a cor da série) */
export const SEVERITY_BG: Record<Severity, string> = {
  DEBUG: '#0d948818',
  INFO: '#3b82f618',
  WARN: '#d9770618',
  ERROR: '#be123c18',
  FATAL: '#7c3aed18',
};
