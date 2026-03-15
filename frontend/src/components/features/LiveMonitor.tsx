import { useState, useEffect, useRef } from 'react';
import Icon from '../common/Icon';

interface UAVInfo {
  id: string;
  uavId: string;
  name: string;
  status: string;
  battery: number;
  speed: number;
  latitude: number;
  longitude: number;
  altitude: number;
}

const LiveMonitor = () => {
  const [uavList, setUavList] = useState<UAVInfo[]>([]);
  const [selectedUAVId, setSelectedUAVId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 从数据库获取无人机列表
  useEffect(() => {
    fetchUAVList();
  }, []);

  const fetchUAVList = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://localhost:8080/api/drones');
      if (!response.ok) throw new Error('获取无人机列表失败');
      const data = await response.json();
      
      // 转换数据格式，确保字段名称一致
      const formattedData = data.map((drone: any) => ({
        id: drone.id,
        uavId: drone.droneId,
        name: drone.name,
        status: drone.status?.toLowerCase() === 'in_flight' ? 'working' : 'standby',
        battery: Math.round(drone.batteryLevel) || 0,
        speed: 0, // 后端暂无速度数据，默认为0
        latitude: drone.latitude || 0,
        longitude: drone.longitude || 0,
        altitude: 0 // 后端暂无高度数据，默认为0
      }));
      
      setUavList(formattedData);
      // 默认选择第一个无人机
      if (formattedData.length > 0) {
        setSelectedUAVId(formattedData[0].uavId);
      }
    } catch (err) {
      console.error('获取无人机列表失败:', err);
      setError('无法加载无人机列表');
    } finally {
      setLoading(false);
    }
  };

  // 获取视频源
  const getVideoSource = (uavId: string): string | null => {
    // 预置视频源映射
    const videoSources: { [key: string]: string } = {
      'UAV-01': 'http://localhost:8080/api/video/stream/0f84fa38c795c5dc0f612ca789e306eb_raw.mp4',
      'UAV-02': 'http://localhost:8080/api/video/stream/sample_video.mp4',
      'UAV-03': 'http://localhost:8080/api/video/stream/sample_video.mp4',
      'UAV-05': 'http://localhost:8080/api/video/stream/sample_video.mp4',
      'UAV-07': 'http://localhost:8080/api/video/stream/sample_video.mp4',
      'UAV-12': 'http://localhost:8080/api/video/stream/sample_video.mp4',
    };
    
    return videoSources[uavId] || null;
  };

  // 当选择的无人机改变时，更新视频源
  useEffect(() => {
    if (videoRef.current && selectedUAVId) {
      const videoSource = getVideoSource(selectedUAVId);
      if (videoSource) {
        videoRef.current.src = videoSource;
        videoRef.current.load();
        videoRef.current.play().catch(err => {
          console.log('视频播放失败:', err);
        });
      } else {
        videoRef.current.pause();
        videoRef.current.src = '';
      }
    }
  }, [selectedUAVId]);

  const currentUAV = uavList.find(u => u.uavId === selectedUAVId);
  const videoSource = selectedUAVId ? getVideoSource(selectedUAVId) : null;

  return (
    <div className="w-full h-full bg-slate-900/50 backdrop-blur-sm border border-violet-500/30 rounded-2xl overflow-hidden flex flex-col">
      {/* 头部 */}
      <div className="bg-gradient-to-r from-violet-600/20 to-purple-600/20 border-b border-violet-500/30 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-violet-500/20 rounded-lg flex items-center justify-center">
              <Icon icon="mdi:video" className="text-violet-400 text-xl" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">实时监控</h3>
              <p className="text-violet-300 text-xs">无人机视角切换</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded-full border border-red-500/30 animate-pulse">
            LIVE
          </span>
        </div>

        {/* 无人机选择下拉框 */}
        <div className="flex items-center space-x-2">
          <label className="text-slate-300 text-sm font-medium">选择无人机：</label>
          <select
            value={selectedUAVId}
            onChange={(e) => setSelectedUAVId(e.target.value)}
            disabled={loading}
            className="px-3 py-2 bg-slate-800/50 border border-slate-700 text-white rounded-lg focus:outline-none focus:border-violet-500 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <option>加载中...</option>
            ) : error ? (
              <option>{error}</option>
            ) : uavList.length === 0 ? (
              <option>暂无无人机</option>
            ) : (
              uavList.map((uav) => (
                <option key={uav.uavId} value={uav.uavId}>
                  {uav.name} ({uav.uavId})
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* 视频显示区域 */}
      <div className="flex-1 relative bg-slate-950 overflow-hidden">
        {videoSource ? (
          <>
            {/* 视频播放器 */}
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              loop
              muted
              playsInline
              crossOrigin="anonymous"
            >
              <source src={videoSource} type="video/mp4" />
              您的浏览器不支持视频播放
            </video>

            {/* 视频信息叠加层 */}
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-white text-sm font-bold">{currentUAV?.name} LIVE</span>
              </div>
            </div>

            {/* 无人机状态信息 */}
            {currentUAV && (
              <div className="absolute top-4 right-4 space-y-2">
                <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10">
                  <div className="flex items-center space-x-2 text-white text-xs">
                    <Icon icon="mdi:speedometer" className="text-cyan-400" />
                    <span>{currentUAV.speed} km/h</span>
                  </div>
                </div>
                <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10">
                  <div className="flex items-center space-x-2 text-white text-xs">
                    <Icon icon="mdi:map-marker" className="text-green-400" />
                    <span>{currentUAV.latitude.toFixed(2)}°N</span>
                  </div>
                </div>
                <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10">
                  <div className="flex items-center space-x-2 text-white text-xs">
                    <Icon icon="mdi:battery" className={currentUAV.battery > 50 ? 'text-green-400' : 'text-yellow-400'} />
                    <span>{currentUAV.battery}%</span>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* 无视频源时的占位符 */
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
            <Icon icon="mdi:video-off" className="text-6xl mb-4 opacity-50" />
            <p className="text-lg font-medium">暂无视频源</p>
            <p className="text-sm mt-2">
              {currentUAV?.uavId === 'UAV-02' 
                ? '预留实时摄像头视频输入接口' 
                : '该无人机暂未配置视频源'}
            </p>
            {currentUAV?.uavId === 'UAV-02' && (
              <div className="mt-4 px-4 py-2 bg-violet-500/10 border border-violet-500/30 rounded-lg">
                <p className="text-violet-400 text-xs text-center">
                  <Icon icon="mdi:information" className="inline mr-1" />
                  此接口预留用于接入实时摄像头视频流
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 底部信息栏 */}
      {currentUAV && (
        <div className="bg-slate-900/80 border-t border-violet-500/30 px-6 py-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-violet-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon icon="mdi:quadcopter" className="text-violet-400 text-sm" />
              </div>
              <div className="min-w-0">
                <p className="text-slate-400 text-xs">无人机</p>
                <p className="text-white text-sm font-medium truncate">{currentUAV.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon icon="mdi:altitude" className="text-cyan-400 text-sm" />
              </div>
              <div className="min-w-0">
                <p className="text-slate-400 text-xs">高度</p>
                <p className="text-white text-sm font-medium">{currentUAV.altitude}m</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon icon="mdi:map-marker" className="text-green-400 text-sm" />
              </div>
              <div className="min-w-0">
                <p className="text-slate-400 text-xs">坐标</p>
                <p className="text-white text-sm font-medium truncate">
                  {currentUAV.latitude.toFixed(2)}°N
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                currentUAV.status === 'working' ? 'bg-green-500/20' : 'bg-slate-500/20'
              }`}>
                <Icon 
                  icon={currentUAV.status === 'working' ? 'mdi:check-circle' : 'mdi:pause-circle'} 
                  className={currentUAV.status === 'working' ? 'text-green-400 text-sm' : 'text-slate-400 text-sm'} 
                />
              </div>
              <div className="min-w-0">
                <p className="text-slate-400 text-xs">状态</p>
                <p className="text-white text-sm font-medium">
                  {currentUAV.status === 'working' ? '工作中' : '待机'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveMonitor;
