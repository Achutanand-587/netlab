import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Subnetting from './pages/Subnetting';
import ErrorDetection from './pages/ErrorDetection';
import Settings from './pages/Settings';
import PCAPAnalyzer from './pages/PCAPAnalyzer';
import ProtocolLab from './pages/ProtocolLab';
import TopologyLab from './pages/TopologyLab';
import BandwidthMonitor from './pages/BandwidthMonitor';
import LearningCenter from './pages/LearningCenter';
import Assessments from './pages/Assessments';
import Reports from './pages/Reports';
import Splash from './components/Splash';

export default function App() {
  return (
    <>
      <Splash />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="packets" element={<PCAPAnalyzer />} />
          <Route path="protocols" element={<ProtocolLab />} />
          <Route path="topology" element={<TopologyLab />} />
          <Route path="bandwidth" element={<BandwidthMonitor />} />
          <Route path="subnetting" element={<Subnetting />} />
          <Route path="errors" element={<ErrorDetection />} />
          <Route path="learn" element={<LearningCenter />} />
          <Route path="assessments" element={<Assessments />} />
          <Route path="quizzes" element={<Assessments />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </>
  );
}
