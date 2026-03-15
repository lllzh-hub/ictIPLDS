import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icon from '../common/Icon';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const [avatarError, setAvatarError] = useState(false);

  const menuItems = [
    { path: '/', label: '态势感知驾驶舱', icon: 'material-symbols:dashboard-outline' },
    { path: '/defect-management', label: '缺陷管理', icon: 'material-symbols:bug-report-outline' },
    { path: '/uav-management', label: '无人机管理', icon: 'mdi:quadcopter' },
    { path: '/flight-path', label: '航线规划', icon: 'material-symbols:route-outline' },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 overflow-hidden">
      {/* 左侧菜单栏 */}
      <aside className="w-72 glass-effect border-r border-slate-800/50 flex flex-col relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
          <div className="absolute top-20 -left-20 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 -left-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"></div>
        </div>

        {/* Logo 区域 */}
        <div className="h-20 flex items-center px-6 border-b border-slate-800/50 relative z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl border border-cyan-500/30 shadow-lg shadow-cyan-500/20">
              <Icon icon="material-symbols:grid-on-outline" className="text-cyan-400 text-2xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400">
              Grid Eye
            </h1>
              <p className="text-xs text-slate-500 font-mono">智能电网监测系统</p>
            </div>
          </div>
        </div>

        {/* 菜单项 */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 hide-scrollbar relative z-10">
          <div className="space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
                className={`group flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-300 ${
                isActive(item.path)
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/10'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
              }`}
            >
                <div className={`p-2 rounded-lg transition-all ${
                  isActive(item.path) 
                    ? 'bg-cyan-500/20 text-cyan-400' 
                    : 'bg-slate-800/50 text-slate-500 group-hover:bg-slate-700/50 group-hover:text-slate-300'
                }`}>
              <Icon icon={item.icon} className="text-xl" />
                </div>
                <span className="text-sm font-semibold">{item.label}</span>
                {isActive(item.path) && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
                )}
            </Link>
          ))}
          </div>
        </nav>

        {/* 底部装饰 */}
        <div className="p-4 border-t border-slate-800/50 relative z-10">
          <div className="bg-gradient-to-r from-slate-800/50 to-slate-800/30 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs font-semibold text-slate-400">系统状态</span>
            </div>
            <p className="text-xs text-slate-500">所有服务运行正常</p>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部栏 */}
        <header className="h-20 glass-effect border-b border-slate-800/50 flex items-center justify-between px-8 backdrop-blur-xl relative overflow-hidden">
          {/* 背景装饰 */}
          <div className="absolute top-0 right-0 w-96 h-full opacity-20 pointer-events-none">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl"></div>
          </div>

          <div className="flex items-center space-x-6 relative z-10">
            <div>
              <h2 className="text-xl font-bold text-slate-100">
              {menuItems.find(item => isActive(item.path))?.label || 'Grid Eye'}
            </h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {new Date().toLocaleString('zh-CN', { 
                  year: 'numeric',
                  month: '2-digit', 
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>

          {/* 右上角：管理员信息 */}
          <div className="flex items-center space-x-4 relative z-10">
            <div className="flex items-center space-x-3 glass-effect px-5 py-3 rounded-xl border border-slate-700/50 hover:border-cyan-500/30 transition-all">
              <div className="relative">
                {!avatarError ? (
                  <img
                    src="https://modao.cc/agent-py/media/generated_images/2026-01-21/a08ab317c5b34a798f439c2dce97c4cc.jpg"
                    alt="管理员头像"
                    className="w-10 h-10 rounded-full border-2 border-cyan-500/30"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-sm text-cyan-400 border-2 border-cyan-500/30">
                    <Icon icon="heroicons:user" />
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900"></div>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-200">管理员</span>
                <span className="text-xs text-slate-500 font-mono">Admin</span>
              </div>
            </div>
          </div>
        </header>

        {/* 页面内容 */}
        <main className="flex-1 overflow-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;

