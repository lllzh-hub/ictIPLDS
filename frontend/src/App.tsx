import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layouts/Layout';
import AIAssistant from './components/features/AIAssistant';
import Dashboard from './pages/Dashboard';
import DefectManagement from './pages/DefectManagement';
import DefectDetailView from './pages/DefectDetailView';
import UAVManagement from './pages/UAVManagement';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 缺陷详情页面 - 全屏显示，不使用 Layout */}
        <Route path="/defect/:id" element={<DefectDetailView />} />
        
        {/* 其他页面使用 Layout */}
        <Route path="/*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/defect-management" element={<DefectManagement />} />
              <Route path="/uav-management" element={<UAVManagement />} />
            </Routes>
          </Layout>
        } />
      </Routes>
      <AIAssistant />
    </BrowserRouter>
  );
}

export default App;
