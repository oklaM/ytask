import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import TaskList from './pages/TaskList';
import TaskForm from './pages/TaskForm';
import ExecutionLogs from './pages/ExecutionLogs';
import SmartTaskExamples from './pages/SmartTaskExamples';
import './App.css';

const App: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tasks" element={<TaskList />} />
            <Route path="/tasks/new" element={<TaskForm />} />
            <Route path="/tasks/:id/edit" element={<TaskForm />} />
            <Route path="/logs" element={<ExecutionLogs />} />
            <Route path="/smart-examples" element={<SmartTaskExamples />} />
          </Routes>
        </Layout>
      </Router>
    </ConfigProvider>
  );
};

export default App;