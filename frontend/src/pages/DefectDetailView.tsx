import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { defectApi, aiApi, type Defect } from '../api/defectApi';
import Icon from '../components/common/Icon';

const DefectDetailView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [defect, setDefect] = useState<Defect | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<'original' | 'detection' | 'thermal'>('original');
  const [analyzing, setAnalyzing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (id) {
      loadDefect(parseInt(id));
    }
  }, [id]);

  // 当切换图片时，重新绘制
  useEffect(() => {
    if (activeImage === 'detection' && defect?.detectionImage && defect?.aiAnalysis) {
      // 延迟一下确保 canvas 已经挂载
      setTimeout(() => {
        drawDetectionBoxes(defect.detectionImage, defect.aiAnalysis);
      }, 100);
    } else if (activeImage === 'thermal' && defect?.thermalImage && defect?.solution) {
      setTimeout(() => {
        drawDetectionBoxes(defect.thermalImage, defect.solution);
      }, 100);
    }
  }, [activeImage, defect]);

  const loadDefect = async (defectId: number) => {
    setLoading(true);
    try {
      const data = await defectApi.getDefectById(defectId);
      
      // 如果没有 AI 文本分析，自动生成默认分析
      if (!data.aiTextAnalysis) {
        try {
          const taskInfo = `缺陷类型: ${data.type}\n位置: ${data.location}\n严重程度: ${data.severity}\n描述: ${data.description || '无'}`;
          const result = await aiApi.analyzeDefect(taskInfo);
          data.aiTextAnalysis = result.analysis;
          data.aiTextSolution = result.solution;
          
          // 保存到后端
          if (data.id) {
            await defectApi.updateDefect(data.id, data);
          }
        } catch (error) {
          console.error('自动生成 AI 分析失败:', error);
        }
      }
      
      setDefect(data);
      
      // 设置初始显示的图片
      if (data.originalImage) {
        setActiveImage('original');
      } else if (data.detectionImage) {
        setActiveImage('detection');
      } else if (data.thermalImage) {
        setActiveImage('thermal');
      }
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

  const handleAIAnalysis = async () => {
    if (!defect) return;
    
    setAnalyzing(true);
    try {
      const taskInfo = `缺陷类型: ${defect.type}\n位置: ${defect.location}\n严重程度: ${defect.severity}\n描述: ${defect.description || '无'}`;
      const result = await aiApi.analyzeDefect(taskInfo);
      
      if (defect.id) {
        await defectApi.updateDefect(defect.id, {
          ...defect,
          aiTextAnalysis: result.analysis,
          aiTextSolution: result.solution
        });
        setDefect({ 
          ...defect, 
          aiTextAnalysis: result.analysis,
          aiTextSolution: result.solution
        });
      }
    } catch (error) {
      console.error('AI 分析失败:', error);
      alert('AI 分析失败，请检查后端服务');
    } finally {
      setAnalyzing(false);
    }
  };

  // 绘制检测框
  const drawDetectionBoxes = (imageData: string | undefined, jsonData: string | undefined) => {
    if (!imageData || !jsonData) {
      console.warn('缺少图片或检测数据');
      return;
    }

    try {
      const detections = JSON.parse(jsonData);
      const canvas = canvasRef.current;
      if (!canvas) {
        console.warn('Canvas 引用不存在');
        return;
      }
      
      const imageSrc = getImageSrc(imageData);
      console.log('加载图片:', imageSrc);
      
      // 先清空 canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          console.log('图片加载成功，原始尺寸:', img.width, 'x', img.height);
          
          // 获取容器尺寸
          const container = canvas.parentElement;
          if (!container) {
            console.error('容器不存在');
            return;
          }
          
          const containerWidth = container.clientWidth;
          const containerHeight = container.clientHeight;
          console.log('容器尺寸:', containerWidth, 'x', containerHeight);
          
          // 计算缩放比例，保持宽高比
          const imgAspect = img.width / img.height;
          const containerAspect = containerWidth / containerHeight;
          
          let canvasWidth, canvasHeight;
          if (imgAspect > containerAspect) {
            // 图片更宽
            canvasWidth = containerWidth;
            canvasHeight = containerWidth / imgAspect;
          } else {
            // 图片更高
            canvasHeight = containerHeight;
            canvasWidth = containerHeight * imgAspect;
          }
          
          console.log('Canvas 尺寸:', canvasWidth, 'x', canvasHeight);
          
          // 设置 canvas 的实际绘制尺寸（内部分辨率）
          canvas.width = img.width;
          canvas.height = img.height;
          
          // 设置 canvas 的显示尺寸（CSS）
          canvas.style.width = canvasWidth + 'px';
          canvas.style.height = canvasHeight + 'px';
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            console.error('无法获取 canvas context');
            return;
          }
          
          // 绘制图片
          ctx.drawImage(img, 0, 0);
          console.log('图片已绘制到 canvas');
          
          // 绘制检测框
          if (Array.isArray(detections)) {
            console.log('绘制检测框，数量:', detections.length);
            detections.forEach((detection: any, idx: number) => {
              let x1, y1, x2, y2;
              
              if (detection.bbox_xyxy && Array.isArray(detection.bbox_xyxy)) {
                [x1, y1, x2, y2] = detection.bbox_xyxy;
              } else if (detection.bbox && Array.isArray(detection.bbox)) {
                const [x, y, w, h] = detection.bbox;
                x1 = x;
                y1 = y;
                x2 = x + w;
                y2 = y + h;
              } else {
                console.warn('检测框 ' + idx + ' 格式不支持:', detection);
                return;
              }
              
              console.log('绘制框 ' + idx + ':', x1, y1, x2, y2);
              
              // 绘制矩形框
              ctx.strokeStyle = '#00ff00';
              ctx.lineWidth = 2;
              ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
              
              // 绘制标签
              const label = detection.class_name || detection.type || '检测';
              const confidence = detection.score ? (detection.score * 100).toFixed(1) : '0';
              const text = `${label} ${confidence}%`;
              
              ctx.fillStyle = '#00ff00';
              ctx.font = 'bold 14px Arial';
              const textWidth = ctx.measureText(text).width;
              ctx.fillRect(x1, y1 - 25, textWidth + 10, 25);
              
              ctx.fillStyle = '#000000';
              ctx.fillText(text, x1 + 5, y1 - 8);
            });
          }
        } catch (error) {
          console.error('绘制过程中出错:', error);
        }
      };
      
      img.onerror = (e) => {
        console.error('图片加载失败:', imageSrc, e);
      };
      
      img.src = imageSrc;
    } catch (error) {
      console.error('绘制检测框失败:', error);
    }
  };

  // 处理图片源（支持 URL 和 Base64）
  const getImageSrc = (imageData: string | undefined): string => {
    if (!imageData) return '';
    
    // 如果是 HTTP URL，直接返回
    if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
      return imageData;
    }
    
    // 如果是 Base64 数据（JPEG 开头），添加前缀
    if (imageData.startsWith('/9j/') || imageData.startsWith('iVBORw0KGgo')) {
      // /9j/ 是 JPEG Base64 的开头
      // iVBORw0KGgo 是 PNG Base64 的开头
      return `data:image/jpeg;base64,${imageData}`;
    }
    
    // 如果是 Base64 数据，直接返回
    if (imageData.startsWith('data:image/')) {
      return imageData;
    }
    
    // 如果是 API 路径，添加服务器地址
    if (imageData.startsWith('/api/')) {
      return `http://localhost:8080${imageData}`;
    }
    
    // 如果是相对路径，添加服务器地址
    if (imageData.startsWith('/')) {
      return `http://localhost:8080${imageData}`;
    }
    
    // 假设是 Base64 编码的图片数据，添加前缀
    if (imageData.length > 100 && !imageData.includes('/')) {
      return `data:image/jpeg;base64,${imageData}`;
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
            {defect.originalImage && (
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
            )}
            {defect.detectionImage && (
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
            )}
            {defect.thermalImage && (
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
            )}
          </div>

          {/* 图片显示区 */}
          <div className="flex-1 p-4 flex items-center justify-center overflow-hidden bg-black/60">
            {activeImage === 'original' && defect.originalImage ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  ref={imageRef}
                  src={getImageSrc(defect.originalImage)}
                  alt="原始图片"
                  className="hidden"
                  onLoad={() => drawDetectionBoxes(defect.originalImage, '[]')}
                  onError={(e) => {
                    console.error('图片加载失败:', defect.originalImage?.substring(0, 100));
                  }}
                />
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-full rounded-lg shadow-2xl"
                  style={{ display: 'block', maxWidth: '100%', maxHeight: '100%' }}
                />
              </div>
            ) : activeImage === 'detection' && defect.detectionImage ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  ref={imageRef}
                  src={getImageSrc(defect.detectionImage)}
                  alt="检测结果图"
                  className="hidden"
                  onLoad={() => drawDetectionBoxes(defect.detectionImage, defect.aiAnalysis)}
                  onError={(e) => {
                    console.error('图片加载失败:', defect.detectionImage?.substring(0, 100));
                  }}
                />
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-full rounded-lg shadow-2xl"
                  style={{ display: 'block', maxWidth: '100%', maxHeight: '100%' }}
                />
              </div>
            ) : activeImage === 'thermal' && defect.thermalImage ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  ref={imageRef}
                  src={getImageSrc(defect.thermalImage)}
                  alt="红外热力图"
                  className="hidden"
                  onLoad={() => drawDetectionBoxes(defect.thermalImage, defect.solution)}
                  onError={(e) => {
                    console.error('图片加载失败:', defect.thermalImage?.substring(0, 100));
                  }}
                />
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-full rounded-lg shadow-2xl"
                  style={{ display: 'block', maxWidth: '100%', maxHeight: '100%' }}
                />
              </div>
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
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Icon icon="simple-icons:openai" className="text-white text-sm" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-emerald-400">AI 智能分析</h2>
                <p className="text-[10px] text-slate-500">多模态数据融合</p>
              </div>
            </div>
            {!defect.aiTextAnalysis && (
              <button
                onClick={handleAIAnalysis}
                disabled={analyzing}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1"
              >
                {analyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                    分析中...
                  </>
                ) : (
                  <>
                    <Icon icon="heroicons:sparkles" className="text-sm" />
                    分析
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {defect.aiTextAnalysis ? (
              <>
                {defect.aiTextAnalysis.split('\n\n').map((section, idx) => {
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
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Icon icon="mdi:tools" className="text-white text-sm" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-violet-400">解决方案</h2>
                <p className="text-[10px] text-slate-500">维修和处理方案</p>
              </div>
            </div>
            {!defect.aiTextSolution && defect.aiTextAnalysis && (
              <button
                onClick={handleAIAnalysis}
                disabled={analyzing}
                className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1"
              >
                <Icon icon="heroicons:sparkles" className="text-sm" />
                生成
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {defect.aiTextSolution ? (
              <>
                {defect.aiTextSolution.split('\n\n').map((section, idx) => {
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
