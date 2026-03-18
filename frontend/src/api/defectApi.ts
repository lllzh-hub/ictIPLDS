import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json; charset=UTF-8',
    'Accept': 'application/json; charset=UTF-8',
  },
  timeout: 30000,
  // 确保响应数据以 UTF-8 解析
  responseType: 'json',
  responseEncoding: 'utf8',
});

apiClient.interceptors.request.use(
  (config) => {
    // 确保请求头中包含 UTF-8 编码信息
    if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json; charset=UTF-8';
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    // 确保响应数据正确编码
    if (response.data && typeof response.data === 'string') {
      try {
        // 如果响应是字符串，尝试解析为 JSON
        response.data = JSON.parse(response.data);
      } catch (e) {
        // 如果不是 JSON，保持原样
      }
    }
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
  isFalsePositive?: boolean; // 是否为误判
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
  isFalsePositive?: boolean;
  error?: string;
}

export const aiApi = {
  analyzeDefect: async (taskInfo: string, defectId?: number): Promise<AIAnalysisResponse> => {
    const response = await apiClient.post<AIAnalysisResponse>('/ai/analyze', { taskInfo, defectId });
    if (response.data.error) {
      throw new Error(response.data.error);
    }
    return response.data;
  },
};

export default apiClient;
