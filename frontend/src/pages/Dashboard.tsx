import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as echarts from 'echarts';
import Icon from '../components/common/Icon';

const Dashboard = () => {
  const navigate = useNavigate();
  const statsChartRef = useRef<HTMLDivElement>(null);
  const batteryChartRef = useRef<HTMLDivElement>(null);
  const statsChartInstance = useRef<echarts.ECharts | null>(null);
  const batteryChartInstance = useRef<echarts.ECharts | null>(null);
  
  const [mapImageError, setMapImageError] = useState(false);
  const [videoImageError, setVideoImageError] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);

  const handleConfirmAlert = () => {
    alert('已确认异常，正在派遣处理团队...');
  };

  const handleViewPanorama = () => {
    navigate('/defect-management');
  };

  const handleUAVClick = (uavId: string) => {
    alert(`查看无人机 ${uavId} 详情`);
  };

  useEffect(() => {
    // 集群统计图表
    if (statsChartRef.current && !statsChartInstance.current) {
      const chart = echarts.init(statsChartRef.current);
      chart.setOption({
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis' },
        grid: { top: 20, left: 30, right: 10, bottom: 20 },
        xAxis: {
          type: 'category',
          data: ['08:00', '10:00', '12:00', '14:00', '16:00'],
          axisLine: { lineStyle: { color: '#1e293b' } },
          axisLabel: { color: '#94a3b8', fontSize: 10 }
        },
        yAxis: {
          splitLine: { lineStyle: { color: '#1e293b' } },
          axisLabel: { color: '#94a3b8', fontSize: 10 }
        },
        series: [{
          name: '识别目标数',
          data: [120, 210, 150, 430, 310],
          type: 'line',
          smooth: true,
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(14, 165, 233, 0.5)' },
              { offset: 1, color: 'rgba(14, 165, 233, 0)' }
            ])
          },
          itemStyle: { color: '#0ea5e9' }
        }]
      });
      statsChartInstance.current = chart;
    }

    // 电池续航分布图
    if (batteryChartRef.current && !batteryChartInstance.current) {
      const chart = echarts.init(batteryChartRef.current);
      chart.setOption({
        backgroundColor: 'transparent',
        tooltip: { trigger: 'item' },
        series: [{
          name: '电量状态',
          type: 'pie',
          radius: ['60%', '80%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 4, borderColor: '#0f172a', borderWidth: 2 },
          label: { show: false },
          data: [
            { value: 8, name: '充足 (>80%)', itemStyle: { color: '#10b981' } },
            { value: 3, name: '健康 (30-80%)', itemStyle: { color: '#0ea5e9' } },
            { value: 1, name: '警告 (<30%)', itemStyle: { color: '#ef4444' } }
          ]
        }]
      });
      batteryChartInstance.current = chart;
    }

    const handleResize = () => {
      statsChartInstance.current?.resize();
      batteryChartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      statsChartInstance.current?.dispose();
      batteryChartInstance.current?.dispose();
    };
  }, []);

  return (
    <div className="h-full flex flex-col p-6 gap-6">
      {/* 顶栏信息 */}
      <div className="glass-effect border border-cyan-500/20 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-full opacity-20 pointer-events-none">
          <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/30 rounded-full blur-3xl"></div>
        </div>
        <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center space-x-12">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 flex items-center justify-center">
                <Icon icon="heroicons:check-circle" className="text-emerald-400 text-2xl" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">运行环境</p>
                <p className="text-base font-bold text-emerald-400 font-mono">SYSTEM NORMAL</p>
              </div>
            </div>
            <div className="h-12 w-px bg-slate-700"></div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                <Icon icon="heroicons:clipboard-document-check" className="text-cyan-400 text-2xl" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">当前任务</p>
                <p className="text-base font-bold text-cyan-400">Zone-A 二次巡检</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-mono font-bold text-cyan-400" id="current-date">
              {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.')}
            </p>
            <p className="text-sm font-mono text-slate-500" id="current-time">
              {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>
        </div>
      </div>

      <main className="flex-1 flex overflow-hidden gap-4">
        {/* 左侧：统计与指标 */}
        <div className="w-96 flex flex-col gap-6">
          <section className="glass-effect border border-cyan-500/20 relative p-6 flex-1 flex flex-col rounded-2xl overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl"></div>
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                <Icon icon="heroicons:chart-bar" className="text-cyan-400 text-xl" />
              </div>
              <h3 className="text-base font-bold text-slate-200">集群运行统计</h3>
            </div>
            <div className="flex-1 w-full relative z-10" ref={statsChartRef}></div>
          </section>
          <section className="glass-effect border border-purple-500/20 relative p-6 h-72 rounded-2xl overflow-hidden">
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
                <Icon icon="heroicons:battery-100" className="text-purple-400 text-xl" />
              </div>
              <h3 className="text-base font-bold text-slate-200">无人机续航分布</h3>
            </div>
            <div className="h-44 w-full relative z-10" ref={batteryChartRef}></div>
          </section>
        </div>

        {/* 中间：GIS地图区 */}
        <div className="flex-1 relative glass-effect border border-cyan-500/20 rounded-2xl overflow-hidden group">
          <div className="absolute inset-0 bg-slate-900">
            {!mapImageError ? (
              <img
                alt="Dark theme city satellite map"
                className="w-full h-full object-cover opacity-30 mix-blend-luminosity"
                src="https://modao.cc/agent-py/media/generated_images/2026-01-21/911f08f59bd34ac8985cc8c6bd527b48.jpg"
                onError={() => setMapImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 bg-slate-800">
                <div className="text-center">
                  <Icon icon="heroicons:map" className="text-6xl mb-2" />
                  <p>地图加载失败</p>
                </div>
              </div>
            )}
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle, rgba(6, 182, 212, 0.1) 1px, transparent 1px)',
              backgroundSize: '30px 30px'
            }}></div>
            <svg className="absolute inset-0 w-full h-full stroke-cyan-500/20 stroke-[1] fill-none">
              <path d="M100 200 L300 400 L600 350 L800 500"></path>
              <path d="M150 500 L400 300 L700 200"></path>
            </svg>
            
            {/* 无人机气泡 */}
            <div className="absolute top-1/3 left-1/4 flex flex-col items-center animate-float">
              <div 
                onClick={() => handleUAVClick('UAV-07')}
                className="glass-effect border border-cyan-400/50 p-3 rounded-full cursor-pointer hover:scale-110 transition-all shadow-lg shadow-cyan-500/20"
              >
                <Icon icon="material-symbols:nest-remote-wired" className="text-cyan-400 text-2xl" />
              </div>
              <div className="mt-3 glass-effect border border-cyan-500/30 px-3 py-2 rounded-lg text-xs whitespace-nowrap">
                <span className="text-cyan-400 font-bold">UAV-07</span>
                <span className="text-slate-400 mx-2">|</span>
                <span className="text-slate-300 font-mono">42km/h</span>
              </div>
            </div>
            
            <div className="absolute top-1/2 left-2/3 flex flex-col items-center animate-pulse">
              <div 
                onClick={() => handleUAVClick('UAV-12')}
                className="glass-effect border-2 border-red-500 p-3 rounded-full cursor-pointer hover:scale-110 transition-all shadow-lg shadow-red-500/30 bg-red-500/10"
              >
                <Icon icon="heroicons:exclamation-triangle" className="text-red-500 text-2xl" />
              </div>
              <div className="mt-3 glass-effect border border-red-500/50 px-3 py-2 rounded-lg text-xs whitespace-nowrap bg-red-950/50">
                <span className="text-red-400 font-bold">UAV-12 告警</span>
                <span className="text-slate-400 mx-2">|</span>
                <span className="text-red-300">绝缘子破损</span>
              </div>
            </div>
          </div>
          
          {/* AI 实时视频弹窗 */}
          <div className="absolute top-6 right-6 w-80 h-48 glass-effect border border-cyan-500/30 rounded-xl overflow-hidden shadow-2xl">
            <div className="relative w-full h-full bg-black">
              {!videoImageError ? (
                <img
                  alt="Real-time transmission tower video"
                  className="w-full h-full object-cover"
                  src="https://modao.cc/agent-py/media/generated_images/2026-01-21/7bbd2b8439a340e491379a2c48f36c4d.jpg"
                  onError={() => setVideoImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 bg-slate-800 text-xs">
                  视频加载失败
                </div>
              )}
              <div className="absolute top-12 left-14 w-24 h-24 border-2 border-red-500 rounded-lg animate-pulse">
                <div className="absolute -top-8 left-0 right-0 bg-red-500/90 text-white text-[9px] px-2 py-1 rounded flex items-center gap-1 backdrop-blur-sm">
                  <Icon icon="heroicons:exclamation-triangle" className="text-xs" />
                  <span className="font-bold">绝缘子破损 98.4%</span>
                </div>
              </div>
              <div className="absolute left-0 right-0 top-1/2 h-px bg-cyan-500/50 shadow-[0_0_10px_#06b6d4]"></div>
            </div>
            <div className="absolute top-3 left-3 glass-effect px-3 py-1.5 rounded-lg border border-red-500/30 flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-white font-bold">UAV-12 LIVE</span>
            </div>
          </div>
        </div>

        {/* 右侧：警报流 */}
        <div className="w-[420px] flex flex-col gap-6">
          <section className="glass-effect border border-red-500/20 relative flex-1 p-6 flex flex-col rounded-2xl overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl"></div>
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 flex items-center justify-center">
                  <Icon icon="heroicons:exclamation-triangle" className="text-red-400 text-xl" />
                </div>
                <h3 className="text-base font-bold text-slate-200">异常识别流</h3>
              </div>
              <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                NEW: 2
              </span>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 hide-scrollbar relative z-10">
              <div className="glass-effect border border-red-500/30 p-4 rounded-xl relative overflow-hidden group hover:border-red-500/50 transition-all cursor-pointer">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl"></div>
                <div className="flex gap-4 relative z-10">
                  <div className="w-24 h-20 bg-black rounded-lg border border-slate-700 flex-shrink-0 relative overflow-hidden">
                  {!thumbnailError ? (
                    <img
                      alt="Insulator break thumbnail"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      src="https://modao.cc/agent-py/media/generated_images/2026-01-21/6dd7f5830af34c16ba43f7f073b6ec51.jpg"
                      onError={() => setThumbnailError(true)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 bg-slate-800 text-[8px] text-center px-1">
                      图片不存在
                    </div>
                  )}
                    <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  </div>
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-bold text-red-400 line-clamp-1">绝缘子闪络/破损</h4>
                        <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap ml-2">14:28:43</span>
                      </div>
                      <div className="space-y-1.5 text-xs text-slate-400">
                        <div className="flex items-center gap-2">
                          <Icon icon="heroicons:cpu-chip" className="text-cyan-400 flex-shrink-0" />
                          <span className="truncate">来源: <strong className="text-cyan-400">UAV-12</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Icon icon="heroicons:map-pin" className="text-slate-500 flex-shrink-0" />
                          <span className="truncate">22.54°N, 114.05°E</span>
                        </div>
                      </div>
                  </div>
                    <div className="mt-3 flex gap-2">
                    <button 
                      onClick={handleConfirmAlert}
                        className="flex-1 text-[10px] font-semibold bg-red-500/20 text-red-400 py-2 rounded-lg border border-red-500/30 hover:bg-red-500/30 transition-all"
                    >
                      立即确认
                    </button>
                    <button 
                      onClick={handleViewPanorama}
                        className="flex-1 text-[10px] font-semibold bg-slate-800/50 text-slate-400 py-2 rounded-lg border border-slate-700 hover:bg-slate-700 hover:text-slate-300 transition-all"
                    >
                        查看详情
                    </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

