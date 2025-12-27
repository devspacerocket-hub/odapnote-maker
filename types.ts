export interface ProcessedProblem {
  id: string;
  originalImageUrl: string;
  processedImageUrl: string;
  timestamp: number;
  userNotes?: string;
  detectedRotation?: number;
  lastCrop?: CropArea;
  lastRotation?: number;
}

export enum ViewMode {
  DASHBOARD = 'DASHBOARD',
  PRINT_PREVIEW = 'PRINT_PREVIEW'
}

export enum PaperSize {
  A4 = 'A4'
}

export enum LayoutGrid {
  ONE = '1x1',
  TWO = '1x2',
  FOUR = '2x2',
  SIX = '2x3'
}

export interface AutoAnalysisResult {
  box_2d: [number, number, number, number];
  rotation_angle: number;
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}