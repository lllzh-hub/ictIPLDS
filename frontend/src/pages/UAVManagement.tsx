import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/common/Icon';
import FlightPathModal from '../components/features/FlightPathModal';

interface UAV {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'working' | 'standby' | 'maintenance';
  battery: number;
  location: { lat: number; lon: number };
  altitude: number;
  speed: number;
  task?: string;
  lastUpdate: string;
  imageUrl?: string;
}

const UAVManagement = () => {
  const _navigate = useNavigate();
  const [uavs, setUavs] = useState<UAV[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUAV, setSelectedUAV] = useState<UAV | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showFlightPathViewer, setShowFlightPathViewer] = useState(false);

  // 从后端获取无人机数据
  useEffect(() => {
    const fetchDrones = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/drones');
        if (!response.ok) throw new Error('获取无人机列表失败');
        const data = await response.json();
        
        // 转换后端数据格式为前端格式
        const formattedUavs = data.map((drone: any) => ({
          id: drone.droneId,
          name: drone.name,
          status: mapDroneStatus(drone.status),
          battery: drone.batteryLevel || 0,
          location: { lat: drone.latitude || 0, lon: drone.longitude || 0 },
          altitude: 0,
          speed: 0,
          task: drone.currentLocation ? `${drone.currentLocation} 巡检任务` : undefined,
          lastUpdate: new Date().toLocaleTimeString('zh-CN')
        }));
        
        setUavs(formattedUavs);
      } catch (err) {
        console.error('获取无人机列表失败:', err);
        // 如果获取失败，使用空数组
        setUavs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDrones();
  }, []);

  // 映射后端状态到前端状态
  const mapDroneStatus = (status: string): UAV['status'] => {
    const statusMap: { [key: string]: UAV['status'] } = {
      'IN_FLIGHT': 'working',
      'AVAILABLE': 'standby',
      'CHARGING': 'standby',
      'MAINTENANCE': 'maintenance',
      'OFFLINE': 'offline'
    };
    return statusMap[status] || 'offline';
  };

  // 更新无人机状态（模拟实时更新）
  useEffect(() => {
    const interval = setInterval(() => {
      setUavs(prevUavs => 
        prevUavs.map(uav => {
          if (uav.status === 'working' && uav.battery > 0) {
            return {
              ...uav,
              battery: Math.max(0, uav.battery - Math.random() * 0.5),
              lastUpdate: new Date().toLocaleTimeString('zh-CN')
            };
          }
          return uav;
        })
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusConfig = (status: UAV['status']) => {
    switch (status) {
      case 'working':
        return { label: '作业中', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', dot: 'bg-blue-500' };
      case 'standby':
        return { label: '待机', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-500' };
      case 'online':
        return { label: '在线', color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/30', dot: 'bg-sky-500' };
      case 'maintenance':
        return { label: '维护中', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', dot: 'bg-amber-500' };
      default:
        return { label: '离线', color: 'text-zinc-400', bg: 'bg-zinc-500/10', border: 'border-zinc-500/30', dot: 'bg-zinc-500' };
    }
  };

  const getBatteryColor = (battery: number) => {
    if (battery > 80) return 'text-emerald-400';
    if (battery > 50) return 'text-yellow-400';
    if (battery > 20) return 'text-orange-400';
    return 'text-red-400';
  };

  const filteredUAVs = filterStatus === 'all' 
    ? uavs 
    : uavs.filter(uav => uav.status === filterStatus);

  const statusCounts = {
    all: uavs.length,
    working: uavs.filter(u => u.status === 'working').length,
    standby: uavs.filter(u => u.status === 'standby').length,
    online: uavs.filter(u => u.status === 'online').length,
    maintenance: uavs.filter(u => u.status === 'maintenance').length,
    offline: uavs.filter(u => u.status === 'offline').length
  };

  return (
    <div className="min-h-full p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-[1800px] mx-auto">
        {/* 头部 */}
        <header className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-tight flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                <Icon icon="mdi:quadcopter" className="text-cyan-400 text-2xl" />
              </div>
              无人机管理看板
            </h1>
            <p className="text-slate-500 text-sm mt-2 ml-1">
              当前时间：{new Date().toLocaleString('zh-CN')} | 总计 {uavs.length} 架无人机在线
            </p>
          </div>
          <div className="flex gap-3">
            <button className="glass-effect border border-cyan-500/30 hover:border-cyan-500/50 text-cyan-400 px-6 py-3 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 hover:shadow-lg hover:shadow-cyan-500/20">
              <Icon icon="heroicons:plus" className="text-lg" />
              添加无人机
            </button>
            <button className="glass-effect border border-slate-700/50 hover:border-slate-600 text-slate-300 px-6 py-3 rounded-xl text-sm font-semibold transition-all">
              导出报告
            </button>
          </div>
        </header>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {[
            { key: 'all', label: '全部', count: statusCounts.all, color: 'slate', icon: 'heroicons:squares-2x2' },
            { key: 'working', label: '作业中', count: statusCounts.working, color: 'blue', icon: 'heroicons:play-circle' },
            { key: 'standby', label: '待机', count: statusCounts.standby, color: 'emerald', icon: 'heroicons:pause-circle' },
            { key: 'online', label: '在线', count: statusCounts.online, color: 'sky', icon: 'heroicons:signal' },
            { key: 'maintenance', label: '维护中', count: statusCounts.maintenance, color: 'amber', icon: 'heroicons:wrench-screwdriver' },
            { key: 'offline', label: '离线', count: statusCounts.offline, color: 'zinc', icon: 'heroicons:x-circle' }
          ].map(({ key, label, count, color, icon }) => (
            <div
              key={key}
              onClick={() => setFilterStatus(key)}
              className={`glass-effect border rounded-xl p-5 cursor-pointer transition-all hover:scale-105 ${
                filterStatus === key 
                  ? `border-${color}-500/50 bg-${color}-500/10 shadow-lg shadow-${color}-500/20` 
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br from-${color}-500/20 to-${color}-600/20 border border-${color}-500/30 flex items-center justify-center`}>
                  <Icon icon={icon} className={`text-${color}-400 text-xl`} />
                </div>
                <div className={`w-3 h-3 rounded-full bg-${color}-500 ${filterStatus === key ? 'animate-pulse' : ''}`}></div>
              </div>
              <div className="text-3xl font-bold text-white mb-1">{count}</div>
              <div className="text-xs text-slate-400 font-medium">{label}</div>
            </div>
          ))}
        </div>

        {/* 主内容区 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：无人机列表 */}
          <div className="lg:col-span-2">
            <div className="glass-effect rounded-2xl border border-slate-800/50 overflow-hidden">
              <div className="p-5 border-b border-slate-800/50 bg-slate-900/30">
                <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                  <Icon icon="heroicons:queue-list" className="text-cyan-400" />
                  无人机列表
                </h2>
              </div>
              <div className="p-5 space-y-4 max-h-[calc(100vh-400px)] overflow-y-auto hide-scrollbar">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-12 h-12 border-4 border-slate-700 border-t-cyan-400 rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-400 text-sm">加载无人机数据中...</p>
                  </div>
                ) : filteredUAVs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Icon icon="mdi:quadcopter" className="text-6xl text-slate-700 mb-4" />
                    <p className="text-slate-400 text-sm">暂无无人机数据</p>
                  </div>
                ) : null}
                {filteredUAVs.map((uav) => {
                  const statusConfig = getStatusConfig(uav.status);
                  const batteryColor = getBatteryColor(uav.battery);

                  return (
                    <div
                      key={uav.id}
                      onClick={() => setSelectedUAV(uav)}
                      className={`glass-effect border rounded-xl p-5 cursor-pointer transition-all hover:scale-[1.02] ${
                        selectedUAV?.id === uav.id
                          ? 'border-cyan-500/50 bg-cyan-500/5 shadow-lg shadow-cyan-500/10'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-xl ${statusConfig.bg} border ${statusConfig.border} flex items-center justify-center relative overflow-hidden`}>
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
                            <Icon icon="mdi:quadcopter" className="text-3xl text-cyan-400 relative z-10" />
                          </div>
                          <div>
                            <h3 className="text-white font-bold text-lg">{uav.name}</h3>
                            <p className="text-slate-500 text-sm font-mono">ID: {uav.id}</p>
                          </div>
                        </div>
                        <div className={`px-3 py-1.5 rounded-full ${statusConfig.bg} border ${statusConfig.border}`}>
                          <span className={`text-xs font-bold ${statusConfig.color} flex items-center gap-1.5`}>
                            <span className={`w-2 h-2 rounded-full ${statusConfig.dot} animate-pulse`}></span>
                            {statusConfig.label}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-slate-500 text-xs mb-2 font-medium">电池电量</p>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-slate-800/50 h-2.5 rounded-full overflow-hidden border border-slate-700">
                              <div
                                className={`h-full transition-all duration-500 ${
                                  uav.battery > 80 ? 'bg-gradient-to-r from-emerald-500 to-green-500' :
                                  uav.battery > 50 ? 'bg-gradient-to-r from-yellow-500 to-amber-500' :
                                  uav.battery > 20 ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gradient-to-r from-red-600 to-red-700'
                                }`}
                                style={{ width: `${uav.battery}%` }}
                              />
                            </div>
                            <span className={`text-sm font-bold font-mono ${batteryColor}`}>{uav.battery.toFixed(0)}%</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs mb-2 font-medium">位置坐标</p>
                          <p className="text-white text-sm font-mono flex items-center gap-1">
                            <Icon icon="heroicons:map-pin" className="text-slate-500" />
                            {uav.location.lat.toFixed(2)}°, {uav.location.lon.toFixed(2)}°
                          </p>
                        </div>
                      </div>

                      {uav.status === 'working' && (
                        <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                          <div>
                            <p className="text-slate-500 text-xs mb-1">高度</p>
                            <p className="text-white text-sm font-mono font-bold">{uav.altitude}m</p>
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs mb-1">速度</p>
                            <p className="text-white text-sm font-mono font-bold">{uav.speed}km/h</p>
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs mb-1 truncate">任务</p>
                            <p className="text-cyan-400 text-sm font-medium truncate">{uav.task || '--'}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                        <span className="text-slate-500 text-xs flex items-center gap-1.5">
                          <Icon icon="heroicons:clock" />
                          最后更新: <span className="font-mono">{uav.lastUpdate}</span>
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUAV(uav);
                            setShowFlightPathViewer(true);
                          }}
                          className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1.5 font-semibold hover:bg-cyan-500/10 px-3 py-1.5 rounded-lg transition-all"
                        >
                          <Icon icon="material-symbols:route-outline" />
                          航线规划
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 右侧：详情面板 */}
          <div className="lg:col-span-1">
            <div className="glass-effect rounded-2xl border border-slate-800/50 overflow-hidden sticky top-6">
              <div className="p-5 border-b border-slate-800/50 bg-slate-900/30">
                <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                  <Icon icon="heroicons:information-circle" className="text-purple-400" />
                  详细信息
                </h2>
              </div>
              <div className="p-5">
                {selectedUAV ? (
                  <div className="space-y-5">
                    <div className="text-center pb-5 border-b border-slate-800">
                      <div className="w-28 h-28 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
                        <Icon icon="mdi:quadcopter" className="text-6xl text-cyan-400 relative z-10" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">{selectedUAV.name}</h3>
                      <p className="text-slate-500 text-sm font-mono">ID: {selectedUAV.id}</p>
                    </div>

                    <div className="space-y-3">
                      <div className="glass-effect rounded-xl p-4 border border-slate-800">
                        <p className="text-slate-500 text-xs mb-3 font-semibold uppercase tracking-wider">状态信息</p>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-sm">运行状态</span>
                          <span className={`text-sm font-bold ${getStatusConfig(selectedUAV.status).color} flex items-center gap-2`}>
                            <span className={`w-2 h-2 rounded-full ${getStatusConfig(selectedUAV.status).dot} animate-pulse`}></span>
                            {getStatusConfig(selectedUAV.status).label}
                          </span>
                        </div>
                      </div>

                      <div className="glass-effect rounded-xl p-4 border border-slate-800">
                        <p className="text-slate-500 text-xs mb-3 font-semibold uppercase tracking-wider">电池信息</p>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-sm">电量</span>
                            <span className={`text-sm font-bold ${getBatteryColor(selectedUAV.battery)}`}>
                              {selectedUAV.battery.toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-800/50 h-3 rounded-full overflow-hidden border border-slate-700">
                            <div
                              className={`h-full transition-all duration-500 ${
                                selectedUAV.battery > 80 ? 'bg-gradient-to-r from-emerald-500 to-green-500' :
                                selectedUAV.battery > 50 ? 'bg-gradient-to-r from-yellow-500 to-amber-500' :
                                selectedUAV.battery > 20 ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gradient-to-r from-red-600 to-red-700'
                              }`}
                              style={{ width: `${selectedUAV.battery}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="glass-effect rounded-xl p-4 border border-slate-800">
                        <p className="text-slate-500 text-xs mb-3 font-semibold uppercase tracking-wider">位置信息</p>
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-sm">纬度</span>
                            <span className="text-white text-sm font-mono font-bold">{selectedUAV.location.lat}°</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-sm">经度</span>
                            <span className="text-white text-sm font-mono font-bold">{selectedUAV.location.lon}°</span>
                          </div>
                          {selectedUAV.status === 'working' && (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400 text-sm">高度</span>
                                <span className="text-cyan-400 text-sm font-mono font-bold">{selectedUAV.altitude}m</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400 text-sm">速度</span>
                                <span className="text-cyan-400 text-sm font-mono font-bold">{selectedUAV.speed}km/h</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {selectedUAV.task && (
                        <div className="glass-effect rounded-xl p-4 border border-blue-500/30 bg-blue-500/5">
                          <p className="text-blue-400 text-xs mb-2 font-semibold uppercase tracking-wider flex items-center gap-2">
                            <Icon icon="heroicons:clipboard-document-check" />
                            当前任务
                          </p>
                          <p className="text-white text-sm font-medium">{selectedUAV.task}</p>
                        </div>
                      )}

                      <div className="flex gap-2 pt-3">
                        <button className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-4 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40">
                          控制
                        </button>
                        <button className="flex-1 glass-effect border border-slate-700 hover:border-slate-600 text-slate-300 px-4 py-3 rounded-xl text-sm font-bold transition-all">
                          日志
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-slate-800/50 flex items-center justify-center">
                      <Icon icon="mdi:quadcopter" className="text-6xl text-slate-700" />
                    </div>
                    <p className="text-slate-500 text-sm">请选择一架无人机查看详情</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 航线规划模态框 */}
      {showFlightPathViewer && selectedUAV && (
        <FlightPathModal
          droneId={selectedUAV.id}
          onClose={() => setShowFlightPathViewer(false)}
        />
      )}
    </div>
  );
};

export default UAVManagement;

