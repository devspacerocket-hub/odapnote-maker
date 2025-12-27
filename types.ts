
export interface ProcessedProblem {
  id: string;
  originalImageUrl: string;
  processedImageUrl: string; // The auto-cropped, rotated, and filtered result
  timestamp: number;
  userNotes?: string;
  detectedRotation?: number; // Store the AI-detected rotation angle
  lastCrop?: CropArea; // Store the user's last crop coordinates
  lastRotation?: number; // Store the user's last adjusted rotation
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
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] normalized 0-1000
  rotation_angle: number; // degrees to straighten the image
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}
