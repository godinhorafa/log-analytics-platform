import type { Severity } from '../api/types';

export const SEVERITY_ORDER: Severity[] = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];

/**
 * Única fonte de cor por severidade em todo o app.
 * Paleta validada NOS DOIS MODOS (light e dark): banda de luminosidade,
 * croma, separação CVD deutan/protan/tritan, piso de visão normal e
 * contraste >= 3:1 sobre ambas as superfícies — sem warnings.
 */
export const SEVERITY_COLORS: Record<Severity, string> = {
  DEBUG: '#0d9488', // teal
  INFO: '#3b82f6', // azul
  WARN: '#d97706', // âmbar
  ERROR: '#e11d48', // rose — legível também na superfície escura
  FATAL: '#7c3aed', // violeta — "além do vermelho"
};

/** Tints suaves para badges (o texto usa token de texto, nunca a cor da série) */
export const SEVERITY_BG: Record<Severity, string> = {
  DEBUG: '#0d948822',
  INFO: '#3b82f622',
  WARN: '#d9770622',
  ERROR: '#e11d4822',
  FATAL: '#7c3aed22',
};

/** Cromo dos gráficos (grid/eixos/tooltip) por tema — nunca cor de série */
export function chartChrome(dark: boolean) {
  return dark
    ? {
        grid: '#2e2e2e',
        axis: '#a3a3a3',
        axisLine: '#404040',
        label: '#a3a3a3',
        tooltip: {
          borderRadius: 8,
          border: '1px solid #333333',
          backgroundColor: '#171717',
          color: '#e5e5e5',
          fontSize: 12,
        },
      }
    : {
        grid: '#e2e8f0',
        axis: '#64748b',
        axisLine: '#cbd5e1',
        label: '#475569',
        tooltip: {
          borderRadius: 8,
          border: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
          color: '#0f172a',
          fontSize: 12,
        },
      };
}
