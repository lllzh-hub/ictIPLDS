import { useState, useRef, useEffect } from 'react';
import { aiApi } from '../api/defectApi';
import Icon from './common/Icon';

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
  const messageIdCounter = useRef(2);

  // 调试：确认代码已更新
  useEffect(() => {
    console.log('AIAssistant 组件已更新 - 使用唯一ID作为key');
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: String(messageIdCounter.current++), role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await aiApi.analyzeDefect(userMessage);
      setMessages(prev => [...prev, { id: String(messageIdCounter.current++), role: 'assistant', content: response }]);
    } catch (error: any) {
      console.error('AI分析失败:', error);
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
      
      setMessages(prev => [...prev, { 
        id: String(messageIdCounter.current++),
        role: 'assistant', 
        content: errorMessage
      }]);
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
    setMessages([
      { id: '1', role: 'assistant', content: '你好！我是AI智能助手，可以帮你分析电力设备缺陷。请描述你遇到的问题。' }
    ]);
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

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 z-50 group animate-bounce"
        title="AI智能助手"
        style={{ animationDuration: '2s' }}
      >
        <Icon icon="mdi:robot-excited" className="text-3xl group-hover:scale-110 transition-transform" />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse border-2 border-white"></div>
        <div className="absolute inset-0 rounded-full bg-violet-400 opacity-0 group-hover:opacity-20 transition-opacity"></div>
      </button>
    );
  }

  return (
    <div 
      className={`fixed bottom-6 right-6 bg-slate-900 border border-violet-500/30 rounded-2xl shadow-2xl z-50 transition-all ${
        isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
      }`}
    >
      {/* 头部 */}
      <div className="h-16 bg-gradient-to-r from-violet-600 to-purple-600 rounded-t-2xl px-4 flex items-center justify-between cursor-pointer" onClick={() => isMinimized && setIsMinimized(false)}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Icon icon="mdi:robot-excited" className="text-white text-xl" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">AI智能助手</h3>
            <p className="text-violet-200 text-xs">
              {loading ? '思考中...' : '在线'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="w-8 h-8 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
              title="更多"
            >
              <Icon icon="heroicons:ellipsis-vertical" className="text-white" />
            </button>
            {showMenu && (
              <div className="absolute top-10 right-0 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 w-36 z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNewChat();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center space-x-2"
                >
                  <Icon icon="heroicons:plus" className="" />
                  <span>新增对话</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMessages([]);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center space-x-2"
                >
                  <Icon icon="heroicons:trash" className="" />
                  <span>清空对话</span>
                </button>
              </div>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleMinimize();
            }}
            className="w-8 h-8 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
            title="最小化"
          >
            <Icon icon="heroicons:minus" className="text-white" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
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
          <div className="h-[calc(100%-8rem)] overflow-y-auto p-4 space-y-4 bg-slate-950" onClick={() => setShowMenu(false)}>
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <Icon icon="mdi:robot-excited-outline" className="text-6xl mb-4" />
                <p className="text-sm">开始新的对话</p>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-800 text-slate-200 border border-slate-700'
                  }`}
                >
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
          <div className="h-20 border-t border-slate-800 p-3 bg-slate-900" onClick={() => setShowMenu(false)}>
            <div className="flex items-center space-x-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入你的问题... (Shift+Enter换行)"
                disabled={loading}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none disabled:opacity-50"
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

