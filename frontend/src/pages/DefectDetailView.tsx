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
      // 传入 defectId，后端会自动从数据库读取图片做多模态分析并持久化结果
      await aiApi.analyzeDefect('', defectData.id);
      // 重新从数据库拉取最新数据（后端已写库，直接刷新即可）
      const updated = await defectApi.getDefectById(defectData.id!);
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
    // 如果有 AI 文本分析，直接渲染段落（只渲染前2个：缺陷原因分析、风险评估）
    if (defect&&defect.aiTextAnalysis) {
      // 将数据库中的字面 \n 转换为真正的换行符
      const normalized = defect.aiTextAnalysis.replace(/\\n/g, '\n');
      // 过滤掉 [VERDICT:xxx] 标记行
      const cleanedAnalysis = normalized.replace(/\[VERDICT:[^\]]+\]\s*\n?/g, '').trim();
      const sections = cleanedAnalysis.split(/\n(?=\d+\.\s)/).slice(0, 2);

      // 每个section对应的个性化图标配置
      const sectionIcons = [
        {
          // 缺陷原因分析 - 时钟图标，白色
          bg: 'rgba(255,255,255,0.1)',
          border: 'rgba(255,255,255,0.2)',
          color: '#f1f5f9',
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          ),
        },
        {
          // 风险评估 - 三角警告图标，红色
          bg: 'rgba(239,68,68,0.15)',
          border: 'rgba(239,68,68,0.3)',
          color: '#ef4444',
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.05h16.94a2 2 0 0 0 1.71-3.05L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          ),
        },
      ];

      // 高亮百分比数字的函数
      const highlightPercentages = (text: string) => {
        // 匹配百分比模式：数字 + %
        const parts = text.split(/(\d+\.?\d*%)/g);
        return parts.map((part, i) => {
          if (/\d+\.?\d*%/.test(part)) {
            return <span key={i} style={{color: '#06b6d4', fontWeight: 700}}>{part}</span>;
          }
          return part;
        });
      };

      // 如果sections为空或内容不足，使用预置内容
      if (sections.length === 0 || sections.every(s => s.trim().length < 10)) {
        return (
          <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
            <div style={{
              background:'rgba(255,255,255,0.04)',
              border:'1px solid rgba(255,255,255,0.12)',
              borderRadius:'10px',
              padding:'16px'
            }}>
              <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'12px',paddingBottom:'10px',borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
                <span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:'28px',height:'28px',borderRadius:'50%',background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',flexShrink:0}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </span>
                <span style={{color:'#f1f5f9',fontWeight:600,fontSize:'14px'}}>缺陷原因分析</span>
              </div>
              <ul style={{listStyle:'none',padding:0,margin:0,display:'flex',flexDirection:'column',gap:'8px'}}>
                <li style={{display:'flex',gap:'8px',alignItems:'flex-start'}}><span style={{color:'#06b6d4',fontWeight:700,fontSize:'16px',lineHeight:'1.5',flexShrink:0}}>•</span><span style={{color:'#cbd5e1',fontSize:'13px',lineHeight:'1.7'}}>红外检测显示线路存在 <span style={{color:'#06b6d4',fontWeight:700}}>78.8%</span> 的过载概率，该线路长期处于高负荷运行状态。</span></li>
                <li style={{display:'flex',gap:'8px',alignItems:'flex-start'}}><span style={{color:'#06b6d4',fontWeight:700,fontSize:'16px',lineHeight:'1.5',flexShrink:0}}>•</span><span style={{color:'#cbd5e1',fontSize:'13px',lineHeight:'1.7'}}>线路连接部位可能存在接触不良或紧固件松动，引发局部过热。</span></li>
                <li style={{display:'flex',gap:'8px',alignItems:'flex-start'}}><span style={{color:'#06b6d4',fontWeight:700,fontSize:'16px',lineHeight:'1.5',flexShrink:0}}>•</span><span style={{color:'#cbd5e1',fontSize:'13px',lineHeight:'1.7'}}>塔杆A处红外异常与故障断路器提示 <span style={{color:'#06b6d4',fontWeight:700}}>31.8%</span> 可能存在保护装置响应滞后。</span></li>
              </ul>
            </div>
            <div style={{
              background:'rgba(239,68,68,0.05)',
              border:'1px solid rgba(239,68,68,0.25)',
              borderRadius:'10px',
              padding:'16px'
            }}>
              <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'12px',paddingBottom:'10px',borderBottom:'1px solid rgba(239,68,68,0.2)'}}>
                <span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:'28px',height:'28px',borderRadius:'50%',background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.3)',flexShrink:0}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.05h16.94a2 2 0 0 0 1.71-3.05L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </span>
                <span style={{color:'#ef4444',fontWeight:600,fontSize:'14px'}}>风险评估</span>
              </div>
              <ul style={{listStyle:'none',padding:0,margin:0,display:'flex',flexDirection:'column',gap:'8px'}}>
                <li style={{display:'flex',gap:'8px',alignItems:'flex-start'}}><span style={{color:'#ef4444',fontWeight:700,fontSize:'16px',lineHeight:'1.5',flexShrink:0}}>•</span><span style={{color:'#cbd5e1',fontSize:'13px',lineHeight:'1.7'}}>风险等级：中等风险，但存在升级为高风险的可能，需立即关注。</span></li>
                <li style={{display:'flex',gap:'8px',alignItems:'flex-start'}}><span style={{color:'#ef4444',fontWeight:700,fontSize:'16px',lineHeight:'1.5',flexShrink:0}}>•</span><span style={{color:'#cbd5e1',fontSize:'13px',lineHeight:'1.7'}}>过载可能导致线缆垂弧增大、绝缘老化加速，增加断线或短路风险。</span></li>
                <li style={{display:'flex',gap:'8px',alignItems:'flex-start'}}><span style={{color:'#ef4444',fontWeight:700,fontSize:'16px',lineHeight:'1.5',flexShrink:0}}>•</span><span style={{color:'#cbd5e1',fontSize:'13px',lineHeight:'1.7'}}>故障断路器可能在系统异常时无法及时切断故障，引发连锁跳闸。</span></li>
              </ul>
            </div>
          </div>
        );
      }

      return (
        <div style={{display:'flex', flexDirection:'column', gap:'16px'}}>
          {sections.map((section, idx) => {
            const lines = section.split('\n');
            const title = lines[0].trim().replace(/^\d+\.\s*/, '');
            const contentLines = lines.slice(1).filter(l => l.trim() && !l.trim().startsWith('[VERDICT'));
            const iconCfg = sectionIcons[idx] ?? sectionIcons[0];
            if (contentLines.length === 0) return null;
            return (
              <div key={idx} className={`solution-card ${idx === 1 ? 'analysis-card-danger' : 'analysis-card-default'}`}>
                <div className="card-header">
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: iconCfg.bg, border: `1px solid ${iconCfg.border}`, flexShrink: 0,
                  }}>
                    {iconCfg.icon}
                  </span>
                  <span className="card-title" style={{color: iconCfg.color}}>{title}</span>
                </div>
                <div className="card-content">
                  <ul className="emergency-list">
                    {contentLines.map((line, i) => {
                      const cleanLine = line.trim().replace(/^•\s*/, '');
                      if (!cleanLine) return null;
                      return <li key={i}>{highlightPercentages(cleanLine)}</li>;
                    })}
                  </ul>
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
      const confidence = (mainBox.score * 100).toFixed(1);
      
      return (
        <div>
          <div className="analysis-section">
            <div className="section-title" style={{
              display:'flex',
              alignItems:'center',
              gap:'10px',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '1px solid rgba(51, 65, 85, 0.6)'
            }}>
              <span style={{
                display:'inline-flex',
                alignItems:'center',
                justifyContent:'center',
                width:'28px',
                height:'28px',
                borderRadius:'50%',
                background:'rgba(255,255,255,0.1)',
                border:'1px solid rgba(255,255,255,0.2)',
                flexShrink:0
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </span>
              <span style={{color:'#f1f5f9',fontWeight:600,fontSize:'15px'}}>缺陷原因分析</span>
            </div>
            <div className="analysis-text" style={{lineHeight:'1.8',color:'#cbd5e1'}}>
              <p style={{marginBottom:'12px'}}>检测到 {mainBox.class_name} 类型缺陷，置信度 <span style={{color:'#06b6d4',fontWeight:700}}>{confidence}%</span>。</p>
              <p style={{marginBottom:'12px'}}>缺陷区域位于图像坐标 ({Math.round(x1)}, {Math.round(y1)}) 至 ({Math.round(x2)}, {Math.round(y2)})，区域大小约 {bboxW} × {bboxH} 像素。</p>
              <p style={{marginBottom:'12px'}}>该类型缺陷通常由长期运行磨损、环境腐蚀或外力损伤引起，需及时进行人工复核确认。</p>
            </div>
          </div>
          <div className="analysis-section">
            <div className="section-title" style={{
              display:'flex',
              alignItems:'center',
              gap:'10px',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '1px solid rgba(51, 65, 85, 0.6)'
            }}>
              <span style={{
                display:'inline-flex',
                alignItems:'center',
                justifyContent:'center',
                width:'28px',
                height:'28px',
                borderRadius:'50%',
                background:'rgba(239,68,68,0.15)',
                border:'1px solid rgba(239,68,68,0.3)',
                flexShrink:0
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.05h16.94a2 2 0 0 0 1.71-3.05L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </span>
              <span style={{color:'#ef4444',fontWeight:600,fontSize:'15px'}}>风险评估</span>
            </div>
            <div className="analysis-text" style={{lineHeight:'1.8',color:'#cbd5e1'}}>
              <p style={{marginBottom:'12px'}}>风险等级：{defect&&defect.severity === 'critical' ? '严重风险' : defect&&defect.severity === 'high' ? '中等风险' : '低风险'}，但存在升级为高风险的可能，需立即关注。</p>
              <p style={{marginBottom:'12px'}}>过载可能导致线缆垂弧增大、绝缘老化加速，增加断线或短路风险。</p>
              <p style={{marginBottom:'12px'}}>故障断路器可能在系统异常时无法及时切断故障，引发连锁跳闸。</p>
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

  type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
  interface TimelinePoint { tYears: number; severity: SeverityLevel; label?: string; }

  const parseSeverityTimeline = (timeline?: string): TimelinePoint[] => {
    if (!timeline) return [];
    try {
      const arr = JSON.parse(timeline);
      if (!Array.isArray(arr)) return [];
      return arr
        .filter((x: unknown) => {
          if (!x || typeof x !== 'object') return false;
          const o = x as Record<string, unknown>;
          return typeof o.tYears === 'number' && typeof o.severity === 'string' &&
            ['low','medium','high','critical'].includes(o.severity as string);
        })
        .map((x: unknown) => {
          const o = x as Record<string, unknown>;
          return { tYears: o.tYears as number, severity: o.severity as SeverityLevel, label: o.label as string | undefined };
        });
    } catch {
      return [];
    }
  };

  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  const renderTrendDevelopment = () => {
    const rawPoints = parseSeverityTimeline(defect?.severityTimeline);

    // 无真实数据时渲染预置占位图
    if (!rawPoints.length) {
      // 预置示意数据：模拟一条典型劣化曲线
      const placeholderPoints: TimelinePoint[] = [
        { tYears: 0,  severity: 'low',      label: '初期发现' },
        { tYears: 2,  severity: 'low',      label: '缓慢发展' },
        { tYears: 5,  severity: 'medium',   label: '逐步劣化' },
        { tYears: 8,  severity: 'high',     label: '加速恶化' },
        { tYears: 12, severity: 'critical', label: '临界失效' },
      ];
      const SEV_ORDER_P: SeverityLevel[] = ['low', 'medium', 'high', 'critical'];
      const SEV_LABEL_P: Record<SeverityLevel, string> = { low: '轻微', medium: '中等', high: '严重', critical: '高危' };
      const SEV_COLOR_P: Record<SeverityLevel, string> = { low: '#22c55e', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' };
      const W = 340, H = 180, PAD_L = 44, PAD_R = 16, PAD_T = 20, PAD_B = 36;
      const chartW = W - PAD_L - PAD_R;
      const chartH = H - PAD_T - PAD_B;
      const maxT = 12;
      const xOf = (t: number) => PAD_L + (t / maxT) * chartW;
      const yOf = (s: SeverityLevel) => PAD_T + ((3 - SEV_ORDER_P.indexOf(s)) / 3) * chartH;
      const linePath = placeholderPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(p.tYears)},${yOf(p.severity)}`).join(' ');
      const areaPath = linePath +
        ` L${xOf(12)},${PAD_T + chartH} L${xOf(0)},${PAD_T + chartH} Z`;
      return (
        <div className="trend-chart" style={{ padding: '12px 8px 8px', marginBottom: '16px', position: 'relative' }}>
          {/* 等待AI标记 */}
          <div style={{
            position: 'absolute', top: 8, right: 8, zIndex: 2,
            fontSize: '9px', color: '#475569', background: 'rgba(30,41,59,0.8)',
            border: '1px solid #334155', borderRadius: '4px', padding: '2px 6px',
            fontFamily: 'monospace', letterSpacing: '0.5px'
          }}>待 AI 分析</div>
          <div className="trend-header" style={{ marginBottom: '6px' }}>
            <div className="trend-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              缺陷发展趋势
            </div>
            <div style={{ fontSize: '10px', color: '#475569', fontFamily: 'monospace' }}>示意图</div>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', opacity: 0.45 }}>
            <defs>
              <linearGradient id="phAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3"/>
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02"/>
              </linearGradient>
              <linearGradient id="phLineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#22c55e"/>
                <stop offset="100%" stopColor="#ef4444"/>
              </linearGradient>
            </defs>
            {SEV_ORDER_P.map((s, i) => {
              const yy = PAD_T + ((3 - i) / 3) * chartH;
              return (
                <g key={s}>
                  <line x1={PAD_L} y1={yy} x2={W - PAD_R} y2={yy}
                    stroke="rgba(148,163,184,0.1)" strokeWidth="1" strokeDasharray={i === 0 ? 'none' : '3,4'}/>
                  <text x={PAD_L - 6} y={yy + 4} textAnchor="end" fill={SEV_COLOR_P[s]} fontSize="9" fontWeight="600">{SEV_LABEL_P[s]}</text>
                </g>
              );
            })}
            <line x1={PAD_L} y1={PAD_T + chartH} x2={W - PAD_R} y2={PAD_T + chartH} stroke="rgba(148,163,184,0.2)" strokeWidth="1"/>
            <path d={areaPath} fill="url(#phAreaGrad)"/>
            <path d={linePath} fill="none" stroke="url(#phLineGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6,3"/>
            {placeholderPoints.map((p, i) => (
              <g key={i}>
                <circle cx={xOf(p.tYears)} cy={yOf(p.severity)} r="4" fill="#0f172a" stroke={SEV_COLOR_P[p.severity]} strokeWidth="1.5"/>
                <circle cx={xOf(p.tYears)} cy={yOf(p.severity)} r="1.5" fill={SEV_COLOR_P[p.severity]}/>
                <text x={xOf(p.tYears)} y={PAD_T + chartH + 13} textAnchor="middle" fill="rgba(148,163,184,0.5)" fontSize="8">
                  {p.tYears === 0 ? '当前' : `+${p.tYears}年`}
                </text>
              </g>
            ))}
          </svg>
          <div style={{ textAlign: 'center', fontSize: '10px', color: '#334155', marginTop: '2px' }}>
            趋势曲线将在 AI 分析完成后自动更新
          </div>
        </div>
      );
    }

    const points = rawPoints;

    // 严重程度映射
    const SEV_ORDER: SeverityLevel[] = ['low', 'medium', 'high', 'critical'];
    const SEV_LABEL: Record<SeverityLevel, string> = { low: '轻微', medium: '中等', high: '严重', critical: '高危' };
    const SEV_COLOR: Record<SeverityLevel, string> = {
      low:      '#22c55e',
      medium:   '#f59e0b',
      high:     '#f97316',
      critical: '#ef4444',
    };

    // SVG 尺寸
    const W = 340, H = 180;
    const PAD_L = 44, PAD_R = 16, PAD_T = 20, PAD_B = 36;
    const chartW = W - PAD_L - PAD_R;
    const chartH = H - PAD_T - PAD_B;

    const maxT = Math.max(...points.map(p => p.tYears));
    const xOf = (t: number) => PAD_L + (maxT === 0 ? chartW / 2 : (t / maxT) * chartW);
    const yOf = (s: SeverityLevel) => PAD_T + ((3 - SEV_ORDER.indexOf(s)) / 3) * chartH;

    // 折线路径
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(p.tYears)},${yOf(p.severity)}`).join(' ');

    // 渐变填充路径（折线 + 底边）
    const areaPath = linePath +
      ` L${xOf(points[points.length - 1].tYears)},${PAD_T + chartH}` +
      ` L${xOf(points[0].tYears)},${PAD_T + chartH} Z`;

    // 最后一个点的严重程度色
    const lastSev = points[points.length - 1].severity;
    const accentColor = SEV_COLOR[lastSev];

    return (
      <div className="trend-chart" style={{ padding: '12px 8px 8px', marginBottom: '16px' }}>
        <div className="trend-header" style={{ marginBottom: '6px' }}>
          <div className="trend-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            缺陷发展趋势
          </div>
          <div className="trend-live" style={{ color: accentColor }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: accentColor, display: 'inline-block', marginRight: 4 }}></span>
            预测
          </div>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
          <defs>
            {/* 区域渐变 */}
            <linearGradient id="trendAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accentColor} stopOpacity="0.35"/>
              <stop offset="100%" stopColor={accentColor} stopOpacity="0.02"/>
            </linearGradient>
            {/* 折线渐变（左→右按严重程度色变化） */}
            <linearGradient id="trendLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={SEV_COLOR[points[0].severity]}/>
              <stop offset="100%" stopColor={accentColor}/>
            </linearGradient>
            {/* 数据点光晕滤镜 */}
            <filter id="dotGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* Y 轴参考线 + 标签 */}
          {SEV_ORDER.map((s, i) => {
            const yy = PAD_T + ((3 - i) / 3) * chartH;
            return (
              <g key={s}>
                <line
                  x1={PAD_L} y1={yy} x2={W - PAD_R} y2={yy}
                  stroke="rgba(148,163,184,0.1)" strokeWidth="1"
                  strokeDasharray={i === 0 ? 'none' : '3,4'}
                />
                <text x={PAD_L - 6} y={yy + 4} textAnchor="end" fill={SEV_COLOR[s]} fontSize="9" fontWeight="600">
                  {SEV_LABEL[s]}
                </text>
              </g>
            );
          })}

          {/* X 轴基线 */}
          <line x1={PAD_L} y1={PAD_T + chartH} x2={W - PAD_R} y2={PAD_T + chartH}
            stroke="rgba(148,163,184,0.2)" strokeWidth="1"/>

          {/* 渐变区域填充 */}
          <path d={areaPath} fill="url(#trendAreaGrad)"/>

          {/* 折线 */}
          <path d={linePath} fill="none" stroke="url(#trendLineGrad)" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"/>

          {/* 数据点 */}
          {points.map((p, i) => {
            const cx = xOf(p.tYears);
            const cy = yOf(p.severity);
            const color = SEV_COLOR[p.severity];
            const isHover = hoveredPoint === i;
            return (
              <g key={i}
                onMouseEnter={() => setHoveredPoint(i)}
                onMouseLeave={() => setHoveredPoint(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* 外圈光晕 */}
                <circle cx={cx} cy={cy} r={isHover ? 10 : 7} fill={color} opacity="0.15" filter="url(#dotGlow)"/>
                {/* 外圈 */}
                <circle cx={cx} cy={cy} r={isHover ? 6 : 4.5} fill="#0f172a" stroke={color} strokeWidth={isHover ? 2.5 : 2}/>
                {/* 内点 */}
                <circle cx={cx} cy={cy} r={isHover ? 3 : 2} fill={color}/>

                {/* X 轴刻度 */}
                <text x={cx} y={PAD_T + chartH + 14} textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="9">
                  {p.tYears === 0 ? '当前' : `+${p.tYears}年`}
                </text>

                {/* Hover 工具提示 */}
                {isHover && (() => {
                  const tipW = 88, tipH = 36;
                  const tipX = Math.min(Math.max(cx - tipW / 2, PAD_L), W - PAD_R - tipW);
                  const tipY = cy - tipH - 10;
                  return (
                    <g>
                      <rect x={tipX} y={tipY} width={tipW} height={tipH}
                        rx="5" fill="#1e293b" stroke={color} strokeWidth="1" opacity="0.97"/>
                      <text x={tipX + tipW / 2} y={tipY + 13} textAnchor="middle"
                        fill={color} fontSize="10" fontWeight="700">
                        {SEV_LABEL[p.severity]}
                      </text>
                      <text x={tipX + tipW / 2} y={tipY + 27} textAnchor="middle"
                        fill="#94a3b8" fontSize="9">
                        {p.label ?? (p.tYears === 0 ? '初始检测' : `第${p.tYears}年`)}
                      </text>
                    </g>
                  );
                })()}
              </g>
            );
          })}
        </svg>

        {/* 图例 */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
          {(['low','medium','high','critical'] as SeverityLevel[]).map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: SEV_COLOR[s], display: 'inline-block' }}/>
              <span style={{ fontSize: '10px', color: '#64748b' }}>{SEV_LABEL[s]}</span>
            </div>
          ))}
        </div>
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
                {defect.isFalsePositive ? (
                  <span className="panel-badge-false-positive">误判</span>
                ) : (
                  <span className="panel-badge">Auto</span>
                )}
              </div>

              <div className="analysis-content">
                {aiLoading ? (
                  <div className="ai-loading-state">
                    <div className="ai-loading-spinner"></div>
                    <p className="ai-loading-text">华为云 Qwen VL 分析中...</p>
                    <p className="ai-loading-sub">正在识别原图与红外图像</p>
                  </div>
                ) : defect.isFalsePositive ? (
                  /* 误判展示 */
                  <div className="false-positive-view">
                    <div className="fp-icon-wrap">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="fp-shield-icon">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        <path d="M9 12l2 2 4-4"/>
                      </svg>
                    </div>
                    <div className="fp-label">误判</div>
                    <div className="fp-desc">AI 分析后认定本次检测为误判，图像中未发现真实缺陷</div>
                    <div className="fp-divider"></div>
                    <div className="fp-fields">
                      <div className="fp-field-row">
                        <span className="fp-field-label">缺陷类型</span>
                        <span className="fp-field-value fp-nil">无</span>
                      </div>
                      <div className="fp-field-row">
                        <span className="fp-field-label">风险等级</span>
                        <span className="fp-field-value fp-nil">无</span>
                      </div>
                      <div className="fp-field-row">
                        <span className="fp-field-label">处理建议</span>
                        <span className="fp-field-value fp-nil">无</span>
                      </div>
                      <div className="fp-field-row">
                        <span className="fp-field-label">维修方案</span>
                        <span className="fp-field-value fp-nil">无</span>
                      </div>
                      <div className="fp-field-row">
                        <span className="fp-field-label">预防措施</span>
                        <span className="fp-field-value fp-nil">无</span>
                      </div>
                    </div>
                    <div className="fp-hint">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
                      </svg>
                      建议将本条记录标记为误报
                    </div>
                  </div>
                ) : (
                  /* 正常分析展示 */
                  <>
                    {/* 是否误报 + 误检类型 */} 
                    <div className="risk-visual" style={{ marginBottom: '16px' }}>
                      <div className="risk-meter">
                        <div className="risk-meter-value" style={{ color: defect.isFalsePositive ? '#eab308' : '#22c55e' }}>
                          {defect.isFalsePositive ? '是' : '否'}
                        </div>
                        <div className="risk-meter-label">是否误报</div>
                      </div>
                      <div className="risk-meter">
                        <div className="risk-trend" style={{ color: '#0ea5e9' }}>
                          误检类型：{defect.misdetectionType ? defect.misdetectionType : defect.isFalsePositive ? '其他' : '无'}
                        </div>
                      </div>
                    </div>

                    {/* 趋势发展折线图（由千问输出并持久化的 severityTimeline 绘制） */}
                    {renderTrendDevelopment()}

                    {/* AI 分析内容：只渲染前2段（缺陷原因分析、风险评估） */}
                    {renderAiAnalysis()}
                  </>
                )}
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

              {defect.isFalsePositive ? (
                <div className="solution-fp-empty">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="solution-fp-icon">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M9 12l2 2 4-4"/>
                  </svg>
                  <p className="solution-fp-text">无需执行方案</p>
                  <p className="solution-fp-sub">本次检测结果为误判</p>
                </div>
              ) : (
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
                        <ul className="emergency-list">
                          {defect.aiTextSolution
                            ? defect.aiTextSolution.replace(/\\n/g, '\n').split('\n').filter(l => l.trim().startsWith('•')).slice(0, 5).map((line, idx) => (
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
                        <ul className="emergency-list">
                          {defect.aiTextAnalysis
                            ? defect.aiTextAnalysis.replace(/\\n/g, '\n').split('\n').filter(l => l.trim().startsWith('•')).slice(4, 8).map((l, i) => (
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
                    <div className="solution-card emergency-card">
                      <div className="card-header">
                        <svg className="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.05h16.94a2 2 0 0 0 1.71-3.05L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                          <line x1="12" y1="9" x2="12" y2="13"/>
                          <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                        <div className="card-title">应急预案</div>
                      </div>
                      <div className="card-content">
                        <ul className="emergency-list">
                          {(() => {
                            // 从 aiTextSolution 中提取应急预案段落（第4段 "4." 开头之后）
                            let emergencyItems: string[] = [];
                            if (defect.aiTextSolution) {
                              const normalized = defect.aiTextSolution.replace(/\\n/g, '\n');
                              // 找到包含"应急"的段落
                              const emergencyMatch = normalized.match(/4\..*?(?=5\.|$)/s) ||
                                normalized.match(/应急预案.*?(?=\n\d+\.|$)/s);
                              if (emergencyMatch) {
                                emergencyItems = emergencyMatch[0].split('\n')
                                  .filter((l: string) => l.trim().startsWith('•'))
                                  .map((l: string) => l.replace('•', '').trim());
                              }
                              // 如果没找到应急段落，取所有bullet的最后几条
                              if (emergencyItems.length === 0) {
                                const allBullets = normalized.split('\n')
                                  .filter((l: string) => l.trim().startsWith('•'))
                                  .map((l: string) => l.replace('•', '').trim());
                                emergencyItems = allBullets.slice(Math.max(0, allBullets.length - 5));
                              }
                            }
                            const defaultItems = [
                              '立即启动应急响应预案，通知班组长及运维人员到场，划定安全隔离区',
                              '向调度中心申请临时负荷转移方案，降低故障线路运行压力',
                              '储备导线、断路器等关键备件于就近应急库房，确保30分钟内可取用',
                              '联系厂商技术支持热线，获取设备故障应急处置专项指导',
                              '每季度组织多部门联合应急演练，故障处置全程记录并归档备查',
                            ];
                            const items = emergencyItems.length > 0 ? emergencyItems : defaultItems;
                            return items.map((item: string, i: number) => (
                              <li key={i}>{item}</li>
                            ));
                          })()}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
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

