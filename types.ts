
export interface VideoMetadata {
  id: string;
  name: string;
  size: number;
  duration: number; // in seconds
  status: 'pending' | 'processing' | 'completed' | 'error';
  step?: string; // Current manual step the bot is performing
}

export enum CalculationMode {
  SUM = 'SUM',
  AVERAGE = 'AVERAGE',
  MAX = 'MAX',
  MIN = 'MIN'
}
