import axios from 'axios';

const API_BASE_URL = 'http://localhost:8081/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 缺陷相关接口
export interface Defect {
  id?: number;
  type: string;
  severity: string;
  location: string;
  description: string;
  status: string;
  assignedTo?: string;
  detectedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const defectApi = {
  // 获取所有缺陷
  getAllDefects: () => apiClient.get<Defect[]>('/defects'),
  
  // 根据 ID 获取缺陷
  getDefectById: (id: number) => apiClient.get<Defect>(`/defects/${id}`),
  
  // 根据状态获取缺陷
  getDefectsByStatus: (status: string) => apiClient.get<Defect[]>(`/defects/status/${status}`),
  
  // 根据严重程度获取缺陷
  getDefectsBySeverity: (severity: string) => apiClient.get<Defect[]>(`/defects/severity/${severity}`),
  
  // 创建缺陷
  createDefect: (defect: Defect) => apiClient.post<Defect>('/defects', defect),
  
  // 更新缺陷
  updateDefect: (id: number, defect: Defect) => apiClient.put<Defect>(`/defects/${id}`, defect),
  
  // 删除缺陷
  deleteDefect: (id: number) => apiClient.delete(`/defects/${id}`),
};

// AI 分析接口
export interface AIAnalysisRequest {
  taskInfo: string;
}

export interface AIAnalysisResponse {
  analysis: string;
}

export const aiApi = {
  // AI 分析缺陷
  analyzeDefect: (request: AIAnalysisRequest) => 
    apiClient.post<AIAnalysisResponse>('/ai/analyze', request),
};

export default apiClient;





