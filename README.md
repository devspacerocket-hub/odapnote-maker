
# 오답노트 메이커 (Odapnote Maker)

문제 사진을 깔끔한 PDF 오답노트로 만들어 주는 **로컬 전용 웹 서비스**  
A **local-first web service** that turns problem photos into clean, customizable PDF answer notes.

---

## ✨ 서비스 소개 | Overview

**오답노트 메이커(Odapnote Maker)**는  
오답노트로 만들고 싶은 문제 사진을 업로드하면,  
자동 편집과 사용자 편집 기능을 통해 정리된 PDF 오답노트를 만들어 주는 서비스입니다.

**Odapnote Maker** helps you create organized answer notes from photos.  
When you upload photos you want to turn into answer notes, the service automatically processes and enhances them before exporting to PDF.

### 자동 처리 기능 | Automatic Processing
- 사진 음영 상태 검수  
- 회전 각도 자동 보정  
- 음영 제거  
- 글씨 선명도 보정  

- Lighting condition checks  
- Automatic rotation correction  
- Shadow removal  
- Text clarity enhancement  

자동 편집 과정에서 완벽하게 처리되지 않은 사진이 있을 수 있기 때문에,  
사용자가 직접 조정할 수 있는 **편집 기능**을 함께 제공합니다.

Since automatic processing may not perfectly handle all images,  
manual editing tools are provided so users can fine-tune the results.

모든 편집이 끝난 후에는 **PDF 미리보기 화면**에서 결과물을 확인하고,  
템플릿을 변경한 뒤 최종 PDF 파일을 다운로드할 수 있습니다.

After editing, users can preview the final result as a PDF, change templates,  
and download the completed PDF file.

---

## 🔒 로컬 전용 설계 | Local-Only by Design

이 서비스는 **외부 API나 클라우드 서버를 사용하지 않습니다.**

This service runs **entirely on local logic**.

- ✅ 외부 API 연결 없음  
- ✅ API 키 불필요  
- ✅ 클라우드 업로드 없음  
- ✅ 사용자 데이터 외부 전송 없음  

- ✅ No external APIs  
- ✅ No API keys required  
- ✅ No cloud processing  
- ✅ No user data sent to external servers  

모든 이미지 편집, 보정, PDF 생성 과정은  
애플리케이션 내부 로직을 통해 **로컬 환경에서 처리**됩니다.

All image processing, editing, and PDF generation are handled locally within the application.

---

## 🛠️ 사용 흐름 | How It Works

1. 오답노트로 만들고 싶은 사진 업로드  
2. 자동 검수 및 보정 (음영, 회전, 글씨 선명도)  
3. 자동 처리되지 않은 사진에 대해 사용자 편집  
4. PDF 미리보기 및 템플릿 변경  
5. 최종 PDF 파일 다운로드  

1. Upload photos you want to turn into answer notes  
2. Automatic checks and corrections (lighting, rotation, clarity)  
3. Manual editing for unprocessed or imperfect images  
4. PDF preview and template selection  
5. Download the final PDF file  

---

## 🚀 로컬 실행 방법 | Run Locally

### 필수 환경 | Prerequisites
- Node.js

### 실행 단계 | Steps

1. 의존성 설치 | Install dependencies
   ```bash
   npm install
2. 외부 API 키 설정은 필요하지 않습니다.
No API keys or external services are required.
3. 개발 서버 실행 | Run the development server
npm run dev
4. 브라우저에서 아래 주소로 접속
Open your browser and visit:
http://localhost:3000
