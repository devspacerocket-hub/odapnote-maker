const fs = require('fs');

let content = fs.readFileSync('components/Dashboard.tsx', 'utf8');

// 1. Add constants after imports
const constants = `
const MIN_LOADING_VISIBLE_MS = 1200;
const COMPLETE_MESSAGE_VISIBLE_MS = 500;
const IMAGE_UPLOAD_LIMITS = {
  maxFileCount: 20,
  maxFileSizeBytes: 15 * 1024 * 1024,
  maxProcessingLongEdgePx: 3000,
};

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

function calculateResizedDimensions(
  width: number,
  height: number,
  maxLongEdge: number,
): { width: number; height: number } {
  const longEdge = Math.max(width, height);
  if (longEdge <= maxLongEdge) {
    return { width, height };
  }
  const scale = maxLongEdge / longEdge;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

interface UploadPopupState {
  isOpen: boolean;
  status: 'processing' | 'complete';
  currentProcessed: number;
  totalImages: number;
}

interface UploadErrorState {
  isOpen: boolean;
  message: string;
  filesToRetry?: File[];
}
`;

content = content.replace("interface DashboardProps {", constants + "\ninterface DashboardProps {");

// 2. State replacements
const oldState = `  const [isProcessing, setIsProcessing] = useState(false);
  const [isAdShowing, setIsAdShowing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });`;

const newState = `  const [uploadPopupState, setUploadPopupState] = useState<UploadPopupState>({
    isOpen: false,
    status: 'processing',
    currentProcessed: 0,
    totalImages: 0
  });
  const [uploadErrorState, setUploadErrorState] = useState<UploadErrorState>({
    isOpen: false,
    message: ''
  });
  const currentJobIdRef = useRef(0);
  
  const [isDragging, setIsDragging] = useState(false);`;

content = content.replace(oldState, newState);

fs.writeFileSync('components/Dashboard.tsx', content);
console.log('Dashboard rewritten step 1');
