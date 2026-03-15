import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LiveMonitor from '../components/features/LiveMonitor';
import '../styles/dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    inspectionPoints: 2847,
    images: 1254,
    alerts: 1,
    battery: 78
  });

  const [activities, setActivities] = useState([
    { icon: 'alert-triangle', title: '检测到绝缘子破损', meta: 'UAV-12 · Zone-A · 塔架 A-07', time: '14:28', alert: true },
    { icon: 'check-circle', title: '完成塔架巡检', meta: 'UAV-07 · Zone-A · 塔架 A-12', time: '14:15', alert: false },
    { icon: 'battery', title: 'UAV-05 电量低于20%', meta: '返回充电站中...', time: '14:10', alert: false },
    { icon: 'play', title: '启动 Zone-B 巡检', meta: 'UAV-09 · 准备起飞', time: '14:05', alert: false },
    { icon: 'check-circle', title: '完成航点拍摄', meta: 'UAV-03 · Zone-A · 航点 15', time: '14:00', alert: false },
  ]);

  const quickAccessItems = [
    { icon: 'alert-triangle', title: '缺陷管理', desc: '查看系统缺陷', path: '/defect-management' },
    { icon: 'plane', title: '无人机管理', desc: '管理无人机队伍', path: '/uav-management' },
    { icon: 'map', title: '航线规划', desc: '规划巡检路线', path: '/flight-path' },
    { icon: 'file-text', title: '态势感知', desc: '查看系统概览', path: '/' },
  ];

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/lucide@latest';
    document.body.appendChild(script);
    
    script.onload = () => {
      if (window.lucide) {
        window.lucide.createIcons();
      }
    };

    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        inspectionPoints: prev.inspectionPoints + Math.floor(Math.random() * 10) - 5,
        images: prev.images + Math.floor(Math.random() * 5) - 2,
        battery: Math.min(100, Math.max(30, prev.battery + Math.floor(Math.random() * 6) - 3))
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleAccessClick = (path: string) => {
    navigate(path);
  };

  return (
    <div className="dashboard-wrapper">
      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon">
              <i data-lucide="map-pin" style={{width: '24px', height: '24px'}}></i>
            </div>
            <div className="stat-card-trend up">+12%</div>
          </div>
          <div className="stat-card-value">{stats.inspectionPoints.toLocaleString()}</div>
          <div className="stat-card-label">今日巡检点</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon">
              <i data-lucide="camera" style={{width: '24px', height: '24px'}}></i>
            </div>
            <div className="stat-card-trend up">+8%</div>
          </div>
          <div className="stat-card-value">{stats.images.toLocaleString()}</div>
          <div className="stat-card-label">采集图像</div>
        </div>

        <div className="stat-card alert">
          <div className="stat-card-header">
            <div className="stat-card-icon">
              <i data-lucide="alert-circle" style={{width: '24px', height: '24px'}}></i>
            </div>
            <div className="stat-card-trend down">-23%</div>
          </div>
          <div className="stat-card-value">{stats.alerts}</div>
          <div className="stat-card-label">活跃告警</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon">
              <i data-lucide="battery-charging" style={{width: '24px', height: '24px'}}></i>
            </div>
            <div className="stat-card-trend up">+5%</div>
          </div>
          <div className="stat-card-value">{stats.battery}%</div>
          <div className="stat-card-label">平均续航</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="dashboard-grid">
        {/* Live Feed */}
        <div className="panel live-feed">
          <LiveMonitor />
        </div>

        {/* Patrol Schedule */}
        <div className="panel patrol-schedule">
          <div className="panel-header">
            <h3 className="panel-title">巡检计划</h3>
          </div>
          <div className="schedule-list">
            <div className="schedule-item active">
              <div className="schedule-info">
                <div className="schedule-time">14:00</div>
                <div className="schedule-details">
                  <div className="schedule-title">Zone-A 二次巡检</div>
                  <div className="schedule-location">北区 A1-A12</div>
                </div>
              </div>
              <div className="schedule-status running">进行中</div>
            </div>
            <div className="schedule-item">
              <div className="schedule-info">
                <div className="schedule-time">15:30</div>
                <div className="schedule-details">
                  <div className="schedule-title">Zone-B 设备检测</div>
                  <div className="schedule-location">南区 B3-B8</div>
                </div>
              </div>
              <div className="schedule-status pending">待执行</div>
            </div>
            <div className="schedule-item">
              <div className="schedule-info">
                <div className="schedule-time">17:00</div>
                <div className="schedule-details">
                  <div className="schedule-title">Zone-C 路线规划</div>
                  <div className="schedule-location">东区 C1-C6</div>
                </div>
              </div>
              <div className="schedule-status pending">待执行</div>
            </div>
          </div>
        </div>

        {/* Activity Logs */}
        <div className="panel activity-logs">
          <div className="panel-header">
            <h3 className="panel-title">实时日志</h3>
            <span className="panel-badge live">LIVE</span>
          </div>
          <div className="activity-list">
            {activities.map((activity, idx) => (
              <div key={idx} className={`activity-item ${activity.alert ? 'alert' : ''}`}>
                <div className="activity-icon">
                  <i data-lucide={activity.icon} style={{width: '16px', height: '16px'}}></i>
                </div>
                <div className="activity-content">
                  <div className="activity-title">{activity.title}</div>
                  <div className="activity-meta">{activity.meta}</div>
                </div>
                <div className="activity-time">{activity.time}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Emergency Alert */}
        <div className="panel emergency-panel">
          <div className="emergency-header">
            <div className="emergency-icon">
              <i data-lucide="alert-triangle" style={{width: '24px', height: '24px'}}></i>
            </div>
            <h3 className="emergency-title">紧急告警</h3>
          </div>
          <div className="emergency-content">
            <div className="emergency-row">
              <span className="emergency-label">告警类型</span>
              <span className="emergency-value">绝缘子破损</span>
            </div>
            <div className="emergency-row">
              <span className="emergency-label">来源无人机</span>
              <span className="emergency-value">UAV-12</span>
            </div>
            <div className="emergency-row">
              <span className="emergency-label">发现位置</span>
              <span className="emergency-value">22.54°N, 114.05°E</span>
            </div>
            <div className="emergency-row">
              <span className="emergency-label">发现时间</span>
              <span className="emergency-value">14:28:43</span>
            </div>
          </div>
          <div className="emergency-actions">
            <button className="btn btn-primary">
              <i data-lucide="check-circle" style={{width: '14px', height: '14px'}}></i>
              <span>立即确认</span>
            </button>
            <button className="btn btn-secondary">
              <i data-lucide="eye" style={{width: '14px', height: '14px'}}></i>
              <span>查看详情</span>
            </button>
          </div>
        </div>

        {/* Quick Access */}
        <div className="panel quick-access">
          <div className="panel-header">
            <h3 className="panel-title">快速访问</h3>
          </div>
          <div className="access-grid">
            {quickAccessItems.map((item, idx) => (
              <div key={idx} className="access-item" onClick={() => handleAccessClick(item.path)}>
                <div className="access-left">
                  <div className="access-icon">
                    <i data-lucide={item.icon} style={{width: '18px', height: '18px'}}></i>
                  </div>
                  <div className="access-text">
                    <div className="access-title">{item.title}</div>
                    <div className="access-desc">{item.desc}</div>
                  </div>
                </div>
                <i data-lucide="chevron-right" style={{width: '16px', height: '16px'}}></i>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
