import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

apiClient.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('Network Error:', error.request);
    } else {
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export interface Defect {
  id?: number;
  type: string;
  severity: string;
  location: string;
  description: string;
  status: string;
  confidence?: number;     // 置信度 (0-100)
  detectedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  originalImage?: string;  // base64 编码的原图
  detectionImage?: string; // base64 编码的检测框图
  thermalImage?: string;   // base64 编码的红外热力图
  aiAnalysis?: string;     // 检测框数据（JSON 数组）
  solution?: string;       // 红外检测框数据（JSON 数组）
  aiTextAnalysis?: string; // AI 文本分析
  aiTextSolution?: string; // AI 文本解决方案
}

export interface DetectionResult {
  detected: boolean;
  defects: Array<{
    type: string;
    confidence: number;
    bbox: number[];
    category_id: number;
    description: string;
  }>;
  image_base64?: string;
  location?: {
    latitude: number;
    longitude: number;
    altitude: number;
  };
  timestamp?: string;
  drone_id?: string;
  inference_time_ms?: number;
  image_info?: {
    width: number;
    height: number;
  };
}

export interface ImportResponse {
  success: boolean;
  count: number;
  defects: Defect[];
  message: string;
}

export const defectApi = {
  getAllDefects: async (): Promise<Defect[]> => {
    const response = await apiClient.get<Defect[]>('/defects');
    return response.data;
  },
  
  getDefectById: async (id: number): Promise<Defect> => {
    const response = await apiClient.get<Defect>(`/defects/${id}`);
    return response.data;
  },
  
  getDefectsByStatus: async (status: string): Promise<Defect[]> => {
    const response = await apiClient.get<Defect[]>(`/defects/status/${status}`);
    return response.data;
  },
  
  getDefectsBySeverity: async (severity: string): Promise<Defect[]> => {
    const response = await apiClient.get<Defect[]>(`/defects/severity/${severity}`);
    return response.data;
  },
  
  createDefect: async (defect: Defect): Promise<Defect> => {
    const response = await apiClient.post<Defect>('/defects', defect);
    return response.data;
  },
  
  updateDefect: async (id: number, defect: Defect): Promise<Defect> => {
    const response = await apiClient.put<Defect>(`/defects/${id}`, defect);
    return response.data;
  },
  
  deleteDefect: async (id: number): Promise<void> => {
    await apiClient.delete(`/defects/${id}`);
  },
  
  importDefects: async (detectionResult: DetectionResult): Promise<ImportResponse> => {
    const response = await apiClient.post<ImportResponse>('/defects/import', detectionResult);
    return response.data;
  },
};

export interface AIAnalysisRequest {
  taskInfo: string;
}

export interface AIAnalysisResponse {
  analysis: string;
  solution: string;
  error?: string;
}

export const aiApi = {
  analyzeDefect: async (taskInfo: string): Promise<AIAnalysisResponse> => {
    const response = await apiClient.post<AIAnalysisResponse>('/ai/analyze', { taskInfo });
    if (response.data.error) {
      throw new Error(response.data.error);
    }
    return response.data;
  },
};

export default apiClient;
