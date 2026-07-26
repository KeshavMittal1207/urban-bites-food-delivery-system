import React, { useState } from 'react';
import apiClient from '../../services/apiClient';
import { toast } from 'react-toastify';
import './Login.css';

const DEMO_ADMIN_EMAIL = import.meta.env.VITE_DEMO_ADMIN_EMAIL ;
const DEMO_ADMIN_PASSWORD = import.meta.env.VITE_DEMO_ADMIN_PASSWORD;

const Login = ({ onLoginSuccess }) => {
  const [data, setData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  const onChangeHandler = (event) => {
    const { name, value } = event.target;
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmitHandler = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await apiClient.post('/api/login', data);
      if (response.data?.token) {
        localStorage.setItem('adminToken', response.data.token);
        localStorage.setItem('adminEmail', response.data.email);
        toast.success('Admin Login Successful');
        onLoginSuccess();
      } else {
        toast.error('Login failed. Invalid response from server.');
      }
    } catch (error) {
      toast.error('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAdminLogin = async () => {
    const demoData = {
      email: DEMO_ADMIN_EMAIL,
      password: DEMO_ADMIN_PASSWORD,
    };
    setData(demoData);
    setLoading(true);

    try {
      const response = await apiClient.post('/api/login', demoData);
      if (response.data?.token) {
        localStorage.setItem('adminToken', response.data.token);
        localStorage.setItem('adminEmail', response.data.email);
        toast.success('Demo Admin Login Successful');
        onLoginSuccess();
      } else {
        toast.error('Demo Login failed. Server response invalid.');
      }
    } catch (error) {
      toast.error('Demo Login failed. Ensure backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-wrapper">
      <div className="login-glass-card shadow-lg">
        <div className="text-center mb-4">
          <div className="brand-logo mb-3">
            <i className="bi bi-shield-lock display-4 text-warning"></i>
          </div>
          <h2 className="fw-bold text-white mb-1">Urban Bites Admin Control</h2>
          <p className="text-white-50 small">Enter administrator credentials or use quick demo access</p>
        </div>

        {/* ONE-CLICK DEMO ADMIN AUTO-FILL CARD FOR RECRUITER TESTING */}
        <div className="mb-4 p-3 rounded-3 text-center" style={{ background: 'rgba(255, 193, 7, 0.1)', border: '1px solid rgba(255, 193, 7, 0.3)' }}>
          <p className="text-warning small fw-semibold mb-2">⚡ Recruiter &amp; Visitor Quick Access</p>
          <button
            type="button"
            onClick={handleDemoAdminLogin}
            className="btn btn-warning w-100 py-2 rounded-pill fw-bold text-dark text-uppercase shadow-sm transition-btn"
            disabled={loading}
          >
            <i className="bi bi-lightning-charge-fill me-1"></i> One-Click Demo Admin Login
          </button>
          <small className="d-block text-white-50 mt-2" style={{ fontSize: '0.75rem' }}>
            Auto-logs in as <code>{DEMO_ADMIN_EMAIL}</code>
          </small>
        </div>

        <div className="position-relative my-4 text-center">
          <hr className="border-secondary my-0" />
          <span className="position-absolute top-50 start-50 translate-middle px-3 text-white-50 bg-dark small">OR LOGIN MANUALLY (PRIMARY ADMIN)</span>
        </div>

        {/* MANUAL LOGIN FORM FOR PRIMARY ADMIN */}
        <form onSubmit={onSubmitHandler}>
          <div className="form-group mb-3">
            <label className="text-white-50 mb-2" style={{ fontSize: '0.9rem' }}>Admin Email</label>
            <div className="input-group">
              <span className="input-group-text bg-transparent border-end-0 border-white-10 text-white-50">
                <i className="bi bi-envelope"></i>
              </span>
              <input
                type="email"
                className="form-control bg-transparent text-white border-start-0 border-white-10"
                name="email"
                placeholder="Enter admin email"
                value={data.email}
                onChange={onChangeHandler}
                required
              />
            </div>
          </div>
          <div className="form-group mb-4">
            <label className="text-white-50 mb-2" style={{ fontSize: '0.9rem' }}>Password</label>
            <div className="input-group">
              <span className="input-group-text bg-transparent border-end-0 border-white-10 text-white-50">
                <i className="bi bi-key"></i>
              </span>
              <input
                type="password"
                className="form-control bg-transparent text-white border-start-0 border-white-10"
                name="password"
                placeholder="Enter password"
                value={data.password}
                onChange={onChangeHandler}
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="btn btn-outline-warning w-100 py-3 rounded-pill fw-bold text-uppercase shadow-sm transition-btn"
            disabled={loading}
          >
            {loading ? 'Authorizing...' : 'Secure Admin Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
