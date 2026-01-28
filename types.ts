export interface Coordinate {
  x: number; // Stylization
  y: number; // Energy
  z: number; // Physical
}

export interface CellData {
  id: string; // "x-y-z"
  coord: Coordinate;
  imageUrl?: string;
  prompt: string;
  characterDescription?: string; // Generated character description from text LLM
  status: 'idle' | 'queued' | 'loading' | 'success' | 'error';
}

export type GridMatrix = Record<string, CellData>;

export enum Axis {
  X = 'Stylization',
  Y = 'Energy',
  Z = 'Physical Complexity'
}

export interface AxisDefinition {
  name: string;
  description: string;
  levels: string[]; // 5 levels
}