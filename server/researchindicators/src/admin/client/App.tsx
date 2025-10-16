import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Login from './pages/Login';

interface AppProps {
  initialData?: any;
}

const App: React.FC<AppProps> = ({ initialData }) => {
  // Check if this is the login page
  const isLoginPage = initialData?.isLoginPage === true;

  // If it's the login page, render without layout
  if (isLoginPage) {
    return (
      <Routes>
        <Route path="/admin/login" element={<Login initialData={initialData} />} />
      </Routes>
    );
  }

  // Regular pages with layout
  return (
    <Layout>
      <Routes>
        <Route path="/admin" element={<Dashboard initialData={initialData} />} />
        <Route path="/admin/dashboard" element={<Dashboard initialData={initialData} />} />
        <Route path="/admin/users" element={<Users initialData={initialData} />} />
        <Route path="/admin/settings" element={<Settings initialData={initialData} />} />
      </Routes>
    </Layout>
  );
};

export default App;
