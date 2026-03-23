import { useState, useRef, useEffect } from 'react';
import { aiApi } from '../../api/defectApi';
import Icon from '../common/Icon';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: '你好！我是AI智能助手，可以帮你分析电力设备缺陷。请描述你遇到的问题。' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const messageIdCounter = useRef(2);

  // 拖动状态全部用 ref，不触发重渲染
  const isDraggingRef = useRef(false);
  const posRef = useRef({ x: 0, y: 0 });
  const offsetRef = useRef({ x: 0, y: 0 });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 容器挂载后立即设置初始位置（跟随圆形按钮当前位置）
  const setContainerRef = (el: HTMLDivElement | null) => {
    containerRef.current = el;
    if (el) {
      // 以圆形按钮中心为基准，让面板右下角对齐按钮中心
      const fabCenterX = fabPosRef.current.x + 32;
      const fabCenterY = fabPosRef.current.y + 32;
      let x = fabCenterX - 384;
      let y = fabCenterY - 600;
      // 确保不超出视口
      x = Math.max(0, Math.min(x, window.innerWidth - 384));
      y = Math.max(0, Math.min(y, window.innerHeight - 600));
      posRef.current = { x, y };
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    }
  };

  // 注册全局 mousemove / mouseup，组件挂载时绑定，卸载时清除
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      const newX = e.clientX - offsetRef.current.x;
      const newY = e.clientY - offsetRef.current.y;
      const maxX = window.innerWidth - 384;
      const maxY = window.innerHeight - (containerRef.current.offsetHeight || 600);
      posRef.current = {
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      };
      containerRef.current.style.left = `${posRef.current.x}px`;
      containerRef.current.style.top = `${posRef.current.y}px`;
    };

    const onMouseUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      if (containerRef.current) {
        containerRef.current.style.cursor = 'grab';
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('textarea')) return;
    e.preventDefault();
    isDraggingRef.current = true;
    offsetRef.current = {
      x: e.clientX - posRef.current.x,
      y: e.clientY - posRef.current.y,
    };
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grabbing';
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: String(messageIdCounter.current++), role: 'user', content: userMessage }]);
    setLoading(true);
    try {
      const response = await aiApi.analyzeDefect(userMessage);
      setMessages(prev => [...prev, { id: String(messageIdCounter.current++), role: 'assistant', content: String(response) }]);
    } catch (error: any) {
      let errorMessage = '抱歉，AI分析服务暂时不可用。\n\n';
      if (error.code === 'ECONNABORTED') {
        errorMessage += '错误：请求超时，请检查网络连接。';
      } else if (error.code === 'ERR_NETWORK') {
        errorMessage += '错误：无法连接到后端服务。\n请确保后端服务运行在 http://localhost:8081';
      } else if (error.response) {
        errorMessage += `错误：${error.response.status} - ${error.response.data?.error || error.response.statusText}`;
      } else if (error.request) {
        errorMessage += '错误：后端服务未响应。\n请检查：\n1. 后端是否在运行\n2. 端口8081是否被占用\n3. MySQL数据库是否启动';
      } else {
        errorMessage += `错误：${error.message}`;
      }
      setMessages(prev => [...prev, { id: String(messageIdCounter.current++), role: 'assistant', content: errorMessage }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    messageIdCounter.current = 2;
    setMessages([{ id: '1', role: 'assistant', content: '你好！我是AI智能助手，可以帮你分析电力设备缺陷。请描述你遇到的问题。' }]);
    setShowMenu(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
    setShowMenu(false);
  };

  const handleMinimize = () => {
    setIsMinimized(true);
    setShowMenu(false);
  };

  // 圆形按钮拖动相关 ref
  const fabRef = useRef<HTMLDivElement | null>(null);
  const fabPosRef = useRef({ x: window.innerWidth - 64 - 24, y: window.innerHeight - 64 - 24 });
  const fabOffsetRef = useRef({ x: 0, y: 0 });
  const fabDraggingRef = useRef(false);
  const fabDidDragRef = useRef(false);

  const setFabRef = (el: HTMLDivElement | null) => {
    fabRef.current = el;
    if (el) {
      el.style.left = `${fabPosRef.current.x}px`;
      el.style.top = `${fabPosRef.current.y}px`;
    }
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!fabDraggingRef.current || !fabRef.current) return;
      fabDidDragRef.current = true;
      const newX = Math.max(0, Math.min(e.clientX - fabOffsetRef.current.x, window.innerWidth - 64));
      const newY = Math.max(0, Math.min(e.clientY - fabOffsetRef.current.y, window.innerHeight - 64));
      fabPosRef.current = { x: newX, y: newY };
      fabRef.current.style.left = `${newX}px`;
      fabRef.current.style.top = `${newY}px`;
    };
    const onUp = () => { fabDraggingRef.current = false; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  if (!isOpen) {
    return (
      <div
        ref={setFabRef}
        className="fixed w-16 h-16 bg-gradient-to-br from-violet-600 to-purple-600 text-white rounded-full shadow-2xl flex items-center justify-center z-50 group animate-bounce"
        title="AI智能助手"
        style={{ animationDuration: '2s', cursor: 'grab', userSelect: 'none' }}
        onMouseDown={(e) => {
          e.preventDefault();
          fabDraggingRef.current = true;
          fabDidDragRef.current = false;
          fabOffsetRef.current = {
            x: e.clientX - fabPosRef.current.x,
            y: e.clientY - fabPosRef.current.y,
          };
        }}
        onClick={() => {
          if (!fabDidDragRef.current) setIsOpen(true);
        }}
      >
        <Icon icon="mdi:robot-excited" className="text-3xl" />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse border-2 border-white"></div>
        <div className="absolute inset-0 rounded-full bg-violet-400 opacity-0 group-hover:opacity-20 transition-opacity"></div>
      </div>
    );
  }

  return (
    <div
      ref={setContainerRef}
      className={`fixed bg-slate-900 border border-violet-500/30 rounded-2xl shadow-2xl z-50 ${
        isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
      }`}
      style={{ cursor: 'grab', userSelect: 'none' }}
    >
      {/* 头部拖动区域 */}
      <div
        className="h-16 bg-gradient-to-r from-violet-600 to-purple-600 rounded-t-2xl px-4 flex items-center justify-between"
        onMouseDown={handleMouseDown}
        onClick={() => isMinimized && setIsMinimized(false)}
      >
        <div className="flex items-center space-x-3 pointer-events-none">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Icon icon="mdi:robot-excited" className="text-white text-xl" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">AI智能助手</h3>
            <p className="text-violet-200 text-xs">{loading ? '思考中...' : '在线'}</p>
          </div>
        </div>
        <div className="flex items-center space-x-1 pointer-events-auto">
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              className="w-8 h-8 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
              title="更多"
            >
              <Icon icon="heroicons:ellipsis-vertical" className="text-white" />
            </button>
            {showMenu && (
              <div className="absolute top-10 right-0 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 w-36 z-10">
                <button
                  onClick={(e) => { e.stopPropagation(); handleNewChat(); }}
                  className="w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center space-x-2"
                >
                  <Icon icon="heroicons:plus" />
                  <span>新增对话</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setMessages([]); setShowMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center space-x-2"
                >
                  <Icon icon="heroicons:trash" />
                  <span>清空对话</span>
                </button>
              </div>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handleMinimize(); }}
            className="w-8 h-8 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
            title="最小化"
          >
            <Icon icon="heroicons:minus" className="text-white" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleClose(); }}
            className="w-8 h-8 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
            title="关闭"
          >
            <Icon icon="heroicons:x-mark" className="text-white" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* 消息区域 */}
          <div
            className="h-[calc(100%-8rem)] overflow-y-auto p-4 space-y-4 bg-slate-950"
            style={{ userSelect: 'text', cursor: 'auto' }}
            onClick={() => setShowMenu(false)}
          >
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <Icon icon="mdi:robot-excited-outline" className="text-6xl mb-4" />
                <p className="text-sm">开始新的对话</p>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-800 text-slate-200 border border-slate-700'
                }`}>
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 输入区域 */}
          <div
            className="h-20 border-t border-slate-800 p-3 bg-slate-900"
            style={{ cursor: 'auto' }}
            onClick={() => setShowMenu(false)}
          >
            <div className="flex items-center space-x-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入你的问题... (Shift+Enter换行)"
                disabled={loading}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none disabled:opacity-50"
                style={{ cursor: 'text', userSelect: 'text' }}
                rows={2}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="w-10 h-10 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
                title="发送(Enter)"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AIAssistant;
                  