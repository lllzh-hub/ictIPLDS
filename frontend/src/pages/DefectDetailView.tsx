import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { defectApi, type Defect } from '../api/defectApi';
import Icon from '../components/common/Icon';

const DefectDetailView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [defect, setDefect] = useState<Defect | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<'original' | 'detection' | 'thermal'>('original');

  useEffect(() => {
    if (id) {
      loadDefect(parseInt(id));
    }
  }, [id]);

  const loadDefect = async (defectId: number) => {
    setLoading(true);
    try {
      const data = await defectApi.getDefectById(defectId);
      setDefect(data);
    } catch (error) {
      console.error('加载缺陷详情失败:', error);
      alert('加载失败，请检查后端服务');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'from-rose-600 to-red-600';
      case 'high':
        return 'from-orange-600 to-amber-600';
      case 'medium':
        return 'from-yellow-600 to-amber-500';
      default:
        return 'from-slate-600 to-slate-500';
    }
  };

  const handleMarkAsFalsePositive = async () => {
    if (!confirm('确定要标记为误报吗？')) return;
    
    try {
      if (defect && defect.id) {
        await defectApi.updateDefect(defect.id, {
          ...defect,
          status: 'completed',
          description: (defect.description || '') + '\n[已标记为误报]'
        });
        alert('已标记为误报');
        navigate('/defect-management');
      }
    } catch (error) {
      console.error('标记失败:', error);
      alert('操作失败');
    }
  };

  const handleDispatchTeam = async () => {
    if (!confirm('确定要派遣维修团队吗？')) return;
    
    try {
      if (defect && defect.id) {
        await defectApi.updateDefect(defect.id, {
          ...defect,
          status: 'in-progress'
        });
        alert('维修团队已派遣，状态已更新为"处理中"');
        loadDefect(defect.id);
      }
    } catch (error) {
      console.error('派遣失败:', error);
      alert('操作失败');
    }
  };

  // 处理图片源（支持 URL）
  const getImageSrc = (imageData: string | undefined): string => {
    if (!imageData) return '';
    
    // 如果是 HTTP URL，直接返回
    if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
      return imageData;
    }
    
    // 如果是相对路径，添加服务器地址
    if (imageData.startsWith('/')) {
      return `http://localhost:8081${imageData}`;
    }
    
    // 直接返回（可能是其他格式）
    return imageData;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="text-slate-400 mt-4">加载中...</p>
        </div>
      </div>
    );
  }

  if (!defect) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400">未找到缺陷数据</p>
          <button
            onClick={() => navigate('/defect-management')}
            className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
          >
            返回列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* 头部 */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="h-full px-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/defect-management')}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              title="返回"
            >
              <Icon icon="heroicons:arrow-left" className="text-xl" />
            </button>
            <div className="h-6 w-px bg-slate-700"></div>
            <div className="flex items-center space-x-3">
              <Icon icon="material-symbols:diagnostics-outline" className="text-cyan-400 text-2xl" />
              <h1 className="text-xl font-bold tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
                缺陷诊断分析 #{defect.id}
              </h1>
            </div>
            <div className="h-4 w-px bg-slate-700"></div>
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex flex-col">
                <span className="text-slate-500 text-[10px] uppercase">状态</span>
                <span className={`font-medium flex items-center ${
                  defect.severity.toLowerCase() === 'critical' ? 'text-rose-400' : 
                  defect.severity.toLowerCase() === 'high' ? 'text-orange-400' : 'text-yellow-400'
                }`}>
                  <span className={`w-2 h-2 rounded-full mr-2 animate-pulse ${
                    defect.severity.toLowerCase() === 'critical' ? 'bg-rose-500' : 
                    defect.severity.toLowerCase() === 'high' ? 'bg-orange-500' : 'bg-yellow-500'
                  }`}></span>
                  {defect.severity.toUpperCase()}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-500 text-[10px] uppercase">位置</span>
                <span className="text-slate-300">{defect.location}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-xs font-mono text-cyan-500/70">
              {defect.detectedAt ? new Date(defect.detectedAt).toLocaleString('zh-CN') : ''}
            </span>
          </div>
        </div>
      </header>

      {/* 主体内容 - 三栏布局 */}
      <main className="flex h-[calc(100vh-4rem)]">
        {/* 左侧：图片展示区 (40%) */}
        <section className="w-[40%] border-r border-slate-800 bg-black/40 flex flex-col">
          {/* 图片切换按钮 */}
          <div className="p-3 flex space-x-2">
            <button
              onClick={() => setActiveImage('original')}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeImage === 'original'
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              原始图
            </button>
            <button
              onClick={() => setActiveImage('detection')}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeImage === 'detection'
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              检测图
            </button>
            <button
              onClick={() => setActiveImage('thermal')}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeImage === 'thermal'
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              红外图
            </button>
          </div>

          {/* 图片显示区 */}
          <div className="flex-1 p-4 flex items-center justify-center overflow-hidden">
            {activeImage === 'original' && defect.originalImage ? (
              <img
                src={getImageSrc(defect.originalImage)}
                alt="原始图片"
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                onError={(e) => {
                  console.error('图片加载失败:', defect.originalImage?.substring(0, 100));
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : activeImage === 'detection' && defect.detectionImage ? (
              <img
                src={getImageSrc(defect.detectionImage)}
                alt="检测结果图"
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                onError={(e) => {
                  console.error('图片加载失败:', defect.detectionImage?.substring(0, 100));
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : activeImage === 'thermal' && defect.thermalImage ? (
              <img
                src={getImageSrc(defect.thermalImage)}
                alt="红外热力图"
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                onError={(e) => {
                  console.error('图片加载失败:', defect.thermalImage?.substring(0, 100));
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="text-center text-slate-500">
                <Icon icon="heroicons:photo" className="text-6xl mb-4" />
                <p>暂无图片</p>
              </div>
            )}
          </div>

          {/* 缺陷详细信息 */}
          <div className="p-4 bg-slate-900/60 backdrop-blur-md border-t border-slate-800">
            <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-3">缺陷详情</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">缺陷类型:</span>
                <span className="text-slate-300 font-medium">{defect.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">严重程度:</span>
                <span className={`font-medium ${
                  defect.severity.toLowerCase() === 'critical' ? 'text-rose-400' : 
                  defect.severity.toLowerCase() === 'high' ? 'text-orange-400' : 'text-yellow-400'
                }`}>{defect.severity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">当前状态:</span>
                <span className="text-slate-300">{defect.status}</span>
              </div>
              {defect.confidence !== undefined && (
                <div className="flex justify-between">
                  <span className="text-slate-500">置信度:</span>
                  <span className="text-cyan-400 font-bold">{(defect.confidence * 100).toFixed(1)}%</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 中间：AI 分析 (30%) */}
        <section className="w-[30%] border-r border-slate-800 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Icon icon="simple-icons:openai" className="text-white text-sm" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-emerald-400">AI 智能分析</h2>
                <p className="text-[10px] text-slate-500">多模态数据融合</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {defect.aiAnalysis ? (
              <>
                {defect.aiAnalysis.split('\n\n').map((section, idx) => {
                  const isTitleLine = /^\d+\./.test(section.trim());
                  
                  if (isTitleLine) {
                    const lines = section.split('\n');
                    const title = lines[0];
                    const content = lines.slice(1);
                    
                    // 根据标题选择图标和颜色
                    let icon = 'heroicons:light-bulb';
                    let bgColor = 'bg-emerald-500/10';
                    let borderColor = 'border-emerald-500/30';
                    let iconColor = 'text-emerald-400';
                    
                    if (title.includes('原因')) {
                      icon = 'heroicons:magnifying-glass-circle';
                      bgColor = 'bg-blue-500/10';
                      borderColor = 'border-blue-500/30';
                      iconColor = 'text-blue-400';
                    } else if (title.includes('风险')) {
                      icon = 'heroicons:exclamation-triangle';
                      bgColor = 'bg-orange-500/10';
                      borderColor = 'border-orange-500/30';
                      iconColor = 'text-orange-400';
                    } else if (title.includes('建议')) {
                      icon = 'heroicons:chat-bubble-left-right';
                      bgColor = 'bg-emerald-500/10';
                      borderColor = 'border-emerald-500/30';
                      iconColor = 'text-emerald-400';
                    }
                    
                    return (
                      <div key={idx} className={`${bgColor} border ${borderColor} rounded-lg p-3 space-y-2`}>
                        <div className="flex items-center gap-2">
                          <Icon icon={icon} className={`${iconColor} text-base`} />
                          <h3 className={`${iconColor} font-bold text-sm`}>{title}</h3>
                        </div>
                        <div className="space-y-1.5">
                          {content.map((line, lineIdx) => {
                            if (line.trim().startsWith('-')) {
                              return (
                                <div key={lineIdx} className="flex items-start gap-2 pl-1">
                                  <Icon icon="heroicons:chevron-right" className="text-emerald-400 text-xs mt-0.5 flex-shrink-0" />
                                  <span className="flex-1 text-[11px] text-slate-300">{line.trim().substring(1).trim()}</span>
                                </div>
                              );
                            }
                            return line.trim() ? <p key={lineIdx} className="text-[11px] text-slate-400 pl-1">{line}</p> : null;
                          })}
                        </div>
                      </div>
                    );
                  }
                  
                  return null;
                })}
              </>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Icon icon="heroicons:cpu-chip" className="text-3xl mb-2" />
                <p className="text-xs">暂无 AI 分析结果</p>
              </div>
            )}
          </div>
        </section>

        {/* 右侧：解决方案 (30%) */}
        <section className="w-[30%] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Icon icon="mdi:tools" className="text-white text-sm" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-violet-400">解决方案</h2>
                <p className="text-[10px] text-slate-500">维修和处理方案</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {defect.solution ? (
              <>
                {defect.solution.split('\n\n').map((section, idx) => {
                  const isTitleLine = /^\d+\./.test(section.trim());
                  
                  if (isTitleLine) {
                    const lines = section.split('\n');
                    const title = lines[0];
                    const content = lines.slice(1);
                    
                    // 根据标题选择图标和颜色
                    let icon = 'heroicons:wrench-screwdriver';
                    let bgColor = 'bg-violet-500/10';
                    let borderColor = 'border-violet-500/30';
                    let iconColor = 'text-violet-400';
                    
                    if (title.includes('维修')) {
                      icon = 'heroicons:wrench-screwdriver';
                      bgColor = 'bg-violet-500/10';
                      borderColor = 'border-violet-500/30';
                      iconColor = 'text-violet-400';
                    } else if (title.includes('预防')) {
                      icon = 'heroicons:shield-check';
                      bgColor = 'bg-blue-500/10';
                      borderColor = 'border-blue-500/30';
                      iconColor = 'text-blue-400';
                    } else if (title.includes('应急')) {
                      icon = 'heroicons:bolt';
                      bgColor = 'bg-red-500/10';
                      borderColor = 'border-red-500/30';
                      iconColor = 'text-red-400';
                    }
                    
                    return (
                      <div key={idx} className={`${bgColor} border ${borderColor} rounded-lg p-3 space-y-2`}>
                        <div className="flex items-center gap-2">
                          <Icon icon={icon} className={`${iconColor} text-base`} />
                          <h3 className={`${iconColor} font-bold text-sm`}>{title}</h3>
                        </div>
                        <div className="space-y-1.5">
                          {content.map((line, lineIdx) => {
                            if (line.trim().startsWith('-')) {
                              return (
                                <div key={lineIdx} className="flex items-start gap-2 pl-1">
                                  <Icon icon="heroicons:check-circle" className="text-violet-400 text-xs mt-0.5 flex-shrink-0" />
                                  <span className="flex-1 text-[11px] text-slate-300">{line.trim().substring(1).trim()}</span>
                                </div>
                              );
                            }
                            return line.trim() ? <p key={lineIdx} className="text-[11px] text-slate-400 pl-1">{line}</p> : null;
                          })}
                        </div>
                      </div>
                    );
                  }
                  
                  return null;
                })}
              </>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Icon icon="heroicons:wrench-screwdriver" className="text-3xl mb-2" />
                <p className="text-xs">暂无解决方案</p>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="p-4 border-t border-slate-800 space-y-2">
            <button 
              onClick={handleMarkAsFalsePositive}
              className="w-full px-4 py-2.5 rounded-lg bg-slate-800 text-slate-400 text-xs font-bold border border-slate-700 hover:bg-slate-700 hover:text-white transition-all"
            >
              标记为误报
            </button>
            <button 
              onClick={handleDispatchTeam}
              className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-bold shadow-lg shadow-cyan-900/40 hover:shadow-cyan-900/60 hover:scale-105 active:scale-95 transition-all"
            >
              确认处理
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default DefectDetailView;
