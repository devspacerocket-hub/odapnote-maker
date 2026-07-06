# 오답노트메이커 (Incorrect Answer Note Maker)

## 📌 프로그램 기능 설명 (Features)
본 프로그램은 수험생들이 문제 사진을 업로드하여 학습용 PDF 오답노트를 생성할 수 있는 웹 기반 서비스입니다. 가장 주요한 특징은 **서버 전송 없이 로컬(클라이언트 브라우저)에서 모든 처리가 이루어진다**는 점입니다.

1. **로컬 이미지 처리 및 분석**:
   - 사용자가 문제 이미지를 업로드(드래그 앤 드롭 또는 파일 선택)합니다.
   - `geminiService.ts`에 구현된 로컬 브라우저 기반의 픽셀 밀집도 분석 알고리즘을 통해 문제의 텍스트가 있는 핵심 영역(바운딩 박스)을 자동으로 감지합니다. (외부 API 사용 안 함)
2. **이미지 크롭 및 보정**:
   - 감지된 영역을 기반으로 이미지를 자동으로 자르고 보정합니다 (`utils/imageProcessor.ts`).
   - 사용자가 직접 세밀하게 회전 각도 조정 및 자르기를 할 수 있는 이미지 에디터 UI 제공 (`ImageEditor.tsx`).
3. **오답 노트 대시보드 관리**:
   - 여러 장의 문제 사진을 한눈에 보고 관리할 수 있습니다.
   - 각 문제마다 오답 이유나 핵심 꿀팁 등 개인 메모(Notes)를 작성할 수 있습니다. (`Dashboard.tsx`)
4. **PDF 인쇄 및 내보내기**:
   - 정리된 문제와 메모를 최적화된 레이아웃으로 배치하여 한 줄(또는 여러 줄)에 맞춰 PDF로 출력(생성)할 수 있습니다 (`PrintLayout.tsx`).

---

## 📂 코드 구조 (Code Structure)

- **`App.tsx`**: 애플리케이션의 최상위 컴포넌트입니다. 현재 화면 상태(`ViewMode`: DASHBOARD / PRINT_PREVIEW)를 관리하며, 상태에 따라 `Dashboard` 또는 `PrintLayout` 컴포넌트를 렌더링합니다. 전역 문제 목록(`problems`)의 상태 배열을 가집니다.
- **`components/Dashboard.tsx`**: 메인 대시보드 화면입니다. 파일 업로드 로직(드래그 앤 드롭 포함), 분석 중 로딩 UI 대기열, 오답노트 리스트 렌더링 및 개별 문제 메모 기능, 그리고 부가적인 알림 UI(튜토리얼, 약관 팝업 등)를 관리합니다.
- **`components/ImageEditor.tsx`**: 업로드된 이미지를 사용자가 다시 크롭하고 회전할 수 있도록 모달 창 형태로 나타나는 이미지 에디터입니다.
- **`components/PrintLayout.tsx`**: 사용자가 최종적으로 PDF 출력을 요청할 때 보여지는 화면입니다. `jspdf`와 `html2canvas` 라이브러리를 활용해 화면에 렌더링된 컴포넌트 요소들을 캡처해 A4 사이즈에 맞는 깔끔한 PDF를 생성합니다.
- **`components/TutorialPopup.tsx`, `AdSenseUnit.tsx`**: 기타 사용자 가이드 및 구글 애드센스를 위한 컴포넌트입니다.
- **`services/geminiService.ts`**: 네이밍과 달리 외부 AI(Gemini) 호출이 아닌, HTML5 Canvas `getImageData`를 활용하여 픽셀의 밝기(명도)를 조사해 빈 여백을 자르고 텍스트 영역만 찾아내는 **순수 로컬 알고리즘**이 구현되어 있습니다.
- **`utils/imageProcessor.ts`**: 캔버스 그래픽 context를 활용해 이미지 회전, 자르기(Crop), 해상도 최적화 등 픽셀 조작 및 base64 데이터 URI 변환 역할을 수행하는 유틸리티 함수들을 모아둔 파일입니다.
- **`types.ts`**: TypeScript 인터페이스 및 Enum (예: `ProcessedProblem`, `ViewMode`, `CropArea` 등)을 한 곳에 모아 관리하는 파일입니다.
- **`index.html` & `vite.config.ts`**: React 진입점 및 빌드 환경 설정입니다. Vite 번들러 환경 위에서 동작합니다.
