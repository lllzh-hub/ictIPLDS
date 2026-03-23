import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LiveMonitor from '../components/features/LiveMonitor';
import Icon from '../components/common/Icon';
import '../styles/dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    inspectionPoints: 2847,
    images: 1254,
    alerts: 1,
    battery: 78
  });

  const [schedules, _setSchedules] = useState([
    { time: '14:00', title: 'Zone-A 二次巡检', location: '北区 A1-A12', status: 'running', uav: 'UAV-07' },
    { time: '15:30', title: 'Zone-B 设备检测', location: '南区 B3-B8', status: 'pending', uav: 'UAV-09' },
    { time: '17:00', title: 'Zone-C 路线规划', location: '东区 C1-C6', status: 'pending', uav: 'UAV-04' },
    { time: '18:30', title: 'Zone-D 夜间巡检', location: '西区 D1-D10', status: 'pending', uav: 'UAV-02' },
    { time: '19:45', title: 'Zone-A 补充检测', location: '北区 A7-A12', status: 'pending', uav: 'UAV-11' },
    { time: '21:00', title: 'Zone-B 热成像扫描', location: '南区 B1-B8', status: 'pending', uav: 'UAV-08' },
    { time: '22:30', title: 'Zone-C 精细检查', location: '东区 C3-C6', status: 'pending', uav: 'UAV-03' },
    { time: '23:59', title: 'Zone-D 日终总结', location: '西区 D1-D10', status: 'pending', uav: 'UAV-06' },
  ]);

  const [activities, _setActivities] = useState([
    { icon: 'heroicons:exclamation-triangle', title: '检测到绝缘子破损', meta: 'UAV-12 · Zone-A · 塔架 A-07', time: '14:28', alert: true },
    { icon: 'heroicons:check-circle', title: '完成塔架巡检', meta: 'UAV-07 · Zone-A · 塔架 A-12', time: '14:25', alert: false },
    { icon: 'heroicons:battery-100', title: 'UAV-05 电量低于20%', meta: '返回充电站中...', time: '14:22', alert: false },
    { icon: 'heroicons:play', title: '启动 Zone-B 巡检', meta: 'UAV-09 · 准备起飞', time: '14:20', alert: false },
    { icon: 'heroicons:check-circle', title: '完成航点拍摄', meta: 'UAV-03 · Zone-A · 航点 15', time: '14:18', alert: false },
    { icon: 'heroicons:camera', title: '采集高清图像', meta: 'UAV-08 · Zone-C · 设备 C-04', time: '14:15', alert: false },
    { icon: 'heroicons:bolt', title: '检测到异常温度', meta: 'UAV-11 · Zone-B · 变压器 B-02', time: '14:12', alert: true },
    { icon: 'heroicons:check-circle', title: '完成区域扫描', meta: 'UAV-04 · Zone-A · 完成度 100%', time: '14:10', alert: false },
    { icon: 'heroicons:wifi', title: '信号强度下降', meta: 'UAV-06 · 距离基站 2.5km', time: '14:08', alert: false },
    { icon: 'heroicons:play', title: '启动自动巡检', meta: 'UAV-02 · Zone-D · 预计耗时 45min', time: '14:05', alert: false },
    { icon: 'heroicons:check-circle', title: '完成数据上传', meta: '本次巡检 · 共 2847 张图像', time: '14:02', alert: false },
    { icon: 'heroicons:exclamation-circle', title: '检测到异物', meta: 'UAV-10 · Zone-A · 塔架 A-15', time: '13:58', alert: true },
  ]);

  const quickAccessItems = [
    { icon: 'heroicons:exclamation-triangle', title: '缺陷管理', desc: '查看系统缺陷', path: '/defect-management' },
    { icon: 'mdi:quadcopter', title: '无人机管理', desc: '管理无人机队伍', path: '/uav-management' },
    { icon: 'heroicons:map', title: '航线规划', desc: '规划巡检路线', path: '/flight-path' },
    { icon: 'heroicons:document-text', title: '态势感知', desc: '查看系统概览', path: '/' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        inspectionPoints: prev.inspectionPoints + Math.floor(Math.random() * 10) - 5,
        images: prev.images + Math.floor(Math.random() * 5) - 2,
        battery: Math.min(100, Math.max(30, prev.battery + Math.floor(Math.random() * 6) - 3))
      }));
    }, 5000);

    const scrollInterval = setInterval(() => {
      const activityList = document.querySelector('.activity-list');
      if (activityList) {
        activityList.scrollTop += 1;
        if (activityList.scrollTop >= activityList.scrollHeight - activityList.clientHeight) {
          activityList.scrollTop = 0;
        }
      }
    }, 50);

    const scheduleScrollInterval = setInterval(() => {
      const scheduleList = document.querySelector('.schedule-list');
      if (scheduleList) {
        scheduleList.scrollTop += 1;
        if (scheduleList.scrollTop >= scheduleList.scrollHeight - scheduleList.clientHeight) {
          scheduleList.scrollTop = 0;
        }
      }
    }, 50);

    return () => {
      clearInterval(interval);
      clearInterval(scrollInterval);
      clearInterval(scheduleScrollInterval);
    };
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
              <Icon icon="heroicons:map-pin" style={{width: '24px', height: '24px', color: 'var(--color-blue)'}} />
            </div>
            <div className="stat-card-trend up">+12%</div>
          </div>
          <div className="stat-card-value">{stats.inspectionPoints.toLocaleString()}</div>
          <div className="stat-card-label">今日巡检点</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon">
              <Icon icon="heroicons:camera" style={{width: '24px', height: '24px', color: 'var(--color-blue)'}} />
            </div>
            <div className="stat-card-trend up">+8%</div>
          </div>
          <div className="stat-card-value">{stats.images.toLocaleString()}</div>
          <div className="stat-card-label">采集图像</div>
        </div>

        <div className="stat-card alert">
          <div className="stat-card-header">
            <div className="stat-card-icon">
              <Icon icon="heroicons:exclamation-circle" style={{width: '24px', height: '24px', color: 'var(--color-danger)'}} />
            </div>
            <div className="stat-card-trend down">-23%</div>
          </div>
          <div className="stat-card-value">{stats.alerts}</div>
          <div className="stat-card-label">活跃告警</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon">
              <Icon icon="heroicons:battery-100" style={{width: '24px', height: '24px', color: 'var(--color-blue)'}} />
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
            {schedules.map((schedule, idx) => (
              <div key={idx} className={`schedule-item ${schedule.status === 'running' ? 'active' : ''}`}>
                <div className="schedule-info">
                  <div className="schedule-time">{schedule.time}</div>
                  <div className="schedule-details">
                    <div className="schedule-title">{schedule.title}</div>
                    <div className="schedule-location">{schedule.location}</div>
                  </div>
                </div>
                <div className={`schedule-status ${schedule.status}`}>
                  {schedule.status === 'running' ? '进行中' : '待执行'}
                </div>
              </div>
            ))}
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
                  <Icon
                    icon={activity.icon}
                    style={{
                      width: '16px',
                      height: '16px',
                      color: activity.alert ? 'var(--color-danger)' : 'var(--color-blue)'
                    }}
                  />
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
              <Icon icon="heroicons:exclamation-triangle" style={{width: '24px', height: '24px', color: 'white'}} />
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
              <Icon icon="heroicons:check-circle" style={{width: '14px', height: '14px'}} />
              <span>立即确认</span>
            </button>
            <button className="btn btn-secondary">
              <Icon icon="heroicons:eye" style={{width: '14px', height: '14px'}} />
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
                    <Icon icon={item.icon} style={{width: '18px', height: '18px', color: 'var(--color-blue)'}} />
                  </div>
                  <div className="access-text">
                    <div className="access-title">{item.title}</div>
                    <div className="access-desc">{item.desc}</div>
                  </div>
                </div>
                <Icon icon="heroicons:chevron-right" style={{width: '16px', height: '16px', color: 'var(--color-text-muted)'}} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
