import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/common/Icon';

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('gridEyeRememberUser');
    if (saved) { setUsername(saved); setRememberMe(true); }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim()) { setError('请输入用户名'); return; }
    if (!password.trim()) { setError('请输入密码'); return; }
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      if ((username === 'admin' && password === 'admin123') ||
          (username === 'operator' && password === 'op123456')) {
        if (rememberMe) localStorage.setItem('gridEyeRememberUser', username);
        else localStorage.removeItem('gridEyeRememberUser');
        sessionStorage.setItem('gridEyeAuth', JSON.stringify({
          username,
          role: username === 'admin' ? '系统管理员' : '巡检操作员',
          loginTime: new Date().toISOString(),
        }));
        navigate('/', { replace: true });
      } else {
        setError('用户名或密码错误');
      }
    } catch {
      setError('登录服务暂不可用，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center relative overflow-hidden">
      {/* 多层背景 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(14,165,233,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(14,165,233,0.04) 1px,transparent 1px)',
          backgroundSize: '50px 50px',
        }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-cyan-500/[0.04] rounded-full blur-[150px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] w-[600px] h-[600px] bg-blue-600/[0.06] rounded-full blur-[120px]" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-500/[0.03] rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-cyan-500/[0.03] rounded-full blur-[100px]" />
      </div>

      {/* 四角装饰线 */}
      <div className="absolute top-8 left-8 w-20 h-20 border-l-2 border-t-2 border-cyan-500/20 rounded-tl-lg pointer-events-none" />
      <div className="absolute top-8 right-8 w-20 h-20 border-r-2 border-t-2 border-cyan-500/20 rounded-tr-lg pointer-events-none" />
      <div className="absolute bottom-8 left-8 w-20 h-20 border-l-2 border-b-2 border-cyan-500/20 rounded-bl-lg pointer-events-none" />
      <div className="absolute bottom-8 right-8 w-20 h-20 border-r-2 border-b-2 border-cyan-500/20 rounded-br-lg pointer-events-none" />

      {/* 登录卡片 */}
      <div className="relative z-10 w-full max-w-[560px] mx-6">
        {/* 外层光晕 */}
        <div className="absolute -inset-[1px] bg-gradient-to-b from-cyan-500/20 via-blue-500/10 to-purple-500/20 rounded-3xl blur-[1px]" />

        <div className="relative bg-[#0d1225]/90 backdrop-blur-2xl border border-slate-700/40 rounded-3xl shadow-2xl shadow-black/40 overflow-hidden">
          {/* 顶部渐变条 */}
          <div className="h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

          <div className="px-14 pt-14 pb-10">
            {/* Logo */}
            <div className="flex flex-col items-center mb-10">
              <div className="p-5 bg-gradient-to-br from-cyan-500/15 to-blue-600/15 rounded-2xl border border-cyan-500/20 shadow-lg shadow-cyan-500/10 mb-6">
                <Icon icon="material-symbols:grid-on-outline" className="text-cyan-400 text-5xl" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 mb-1.5">
                Grid Eye
              </h1>
              <p className="text-sm text-slate-500 tracking-widest font-mono">基于MindSpore的电力缺陷检测系统</p>
            </div>

            {/* 表单 */}
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2.5">用户名</label>
                <div className="relative group">
                  <Icon icon="heroicons:user" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors text-lg" />
                  <input type="text" value={username}
                    onChange={e => { setUsername(e.target.value); setError(''); }}
                    placeholder="请输入用户名" autoComplete="username"
                    className="w-full pl-12 pr-5 py-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl text-base text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 focus:bg-slate-800/60 transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2.5">密码</label>
                <div className="relative group">
                  <Icon icon="heroicons:lock-closed" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors text-lg" />
                  <input type={showPassword ? 'text' : 'password'} value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    placeholder="请输入密码" autoComplete="current-password"
                    className="w-full pl-12 pr-14 py-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl text-base text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 focus:bg-slate-800/60 transition-all" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                    <Icon icon={showPassword ? 'heroicons:eye-slash' : 'heroicons:eye'} className="text-xl" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500/20 focus:ring-offset-0 cursor-pointer" />
                  <span className="text-sm text-slate-400">记住用户名</span>
                </label>
              </div>

              {error && (
                <div className="flex items-center gap-3 px-5 py-3.5 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <Icon icon="heroicons:exclamation-circle" className="text-red-400 text-xl flex-shrink-0" />
                  <span className="text-sm text-red-300">{error}</span>
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-0.5 disabled:shadow-none disabled:translate-y-0 flex items-center justify-center gap-2 text-base">
                {loading ? (
                  <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>登录中...</span></>
                ) : (
                  <span>登 录</span>
                )}
              </button>
            </form>

            {/* 分隔线 */}
            <div className="flex items-center gap-4 my-7">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
              <span className="text-xs text-slate-600 tracking-wider">快速填充</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
            </div>

            {/* 快捷按钮 */}
            <div className="grid grid-cols-2 gap-4">
              <button type="button" onClick={() => { setUsername('admin'); setPassword('admin123'); setError(''); }}
                className="flex items-center justify-center gap-2.5 py-3 bg-slate-800/30 border border-slate-700/40 rounded-xl text-sm text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all">
                <Icon icon="heroicons:shield-check" className="text-lg" /><span>管理员</span>
              </button>
              <button type="button" onClick={() => { setUsername('operator'); setPassword('op123456'); setError(''); }}
                className="flex items-center justify-center gap-2.5 py-3 bg-slate-800/30 border border-slate-700/40 rounded-xl text-sm text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all">
                <Icon icon="heroicons:wrench-screwdriver" className="text-lg" /><span>操作员</span>
              </button>
            </div>
          </div>

          {/* 底部 */}
          <div className="border-t border-slate-800/50 px-14 py-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-slate-600">系统运行正常</span>
            </div>
            <span className="text-xs text-slate-600 font-mono">&copy; {new Date().getFullYear()} Grid Eye v1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
