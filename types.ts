/**
 * types.ts
 * 
 * 애플리케이션 전역에서 사용되는 타입 스키마(Type Schema)와 열거형(Enum)을 관리합니다.
 * 
 * [목적]
 * 1. 데이터 구조를 명확히 하여 코드의 가독성을 높입니다.
 * 2. 타입스크립트의 안정성을 보장하며 개발 중 발생할 수 있는 오타 또는 잘못된 데이터 접근을 컴파일 단계에서 차단합니다.
 */

// 오답노트에서 관리하는 1개의 "문제"에 대한 데이터 인터페이스
export interface ProcessedProblem {
  id: string; // 고유 식별자 (보통 타임스탬프 또는 무작위 문자열)
  originalImageUrl: string; // 사용자가 업로드한 원본 사진의 Base64 URL
  processedImageUrl: string; // 로컬 알고리즘/에디터에 의해 자르기&보정 된 사진 데이터 (Base64)
  timestamp: number; // 업로드 된 시간 (내부 정렬 등에 사용)
  userNotes?: string; // 사용자가 추가한 오답 이유 / 메모 (선택적 속성)
  detectedRotation?: number; // 자동 이미지 분석으로 추정된 회전 각도
  lastCrop?: CropArea; // 최근 수동 크롭을 진행했던 좌표 영역 (에디터에 재진입 시 상태 복구용)
  lastRotation?: number; // 최근 수동 회전을 진행했던 각도
}

// 애플리케이션의 화면 모드를 정의합니다
export enum ViewMode {
  DASHBOARD = 'DASHBOARD', // 메인 화면(업로드 및 문제 관리)
  PRINT_PREVIEW = 'PRINT_PREVIEW' // PDF 출력 미리보기 화면
}

// 인쇄될 종이의 크기 규격 (현재 A4 단일 지원이나 향후 확장을 위해 분리)
export enum PaperSize {
  A4 = 'A4'
}

// PDF 출력 시 페이지에 나열할 문제의 레이아웃(그리드) 형식
export enum LayoutGrid {
  ONE = '1x1', // 페이지당 1문제 형태
  TWO = '1x2', // 페이지당 2문제 (세로 배열)
  FOUR = '2x2', // 페이지당 4문제 (격자 배열)
  SIX = '2x3' // 페이지당 6문제 (격자 배열)
}

// 로컬 기반 캔버스 이미지 분석(geminiService)의 반환 결과 타입
export interface AutoAnalysisResult {
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 텍스트가 있는 핵심 바운딩 박스
  rotation_angle: number; // 자동 기울기 보정을 위한 회전 각도
}

// 이미지 에디터 등에서 범위를 지정할 때 쓰이는 좌표 영역 데이터
export interface CropArea {
  x: number; // 좌측 상단 x 좌표
  y: number; // 좌측 상단 y 좌표
  width: number; // 넓이
  height: number; // 높이
}