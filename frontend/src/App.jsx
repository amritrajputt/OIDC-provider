import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Consent from './components/Consent';
import RegisterClient from './components/RegisterClient';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/consent" element={<Consent />} />
        <Route path="/register-client" element={<RegisterClient />} />
        <Route path="/signup" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
