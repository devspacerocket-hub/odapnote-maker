const fs = require('fs');

let content = fs.readFileSync('components/Dashboard.tsx', 'utf8');

const oldFunctions = /const startActualProcessing = async .*?const handleFileUpload/s;

const newFunctions = `
  const processImages = async (files: File[], jobId: number) => {
    const readFile = (file: File): Promise<string> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });
    };
    
    // image dimension check and resize
    const resizeImageIfNeed = (dataUrl: string): Promise<string> => {
       return new Promise((resolve, reject) => {
          const img = new Image();
          img.src = dataUrl;
          img.onload = () => {
             const dims = calculateResizedDimensions(img.width, img.height, IMAGE_UPLOAD_LIMITS.maxProcessingLongEdgePx);
             if (dims.width === img.width && dims.height === img.height) {
                 resolve(dataUrl);
                 return;
             }
             const canvas = document.createElement('canvas');
             canvas.width = dims.width;
             canvas.height = dims.height;
             const ctx = canvas.getContext('2d');
             if(!ctx) { resolve(dataUrl); return; }
             ctx.drawImage(img, 0, 0, dims.width, dims.height);
             resolve(canvas.toDataURL('image/jpeg', 0.9));
          };
          img.onerror = () => reject(new Error('Image load failed'));
       });
    };

    const newProblems: ProcessedProblem[] = [];
    for (let i = 0; i < files.length; i++) {
      if (jobId !== currentJobIdRef.current) return;
      try {
          const file = files[i];
          const rawBase64 = await readFile(file);
          if (!rawBase64) continue;
          
          const resizedBase64 = await resizeImageIfNeed(rawBase64);
          
          const analysisResult = await detectProblemArea(resizedBase64);
          let processedUrl = resizedBase64;
          let initialCrop: CropArea | undefined = undefined;
          
          if (analysisResult) {
              processedUrl = await autoCropAndStraighten(resizedBase64, analysisResult);
              
              const img = new Image();
              img.src = resizedBase64;
              await new Promise(r => img.onload = r);
              
              const [ymin, xmin, ymax, xmax] = analysisResult.box_2d;
              initialCrop = {
                x: (xmin / 1000) * img.width,
                y: (ymin / 1000) * img.height,
                width: ((xmax - xmin) / 1000) * img.width,
                height: ((ymax - ymin) / 1000) * img.height
              };
          }
          newProblems.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            originalImageUrl: resizedBase64,
            processedImageUrl: processedUrl,
            detectedRotation: 0,
            lastRotation: 0,
            lastCrop: initialCrop,
            timestamp: Date.now(),
            userNotes: ''
          });
      } catch (error) {
          console.error(\`File processing error:\`, error);
          throw error;
      } finally {
          if (jobId === currentJobIdRef.current) {
              setUploadPopupState(prev => ({ ...prev, currentProcessed: i + 1 }));
          }
      }
    }
    
    if (jobId === currentJobIdRef.current) {
        setProblems(prev => [...prev, ...newProblems]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const runImageProcessing = async (files: File[]) => {
    const jobId = ++currentJobIdRef.current;
    
    // validation
    if (files.length > IMAGE_UPLOAD_LIMITS.maxFileCount) {
       setUploadErrorState({
          isOpen: true,
          message: \`한 번에 업로드할 수 있는 사진 수를 초과했습니다.\\n최대 \${IMAGE_UPLOAD_LIMITS.maxFileCount}장까지 업로드할 수 있습니다.\\n사진 수를 줄인 뒤 다시 시도해 주세요.\`
       });
       return;
    }
    
    for (const file of files) {
       if (file.size > IMAGE_UPLOAD_LIMITS.maxFileSizeBytes) {
           setUploadErrorState({
              isOpen: true,
              message: \`파일 용량이 너무 큽니다 (최대 \${IMAGE_UPLOAD_LIMITS.maxFileSizeBytes / 1024 / 1024}MB).\\n사진 용량을 줄인 뒤 다시 시도해 주세요.\`
           });
           return;
       }
    }

    setUploadPopupState({
       isOpen: true,
       status: 'processing',
       currentProcessed: 0,
       totalImages: files.length
    });

    try {
      await Promise.all([
        processImages(files, jobId),
        delay(MIN_LOADING_VISIBLE_MS)
      ]);
      
      if (jobId !== currentJobIdRef.current) return;
      
      setUploadPopupState(prev => ({ ...prev, status: 'complete' }));
      
      await delay(COMPLETE_MESSAGE_VISIBLE_MS);
      
      if (jobId !== currentJobIdRef.current) return;
      
      setUploadPopupState(prev => ({ ...prev, isOpen: false }));
    } catch (error) {
      if (jobId !== currentJobIdRef.current) return;
      setUploadErrorState({
         isOpen: true,
         message: '사진을 처리하지 못했습니다.\\n지원하지 않는 파일이거나 파일이 손상되었을 수 있습니다.',
         filesToRetry: files
      });
    }
  };

  const processFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;
    runImageProcessing(files);
  };

  const handleFileUpload`;

content = content.replace(oldFunctions, newFunctions);
fs.writeFileSync('components/Dashboard.tsx', content);
console.log('Dashboard rewritten step 2');
