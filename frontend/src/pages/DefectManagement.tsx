import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { defectApi } from '../api/defectApi';
import { remoteImportApi } from '../api/remoteImportApi';
import type { Defect, DetectionResult } from '../api/defectApi';
import Icon from '../components/common/Icon';

const DefectManagement = () => {
  const navigate = useNavigate();
  const [defects, setDefects] = useState<Defect[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showRemoteImportModal, setShowRemoteImportModal] = useState(false);
  const [remoteFolders, setRemoteFolders] = useState<string[]>([]);
  const [selectedRemoteFolder, setSelectedRemoteFolder] = useState<string>('');
  const [remoteImporting, setRemoteImporting] = useState(false);
  const [editingDefect, setEditingDefect] = useState<Defect | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<Defect>({
    type: '',
    severity: '',
    location: '',
    description: '',
    status: 'pending',
    confidence: 0,
  });

  const loadDefects = async () => {
    setLoading(true);
    try {
      const data = await defectApi.getAllDefects();
      setDefects(data);
    } catch (error) {
      console.error('加载缺陷失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDefects();
  }, []);

  const openModal = (defect?: Defect) => {
    if (defect) {
      setEditingDefect(defect);
      setFormData(defect);
    } else {
      setEditingDefect(null);
      setFormData({
        type: '',
        severity: '',
        location: '',
        description: '',
        status: 'pending',
        confidence: 0,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDefect(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingDefect && editingDefect.id) {
        await defectApi.updateDefect(editingDefect.id, formData);
      } else {
        await defectApi.createDefect(formData);
      }
      closeModal();
      loadDefects();
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这条缺陷记录吗？')) return;
    
    setLoading(true);
    try {
      await defectApi.deleteDefect(id);
      loadDefects();
    } catch (error) {
      console.error('删除失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('确定要删除所有缺陷记录吗？此操作不可撤销！')) return;
    if (!confirm('再次确认：删除所有 ' + defects.length + ' 条缺陷记录？')) return;
    
    setLoading(true);
    try {
      for (const defect of defects) {
        if (defect.id) {
          await defectApi.deleteDefect(defect.id);
        }
      }
      loadDefects();
    } catch (error) {
      console.error('删除失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (id: number) => {
    navigate(`/defect/${id}`);
  };

  const handleImportClick = () => {
    setShowImportModal(true);
    setImportMessage(null);
  };

  const handleRemoteImportClick = async () => {
    setShowRemoteImportModal(true);
    setImportMessage(null);
    
    // 加载远程文件夹列表
    try {
      const response = await remoteImportApi.listFolders();
      if (response.success) {
        setRemoteFolders(response.folders);
      }
    } catch (error) {
      console.error('获取远程文件夹列表失败:', error);
      setImportMessage({ type: 'error', text: '无法连接到远程服务器' });
    }
  };

  const handleRemoteImportAll = async () => {
    if (!confirm('确定要导入所有远程检测数据吗？这可能需要一些时间。')) return;
    
    setRemoteImporting(true);
    setImportMessage(null);

    try {
      const response = await remoteImportApi.importAll();
      
      if (response.success) {
        setImportMessage({ type: 'success', text: response.message });
        loadDefects();
        setTimeout(() => {
          setShowRemoteImportModal(false);
          setImportMessage(null);
        }, 2000);
      } else {
        setImportMessage({ type: 'error', text: response.message });
      }
    } catch (error) {
      console.error('远程导入失败:', error);
      setImportMessage({ type: 'error', text: '导入失败，请检查远程文件夹路径配置' });
    } finally {
      setRemoteImporting(false);
    }
  };

  const handleRemoteImportFolder = async () => {
    if (!selectedRemoteFolder) {
      setImportMessage({ type: 'error', text: '请选择要导入的文件夹' });
      return;
    }

    setRemoteImporting(true);
    setImportMessage(null);

    try {
      const response = await remoteImportApi.importFolder(selectedRemoteFolder);
      
      if (response.success) {
        setImportMessage({ type: 'success', text: response.message });
        loadDefects();
        setTimeout(() => {
          setShowRemoteImportModal(false);
          setImportMessage(null);
          setSelectedRemoteFolder('');
        }, 2000);
      } else {
        setImportMessage({ type: 'error', text: response.message });
      }
    } catch (error) {
      console.error('远程导入失败:', error);
      setImportMessage({ type: 'error', text: '导入失败，请检查文件夹是否存在' });
    } finally {
      setRemoteImporting(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setImportMessage(null);

    try {
      const text = await file.text();
      const detectionResult: DetectionResult = JSON.parse(text);
      
      const response = await defectApi.importDefects(detectionResult);
      
      if (response.success) {
        setImportMessage({ type: 'success', text: response.message });
        loadDefects();
        setTimeout(() => {
          setShowImportModal(false);
          setImportMessage(null);
        }, 2000);
      } else {
        setImportMessage({ type: 'error', text: response.message });
      }
    } catch (error) {
      console.error('导入失败:', error);
      setImportMessage({ type: 'error', text: '导入失败，请检查文件格式是否正确' });
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getSeverityConfig = (severity: string) => {
    const configs: Record<string, { bg: string; text: string; border: string; icon: string }> = {
      critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', icon: 'heroicons:fire' },
      high: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30', icon: 'heroicons:exclamation-triangle' },
      medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30', icon: 'heroicons:exclamation-circle' },
      low: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', icon: 'heroicons:information-circle' },
    };
    return configs[severity.toLowerCase()] || configs.low;
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { bg: string; text: string; border: string; label: string }> = {
      pending: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30', label: '待处理' },
      'in-progress': { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', label: '处理中' },
      review: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30', label: '审核中' },
      completed: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30', label: '已完成' },
    };
    return configs[status.toLowerCase()] || configs.pending;
  };

  // 过滤缺陷
  const filteredDefects = defects.filter(defect => {
    const matchStatus = filterStatus === 'all' || defect.status === filterStatus;
    const matchSeverity = filterSeverity === 'all' || defect.severity === filterSeverity;
    const matchSearch = !searchTerm || 
      defect.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      defect.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      defect.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSeverity && matchSearch;
  });

  // 统计数据
  const stats = {
    total: defects.length,
    critical: defects.filter(d => d.severity === 'critical').length,
    pending: defects.filter(d => d.status === 'pending').length,
    completed: defects.filter(d => d.status === 'completed').length,
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* 顶部统计卡片 */}
      <div className="p-6 pb-0">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5 hover:border-cyan-500/50 transition-all group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1">总缺陷数</p>
                <p className="text-3xl font-bold text-slate-100">{stats.total}</p>
              </div>
              <div className="p-3 bg-cyan-500/10 rounded-lg group-hover:bg-cyan-500/20 transition-colors">
                <Icon icon="heroicons:clipboard-document-list" className="text-cyan-400 text-2xl" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5 hover:border-red-500/50 transition-all group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1">危急缺陷</p>
                <p className="text-3xl font-bold text-red-400">{stats.critical}</p>
              </div>
              <div className="p-3 bg-red-500/10 rounded-lg group-hover:bg-red-500/20 transition-colors">
                <Icon icon="heroicons:fire" className="text-red-400 text-2xl" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5 hover:border-yellow-500/50 transition-all group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1">待处理</p>
                <p className="text-3xl font-bold text-yellow-400">{stats.pending}</p>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-lg group-hover:bg-yellow-500/20 transition-colors">
                <Icon icon="heroicons:clock" className="text-yellow-400 text-2xl" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5 hover:border-green-500/50 transition-all group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1">已完成</p>
                <p className="text-3xl font-bold text-green-400">{stats.completed}</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors">
                <Icon icon="heroicons:check-circle" className="text-green-400 text-2xl" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="p-6">
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-2xl overflow-hidden">
          {/* 工具栏 */}
          <div className="p-6 border-b border-slate-800/50">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                {/* 搜索框 */}
                <div className="relative flex-1 max-w-md">
                  <Icon icon="heroicons:magnifying-glass" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="搜索缺陷类型、位置..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>

                {/* 状态筛选 */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer"
                >
                  <option value="all">全部状态</option>
                  <option value="pending">待处理</option>
                  <option value="in-progress">处理中</option>
                  <option value="review">审核中</option>
                  <option value="completed">已完成</option>
                </select>

                {/* 严重程度筛选 */}
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer"
                >
                  <option value="all">全部等级</option>
                  <option value="critical">危急</option>
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRemoteImportClick}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg font-medium transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <Icon icon="heroicons:cloud-arrow-down" />
                  <span>从远程导入</span>
                </button>
                <button
                  onClick={handleImportClick}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg font-medium transition-all flex items-center gap-2 shadow-lg shadow-purple-500/20"
                >
                  <Icon icon="heroicons:arrow-down-tray" />
                  <span>导入JSON</span>
                </button>
                <button
                  onClick={() => openModal()}
                  className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg font-medium transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20"
                >
                  <Icon icon="heroicons:plus" />
                  <span>新增缺陷</span>
                </button>
                {defects.length > 0 && (
                  <button
                    onClick={handleDeleteAll}
                    disabled={loading}
                    className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-all flex items-center gap-2 shadow-lg shadow-red-500/20"
                  >
                    <Icon icon="heroicons:trash" />
                    <span>删除全部</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 卡片列表 */}
          <div className="p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mb-4"></div>
                <p className="text-slate-400">加载中...</p>
              </div>
            ) : filteredDefects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Icon icon="heroicons:inbox" className="text-slate-600 text-6xl mb-4" />
                <p className="text-slate-400 text-lg">暂无缺陷数据</p>
                <p className="text-slate-600 text-sm mt-2">点击"新增缺陷"创建第一条记录</p>
              </div>
            ) : (
              <div className="space-y-4">
                  {filteredDefects.map((defect) => {
                    const severityConfig = getSeverityConfig(defect.severity);
                    const statusConfig = getStatusConfig(defect.status);
                  
                  // 处理图片源
                  const getImageSrc = (imageData: string | undefined): string => {
                    if (!imageData) return '';
                    if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
                      return imageData;
                    }
                    // 如果是 Base64 数据（JPEG 开头），添加前缀
                    if (imageData.startsWith('/9j/') || imageData.startsWith('iVBORw0KGgo')) {
                      return `data:image/jpeg;base64,${imageData}`;
                    }
                    if (imageData.startsWith('data:image/')) {
                      return imageData;
                    }
                    if (imageData.startsWith('/api/')) {
                      return `http://localhost:8080${imageData}`;
                    }
                    if (imageData.startsWith('/')) {
                      return `http://localhost:8080${imageData}`;
                    }
                    if (imageData.length > 100 && !imageData.includes('/')) {
                      return `data:image/jpeg;base64,${imageData}`;
                    }
                    return imageData;
                  };
                    
                    return (
                    <div
                      key={defect.id}
                      onClick={() => defect.id && handleViewDetail(defect.id)}
                      className="group bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:border-cyan-500/50 transition-all cursor-pointer hover:shadow-lg hover:shadow-cyan-500/10"
                    >
                      <div className="flex gap-4 p-4">
                        {/* 左侧：缩略图 */}
                        <div className="flex-shrink-0">
                          <div className="w-32 h-32 bg-slate-800 rounded-lg overflow-hidden border border-slate-700 group-hover:border-cyan-500/30 transition-colors">
                            {defect.originalImage ? (
                              <img
                                src={getImageSrc(defect.originalImage)}
                                alt={defect.type}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent && !parent.querySelector('.placeholder')) {
                                    const placeholder = document.createElement('div');
                                    placeholder.className = 'placeholder w-full h-full flex items-center justify-center text-slate-600';
                                    placeholder.innerHTML = '<svg class="w-12 h-12" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"/></svg>';
                                    parent.appendChild(placeholder);
                                  }
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-600">
                                <Icon icon="heroicons:photo" className="text-4xl" />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 右侧：信息 */}
                        <div className="flex-1 min-w-0 flex flex-col">
                          {/* 第一行：ID、类型、严重程度 */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-mono font-bold text-cyan-400">#{defect.id}</span>
                              <h3 className="text-lg font-semibold text-slate-100 group-hover:text-cyan-400 transition-colors">
                                {defect.type}
                              </h3>
                            </div>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full border ${severityConfig.bg} ${severityConfig.text} ${severityConfig.border}`}>
                              <Icon icon={severityConfig.icon} className="text-sm" />
                            {defect.severity}
                          </span>
                          </div>

                          {/* 第二行：位置和状态 */}
                          <div className="flex items-center gap-6 mb-3">
                            <div className="flex items-center gap-2 text-slate-400">
                              <Icon icon="heroicons:map-pin" className="text-slate-500" />
                              <span className="text-sm">{defect.location}</span>
                            </div>
                          <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                            {statusConfig.label}
                          </span>
                          </div>

                          {/* 第三行：描述 */}
                          {defect.description && (
                            <p className="text-sm text-slate-400 mb-3 line-clamp-2">
                              {defect.description}
                            </p>
                          )}

                          {/* 第四行：底部信息 */}
                          <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-800">
                            <div className="flex items-center gap-6 text-xs text-slate-500">
                              {defect.confidence !== undefined && (
                                <div className="flex items-center gap-1.5">
                                  <Icon icon="heroicons:chart-bar" />
                                  <span>置信度: <span className="text-cyan-400 font-bold">{(defect.confidence * 100).toFixed(1)}%</span></span>
                                </div>
                              )}
                              <div className="flex items-center gap-1.5">
                                <Icon icon="heroicons:clock" />
                                <span className="font-mono">
                            {defect.createdAt ? new Date(defect.createdAt).toLocaleString('zh-CN', { 
                              month: '2-digit', 
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : '-'}
                          </span>
                              </div>
                            </div>

                            {/* 操作按钮 */}
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openModal(defect);
                                }}
                              className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                              title="编辑"
                            >
                              <Icon icon="heroicons:pencil-square" />
                            </button>
                            <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  defect.id && handleDelete(defect.id);
                                }}
                              className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                              title="删除"
                            >
                              <Icon icon="heroicons:trash" />
                            </button>
                          </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 模态框 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-100">
                {editingDefect ? '编辑缺陷' : '新增缺陷'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Icon icon="heroicons:x-mark" className="text-slate-400 text-xl" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    缺陷类型 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                    placeholder="例如：绝缘子污秽"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    严重程度 <span className="text-red-400">*</span>
                  </label>
                  <select
                    required
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer"
                  >
                    <option value="">请选择</option>
                    <option value="critical">危急 (Critical)</option>
                    <option value="high">高 (High)</option>
                    <option value="medium">中 (Medium)</option>
                    <option value="low">低 (Low)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  位置 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  placeholder="例如：220kV 输电线路 A段"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                  placeholder="详细描述缺陷情况..."
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    状态 <span className="text-red-400">*</span>
                  </label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer"
                  >
                    <option value="pending">待处理</option>
                    <option value="in-progress">处理中</option>
                    <option value="review">审核中</option>
                    <option value="completed">已完成</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">置信度 (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.confidence ? (formData.confidence * 100).toFixed(1) : ''}
                    onChange={(e) => setFormData({ ...formData, confidence: parseFloat(e.target.value) / 100 })}
                    className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                    placeholder="例如：95.5"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white rounded-lg transition-all shadow-lg shadow-cyan-500/20"
                >
                  {loading ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 导入数据模态框 */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="bg-slate-900 border-b border-slate-800 p-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Icon icon="heroicons:arrow-down-tray" className="text-purple-400" />
                导入检测数据
              </h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Icon icon="heroicons:x-mark" className="text-slate-400 text-xl" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Icon icon="heroicons:information-circle" className="text-blue-400 text-xl flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-300">
                    <p className="font-medium mb-2">支持的文件格式：</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-400/80">
                      <li>JSON 格式的检测结果文件</li>
                      <li>包含 defects 数组的数据结构</li>
                      <li>参考 all_defect_types_example.json</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-purple-500/50 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center gap-3"
                >
                  <div className="p-4 bg-purple-500/10 rounded-full">
                    <Icon icon="heroicons:document-arrow-up" className="text-purple-400 text-4xl" />
                  </div>
                  <div>
                    <p className="text-slate-300 font-medium mb-1">点击选择文件</p>
                    <p className="text-slate-500 text-sm">或拖拽 JSON 文件到此处</p>
                  </div>
                </label>
              </div>

              {importMessage && (
                <div className={`rounded-lg p-4 flex items-center gap-3 ${
                  importMessage.type === 'success' 
                    ? 'bg-green-500/10 border border-green-500/30' 
                    : 'bg-red-500/10 border border-red-500/30'
                }`}>
                  <Icon 
                    icon={importMessage.type === 'success' ? 'heroicons:check-circle' : 'heroicons:x-circle'} 
                    className={`text-2xl ${importMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}
                  />
                  <p className={`text-sm ${importMessage.type === 'success' ? 'text-green-300' : 'text-red-300'}`}>
                    {importMessage.text}
                  </p>
                </div>
              )}

              {loading && (
                <div className="flex items-center justify-center gap-3 py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                  <p className="text-slate-400">正在导入数据...</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 远程导入模态框 */}
      {showRemoteImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl">
            <div className="bg-slate-900 border-b border-slate-800 p-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Icon icon="heroicons:cloud-arrow-down" className="text-emerald-400" />
                从远程服务器导入
              </h2>
              <button
                onClick={() => setShowRemoteImportModal(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Icon icon="heroicons:x-mark" className="text-slate-400 text-xl" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Icon icon="heroicons:information-circle" className="text-emerald-400 text-xl flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-emerald-300">
                    <p className="font-medium mb-2">远程文件夹结构：</p>
                    <ul className="list-disc list-inside space-y-1 text-emerald-400/80">
                      <li>每个文件夹包含一次检测的完整数据</li>
                      <li>meta.json - 检测元数据和缺陷信息</li>
                      <li>ir.jpg - 红外热力图</li>
                      <li>rgb.jpg - 检测框图（从RGB转换）</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 文件夹列表 */}
              {remoteFolders.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    选择要导入的文件夹
                  </label>
                  <select
                    value={selectedRemoteFolder}
                    onChange={(e) => setSelectedRemoteFolder(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                  >
                    <option value="">-- 选择文件夹 --</option>
                    {remoteFolders.map((folder) => (
                      <option key={folder} value={folder}>
                        {folder}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-2">
                    共找到 {remoteFolders.length} 个检测文件夹
                  </p>
                </div>
              )}

              {remoteFolders.length === 0 && !remoteImporting && (
                <div className="text-center py-8 text-slate-500">
                  <Icon icon="heroicons:folder-open" className="text-6xl mb-2 mx-auto" />
                  <p>未找到远程文件夹</p>
                  <p className="text-xs mt-2">请检查后端配置中的 remote.folder.path</p>
                </div>
              )}

              {importMessage && (
                <div className={`rounded-lg p-4 flex items-center gap-3 ${
                  importMessage.type === 'success' 
                    ? 'bg-green-500/10 border border-green-500/30' 
                    : 'bg-red-500/10 border border-red-500/30'
                }`}>
                  <Icon 
                    icon={importMessage.type === 'success' ? 'heroicons:check-circle' : 'heroicons:x-circle'} 
                    className={`text-2xl ${importMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}
                  />
                  <p className={`text-sm ${importMessage.type === 'success' ? 'text-green-300' : 'text-red-300'}`}>
                    {importMessage.text}
                  </p>
                </div>
              )}

              {remoteImporting && (
                <div className="flex items-center justify-center gap-3 py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"></div>
                  <p className="text-slate-400">正在导入数据，请稍候...</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRemoteImportModal(false)}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                >
                  关闭
                </button>
                {selectedRemoteFolder && (
                  <button
                    onClick={handleRemoteImportFolder}
                    disabled={remoteImporting}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white rounded-lg transition-all shadow-lg shadow-emerald-500/20"
                  >
                    {remoteImporting ? '导入中...' : '导入选中文件夹'}
                  </button>
                )}
                {remoteFolders.length > 0 && (
                  <button
                    onClick={handleRemoteImportAll}
                    disabled={remoteImporting}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white rounded-lg transition-all shadow-lg shadow-blue-500/20"
                  >
                    {remoteImporting ? '导入中...' : '导入全部'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DefectManagement;

