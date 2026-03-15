import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 增加超时时间到60秒，因为导入可能需要较长时间
});

// ... 保留原有的拦截器代码 ...

export interface RemoteFolder {
  name: string;
  path: string;
}

export interface RemoteImportResponse {
  success: boolean;
  count: number;
  message: string;
  defects?: any[];
}

export const remoteImportApi = {
  // 获取远程文件夹列表
  listFolders: async (): Promise<{ success: boolean; count: number; folders: string[] }> => {
    const response = await apiClient.get('/remote-import/folders');
    return response.data;
  },

  // 导入所有远程数据
  importAll: async (): Promise<RemoteImportResponse> => {
    const response = await apiClient.post('/remote-import/all');
    return response.data;
  },

  // 导入指定文件夹
  importFolder: async (folderName: string): Promise<RemoteImportResponse> => {
    const response = await apiClient.post(`/remote-import/folder/${folderName}`);
    return response.data;
  },
};






