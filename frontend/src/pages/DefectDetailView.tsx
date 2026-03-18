import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { defectApi, aiApi, type Defect } from '../api/defectApi';
import Icon from '../components/common/Icon';
import './DefectDetailView.css';

const DefectDetailView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [defect, setDefect] = useState<Defect | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<'original' | 'detection' | 'thermal'>('original');
  const [imageScale, setImageScale] = useState(1);
  const [imageError, setImageError] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const solutionContainerRef = useRef<HTMLDivElement>(null);
  const [imgNaturalSize, setImgNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [imgDisplaySize, setImgDisplaySize] = useState<{ w: number; h: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // 解析检测框数据
  const getBboxes = useCallback(() => {
    if (!defect) return [];
    try {
      if (activeImage === 'detection' && defect.aiAnalysis) {
        const boxes = JSON.parse(defect.aiAnalysis);
        return Array.isArray(boxes) ? boxes : [];
      }
      if (activeImage === 'thermal' && defect.solution) {
        const boxes = JSON.parse(defect.solution);
        return Array.isArray(boxes) ? boxes : [];
      }
    } catch {
      return [];
    }
    return [];
  }, [defect, activeImage]);

  // 图片加载完成时记录原始尺寸
  const handleImageLoad = useCallback(() => {
    if (imgRef.current) {
      setImgNaturalSize({ w: imgRef.current.naturalWidth, h: imgRef.current.naturalHeight });
      setImgDisplaySize({ w: imgRef.current.clientWidth, h: imgRef.current.clientHeight });
    }
  }, []);

  // 窗口 resize 时更新显示尺寸
  useEffect(() => {
    const update = () => {
      if (imgRef.current && imgRef.current.complete) {
        setImgDisplaySize({ w: imgRef.current.clientWidth, h: imgRef.current.clientHeight });
      }
    };
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // 切换图片时重置尺寸
  useEffect(() => {
    setImgNaturalSize(null);
    setImgDisplaySize(null);
  }, [activeImage]);

  const [aiLoading, setAiLoading] = useState(false);

  const loadDefect = async (defectId: number) => {
    setLoading(true);
    try {
      const data = await defectApi.getDefectById(defectId);
      setDefect(data);
      if (data.originalImage) {
        setActiveImage('original');
      } else if (data.detectionImage) {
        setActiveImage('detection');
      } else if (data.thermalImage) {
        setActiveImage('thermal');
      }
      // 如果没有 AI 分析结果，自动调用 AI 生成
      if (!data.aiTextAnalysis && data.id) {
        generateAiAnalysis(data);
      }
    } catch (error) {
      console.error('加载缺陷详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAiAnalysis = async (defectData: typeof defect) => {
    if (!defectData) return;
    setAiLoading(true);
    try {
      // 传入 defectId，后端会自动从数据库读取图片路径做多模态分析
      const result = await aiApi.analyzeDefect('', defectData.id);
      // 保存 AI 分析结果到数据库
      const updated = await defectApi.updateDefect(defectData.id!, {
        ...defectData,
        aiTextAnalysis: result.analysis,
        aiTextSolution: result.solution,
      });
      setDefect(updated);
    } catch (error) {
      console.error('AI 分析生成失败:', error);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadDefect(parseInt(id));
    }
  }, [id]);

  const getImageSrc = (imageData: string | undefined): string => {
    if (!imageData) return '';
    if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
      return imageData;
    }
    if (imageData.startsWith('/api/')) {
      return `http://localhost:8080${imageData}`;
    }
    if (imageData.startsWith('/')) {
      return `http://localhost:8080${imageData}`;
    }
    return imageData;
  };

  const handleZoomIn = () => {
    setImageScale(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setImageScale(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleResetZoom = () => {
    setImageScale(1);
  };

  const handleDownloadImage = () => {
    const currentImage = 
      activeImage === 'original' ? defect?.originalImage :
      activeImage === 'detection' ? defect?.detectionImage :
      defect?.thermalImage;
    
    if (currentImage) {
      const link = document.createElement('a');
      link.href = getImageSrc(currentImage);
      link.download = `defect-${id}-${activeImage}.jpg`;
      link.click();
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

  const renderAiAnalysis = () => {
    if (aiLoading) {
      return (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="text-slate-400 mt-3 text-xs">AI 正在分析中...</p>
        </div>
      );
    }
    // 如果有 AI 文本分析，直接渲染段落
    if (defect&&defect.aiTextAnalysis) {
      const sections = defect.aiTextAnalysis.split(/\n(?=\d+\.\s)/);
      return (
        <div>
          {sections.map((section, idx) => {
            const lines = section.split('\n');
            const title = lines[0].trim();
            const bullets = lines.slice(1).filter(l => l.trim().startsWith('•'));
            const isNoDefect = title.includes('检测结论') || defect.aiTextAnalysis!.startsWith('1. 检测结论');
            return (
              <div key={idx} className="analysis-section">
                <div className="section-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke={isNoDefect ? '#22c55e' : idx === 0 ? '#0ea5e9' : idx === 1 ? '#fbbf24' : '#94a3b8'}
                    strokeWidth="2" style={{flexShrink:0}}>
                    {isNoDefect
                      ? <><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></>
                      : idx === 0
                        ? <><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><path d="M11 8v3h3"/></>
                        : idx === 1
                          ? <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.05h16.94a2 2 0 0 0 1.71-3.05L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>
                          : <><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>
                    }
                  </svg>
                  {title}
                </div>
                <div className="analysis-text">
                  {bullets.length > 0
                    ? bullets.map((l, i) => <p key={i}>{l.trim()}</p>)
                    : lines.slice(1).filter(l => l.trim()).map((l, i) => <p key={i}>{l.trim()}</p>)
                  }
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    // 没有 AI 文本分析时，从 aiAnalysis 检测框数据生成静态分析
    let boxes: Array<{ class_name: string; score: number; bbox_xyxy: number[]; is_defect: boolean }> = [];
    try { if (defect&&defect.aiAnalysis) boxes = JSON.parse(defect.aiAnalysis); } catch {}
    if (boxes.length > 0) {
      const mainBox = boxes[0];
      const [x1, y1, x2, y2] = mainBox.bbox_xyxy;
      const bboxW = Math.round(x2 - x1);
      const bboxH = Math.round(y2 - y1);
      return (
        <div>
          <div className="analysis-section">
            <div className="section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" style={{flexShrink:0}}>
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><path d="M11 8v3h3"/>
              </svg>
              缺陷原因分析
            </div>
            <div className="analysis-text">
              <p><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" style={{display:'inline',marginRight:'4px',verticalAlign:'middle'}}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>检测到 <span className="highlight">{mainBox.class_name}</span> 类型缺陷，置信度 <span className="highlight">{(mainBox.score * 100).toFixed(1)}%</span>。</p>
              <p><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{display:'inline',marginRight:'4px',verticalAlign:'middle'}}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>缺陷区域位于图像坐标 ({Math.round(x1)}, {Math.round(y1)}) 至 ({Math.round(x2)}, {Math.round(y2)})，区域大小约 {bboxW} × {bboxH} 像素。</p>
              <p><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{display:'inline',marginRight:'4px',verticalAlign:'middle'}}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 1 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>该类型缺陷通常由长期运行磨损、环境腐蚀或外力损伤引起，需及时进行人工复核确认。</p>
            </div>
          </div>
          <div className="analysis-section">
            <div className="section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" style={{flexShrink:0}}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.05h16.94a2 2 0 0 0 1.71-3.05L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              风险评估
            </div>
            <div className="analysis-text">
              <p><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" style={{display:'inline',marginRight:'4px',verticalAlign:'middle'}}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>当前缺陷严重程度评级为 <span className={`highlight ${defect&&defect.severity === 'critical' ? 'danger' : defect&&defect.severity === 'high' ? 'warning' : ''}`}>{defect&&defect.severity === 'critical' ? '严重 (Critical)' : defect&&defect.severity === 'high' ? '高危 (High)' : defect&&defect.severity === 'medium' ? '中等 (Medium)' : '低危 (Low)'}</span>。</p>
              <p><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{display:'inline',marginRight:'4px',verticalAlign:'middle'}}><path d="M12 2a10 10 0 1 0 10 10H12V2z"/></svg>AI 检测置信度 {(mainBox.score * 100).toFixed(1)}%，{mainBox.score >= 0.8 ? '检测结果可信度较高，建议优先处理。' : mainBox.score >= 0.6 ? '检测结果具有一定参考价值，建议结合人工复核。' : '置信度偏低，建议人工到场确认。'}</p>
              <p><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" style={{display:'inline',marginRight:'4px',verticalAlign:'middle'}}><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>若不及时处理，可能导致设备损坏加剧或引发安全事故，建议在 24 小时内安排维护。</p>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="text-center py-8 text-slate-500">
        <Icon icon="heroicons:cpu-chip" className="text-3xl mb-2" />
        <p className="text-xs">暂无 AI 分析结果</p>
      </div>
    );
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
    <div className="dynamic-bg">
      <div className="grid-pattern"></div>
      <div className="floating-particles">
        {[...Array(5)].map((_, i) => <div key={i} className="particle"></div>)}
      </div>

      <div className="main-wrapper">
        {/* 状态栏 */}
        <div className="status-bar">
          <div className="status-left">
            <button
              onClick={() => navigate('/defect-management')}
              className="back-button"
              title="返回上一页"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
            <div className="defect-number">#{defect.id}</div>
            <div className="defect-info">
              <div className="defect-title">缺陷诊断分析</div>
              <div className="defect-location">{defect.location}</div>
            </div>
          </div>
          <div className="status-right">
            <div className="status-badge">待处理</div>
            <div className="quick-metrics">
              <div className="metric-item">
                <div className="metric-value">{(defect.confidence ? defect.confidence * 100 : 0).toFixed(1)}%</div>
                <div className="metric-label">置信度</div>
              </div>
              <div className="metric-item">
                <div className="metric-value">{defect.severity}</div>
                <div className="metric-label">风险等级</div>
              </div>
              <div className="metric-item">
                <div className="metric-value">24h</div>
                <div className="metric-label">建议处理</div>
              </div>
            </div>
          </div>
        </div>

        {/* 主容器 */}
        <div className="main-container">
          {/* 左栏：视觉检测 */}
          <div className="left-panel">
            <div className="panel image-section">
              <div className="panel-header">
                <div className="panel-title">
                  <svg className="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <path d="M21 15l-5-5L5 21"/>
                  </svg>
                  视觉检测
                </div>
                <span className="panel-badge">Live</span>
              </div>

              <div className="image-tabs">
                {defect.originalImage && (
            <button
                    onClick={() => {
                      setActiveImage('original');
                      setImageScale(1);
                      setImageError(false);
                    }}
                    className={`image-tab ${activeImage === 'original' ? 'active' : ''}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                    </svg>
              原始图
            </button>
                )}
                {defect.detectionImage && (
            <button
                    onClick={() => {
                      setActiveImage('detection');
                      setImageScale(1);
                      setImageError(false);
                    }}
                    className={`image-tab ${activeImage === 'detection' ? 'active' : ''}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
              检测图
            </button>
                )}
                {defect.thermalImage && (
            <button
                    onClick={() => {
                      setActiveImage('thermal');
                      setImageScale(1);
                      setImageError(false);
                    }}
                    className={`image-tab ${activeImage === 'thermal' ? 'active' : ''}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="5"/>
                      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                    </svg>
              红外图
            </button>
                )}
          </div>

              <div className="image-container" ref={imageContainerRef}>
            {activeImage === 'original' && defect.originalImage ? (
              <img
                ref={imgRef}
                src={getImageSrc(defect.originalImage)}
                alt="原始图片"
                style={{ transform: `scale(${imageScale})` }}
                onError={() => setImageError(true)}
                onLoad={handleImageLoad}
              />
            ) : activeImage === 'detection' && defect.detectionImage ? (
              <div style={{ position: 'relative', display: 'inline-flex', transform: `scale(${imageScale})`, transformOrigin: 'center' }}>
                <img
                  ref={imgRef}
                  src={getImageSrc(defect.detectionImage)}
                  alt="检测图"
                  style={{ display: 'block', maxWidth: '100%', maxHeight: '100%' }}
                  onError={() => setImageError(true)}
                  onLoad={handleImageLoad}
                />
                {imgNaturalSize && imgDisplaySize && getBboxes().map((box: { bbox_xyxy: number[]; class_name: string; score: number; is_defect: boolean }, idx: number) => {
                  const [x1, y1, x2, y2] = box.bbox_xyxy;
                  const scaleX = imgDisplaySize.w / imgNaturalSize.w;
                  const scaleY = imgDisplaySize.h / imgNaturalSize.h;
                  const rx = x1 * scaleX;
                  const ry = y1 * scaleY;
                  const rw = (x2 - x1) * scaleX;
                  const rh = (y2 - y1) * scaleY;
                  return (
                    <svg key={idx} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
                      <rect x={rx} y={ry} width={rw} height={rh} fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray={box.is_defect ? 'none' : '4,4'} />
                      <rect x={rx} y={ry - 20} width={Math.max(rw, 80)} height="18" fill="rgba(239,68,68,0.85)" rx="2" />
                      <text x={rx + 4} y={ry - 6} fill="white" fontSize="11" fontFamily="monospace">{box.class_name} {(box.score * 100).toFixed(1)}%</text>
                    </svg>
                  );
                })}
              </div>
            ) : activeImage === 'thermal' && defect.thermalImage ? (
              <div style={{ position: 'relative', display: 'inline-flex', transform: `scale(${imageScale})`, transformOrigin: 'center' }}>
                <img
                  ref={imgRef}
                  src={getImageSrc(defect.thermalImage)}
                  alt="红外图"
                  style={{ display: 'block', maxWidth: '100%', maxHeight: '100%' }}
                  onError={() => setImageError(true)}
                  onLoad={handleImageLoad}
                />
                {imgNaturalSize && imgDisplaySize && getBboxes().map((box: { bbox_xyxy: number[]; class_name: string; score: number; is_defect: boolean }, idx: number) => {
                  const [x1, y1, x2, y2] = box.bbox_xyxy;
                  const scaleX = imgDisplaySize.w / imgNaturalSize.w;
                  const scaleY = imgDisplaySize.h / imgNaturalSize.h;
                  const rx = x1 * scaleX;
                  const ry = y1 * scaleY;
                  const rw = (x2 - x1) * scaleX;
                  const rh = (y2 - y1) * scaleY;
                  return (
                    <svg key={idx} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
                      <rect x={rx} y={ry} width={rw} height={rh} fill="none" stroke="#f97316" strokeWidth="2" />
                      <rect x={rx} y={ry - 20} width={Math.max(rw, 80)} height="18" fill="rgba(249,115,22,0.85)" rx="2" />
                      <text x={rx + 4} y={ry - 6} fill="white" fontSize="11" fontFamily="monospace">{box.class_name} {(box.score * 100).toFixed(1)}%</text>
                    </svg>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-slate-500">
                <Icon icon="heroicons:photo" className="text-6xl mb-4" />
                <p>暂无图片</p>
              </div>
            )}
                
                {!imageError && (activeImage === 'original' && defect.originalImage || 
                                 activeImage === 'detection' && defect.detectionImage || 
                                 activeImage === 'thermal' && defect.thermalImage) && (
                  <div className="image-controls">
                    <button className="control-btn" onClick={handleZoomIn} title="放大">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/>
                      </svg>
                    </button>
                    <button className="control-btn" onClick={handleZoomOut} title="缩小">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="M21 21l-4.35-4.35M8 11h6"/>
                      </svg>
                    </button>
                    <button className="control-btn" onClick={handleResetZoom} title="重置">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 4v6h6M23 20v-6h-6"/>
                        <path d="M20.49 9A9 9 0 0 0 5.64 5.64M3.51 15A9 9 0 0 0 18.36 18.36"/>
                      </svg>
                    </button>
                    <button className="control-btn" onClick={handleDownloadImage} title="下载">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                    </button>
              </div>
                )}
              </div>

              <div className="image-meta">
                <div className="image-meta-item">
                  {defect.detectedAt ? new Date(defect.detectedAt).toLocaleString('zh-CN') : ''}
              </div>
                <div className="image-meta-item">
                  {defect.type}
                </div>
              </div>
            </div>
          </div>

          {/* 中栏：AI分析 */}
          <div className="center-panel">
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">
                  <svg className="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2a10 10 0 1 0 10 10H12V2z"/>
                  </svg>
                  AI智能分析
                </div>
                <span className="panel-badge">Auto</span>
              </div>

              <div className="analysis-content">
                {/* 风险可视化 */}
                <div className="risk-visual">
                  <div className="risk-meter">
                    <div className="risk-meter-value">
                      {defect.severity === 'critical' ? '高' : defect.severity === 'high' ? '中' : '低'}
                    </div>
                    <div className="risk-meter-label">当前风险等级</div>
                  </div>
                  <div className="risk-meter">
                    <div className="risk-trend">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                        <polyline points="17 6 23 6 23 12"/>
                      </svg>
                      升级趋势
              </div>
            </div>
          </div>

                {/* 负荷趋势图 */}
                <div className="trend-chart">
                  <div className="trend-header">
                    <div className="trend-title">24小时负荷趋势</div>
                    <div className="trend-live">LIVE</div>
                  </div>
                  <div className="trend-bars">
                    <div className="trend-bar" style={{ height: '35%' }}></div>
                    <div className="trend-bar" style={{ height: '50%' }}></div>
                    <div className="trend-bar high" style={{ height: '75%' }}></div>
                    <div className="trend-bar high" style={{ height: '85%' }}></div>
                    <div className="trend-bar current" style={{ height: '90%' }}></div>
                    <div className="trend-bar" style={{ height: '70%' }}></div>
                    <div className="trend-bar" style={{ height: '55%' }}></div>
                    <div className="trend-bar" style={{ height: '40%' }}></div>
                  </div>
                  <div className="trend-label">
                    <span>00:00</span>
                    <span>06:00</span>
                    <span>12:00</span>
                    <span>18:00</span>
                    <span>当前</span>
                  </div>
                </div>

                {/* AI 分析内容 */}
                {defect.aiTextAnalysis ? (
                  <div className="space-y-4">
                    {defect.aiTextAnalysis.split('\n\n').map((section, idx) => (
                      <div key={idx} className="analysis-section">
                        <div className="section-title">
                          {section.split('\n')[0]}
                        </div>
                        <div className="analysis-text">
                          {section.split('\n').slice(1).map((line, lineIdx) => (
                            line.trim() && <p key={lineIdx}>{line}</p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : renderAiAnalysis()}
              </div>
            </div>
          </div>

          {/* 右栏：执行方案 */}
          <div className="right-panel">
            <div className="panel" ref={solutionContainerRef}>
              <div className="panel-header">
                <div className="panel-title">
                  <svg className="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 1 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                  </svg>
                  执行方案
                </div>
              </div>

              <div className="solution-content">
                <div className="solution-cards">
                    {/* 维修方案卡片 */}
                    <div className="solution-card">
                      <div className="card-header">
                        <svg className="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 1 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                        </svg>
                        <div className="card-title">维修方案</div>
                      </div>
                      <div className="card-content">
                        <ul className="solution-list">
                          {defect.aiTextSolution
                            ? defect.aiTextSolution.split('\n').filter(l => l.trim().startsWith('•')).slice(0, 5).map((line, idx) => (
                                <li key={idx}>{line.replace('•', '').trim()}</li>
                              ))
                            : [
                                '拆除并更换老化或过热的导线及连接金具，采用耐高温材质',
                                '清理塔杆A处积尘、鸟巢等异物，改善散热条件',
                                '对断路器进行分解体检修或更换，确保其保护功能正常',
                                '重新紧固所有电气连接点，使用专业电高压提升接触性能',
                                '完成维修后进行红外成像复查，确认无异常温升',
                              ].map((item, idx) => <li key={idx}>{item}</li>)
                          }
                        </ul>
                      </div>
                    </div>

                    {/* 预防措施卡片 */}
                    <div className="solution-card">
                      <div className="card-header">
                        <svg className="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                        <div className="card-title">预防措施</div>
                      </div>
                      <div className="card-content">
                        <ul className="solution-list">
                          {defect.aiTextAnalysis
                            ? defect.aiTextAnalysis.split('\n').filter(l => l.includes('预防') ? false : l.trim().startsWith('•')).slice(4, 8).map((l, i) => (
                                <li key={i}>{l.replace('•', '').trim()}</li>
                              ))
                            : [
                                '建立线路负荷动态监测机制，设置过载警阈值',
                                '每半年开展一次红外巡检，重点监测负荷线路和关键节点',
                                '加强运维人员培训，提升对过载断路器故障的识别能力',
                                '优化变电站负荷分配策略，避免单线长期高负荷运行',
                              ].map((item, i) => <li key={i}>{item}</li>)
                          }
                        </ul>
                      </div>
                    </div>

                    {/* 应急预案卡片 */}
                    <div className="solution-card">
                      <div className="card-header">
                        <svg className="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.05h16.94a2 2 0 0 0 1.71-3.05L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                          <line x1="12" y1="9" x2="12" y2="13"/>
                          <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                        <div className="card-title">应急预案</div>
                      </div>
                      <div className="card-content">
                        <ul className="solution-list">
                          {defect.aiTextAnalysis
                            ? defect.aiTextAnalysis.split('\n').filter(l => l.trim().startsWith('•')).slice(8).map((l, i) => (
                                <li key={i}>{l.replace('•', '').trim()}</li>
                              ))
                            : [
                                '制定组合故障应急处置流程',
                                '储备关键设备件于变电站附近应急库房',
                                '每季度组织一次联合应急演练',
                                '与调度中心建立实时信息共享通道',
                              ].map((item, i) => <li key={i}>{item}</li>)
                          }
                        </ul>
                      </div>
                    </div>
                  </div>
              </div>
            </div>
          </div>
        </div>

        {/* 操作栏 */}
        <div className="action-bar">
          <div className="action-info">
            <div className="action-item">
              <div className="action-label">检测设备</div>
              <div className="action-value">DJI Mavic 3 Enterprise</div>
            </div>
            <div className="action-item">
              <div className="action-label">检测时间</div>
              <div className="action-value">{defect.detectedAt ? new Date(defect.detectedAt).toLocaleString('zh-CN') : ''}</div>
            </div>
            <div className="action-item">
              <div className="action-label">处理时效</div>
              <div className="action-value">24小时内</div>
            </div>
          </div>
          <div className="action-buttons">
            <button 
              onClick={handleMarkAsFalsePositive}
              className="btn btn-secondary"
            >
              标记为误报
            </button>
            <button 
              onClick={handleDispatchTeam}
              className="btn btn-primary"
            >
              确认处理
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DefectDetailView;
