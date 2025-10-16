import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

interface LoginProps {
  initialData?: any;
}

const Login: React.FC<LoginProps> = () => {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/admin/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Redirect to dashboard
        window.location.href = '/admin/dashboard';
      } else {
        setError(data.message || 'Invalid credentials');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <i className="fas fa-shield-alt"></i>
          </div>
          <h1>Admin Panel</h1>
          <p>Research Indicators Management</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="alert alert-error">
              <i className="fas fa-exclamation-circle"></i>
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="clientId">
              <i className="fas fa-key"></i>
              Client ID
            </label>
            <input
              type="text"
              id="clientId"
              className="form-control"
              placeholder="Enter your client ID"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="clientSecret">
              <i className="fas fa-lock"></i>
              Client Secret
            </label>
            <input
              type="password"
              id="clientSecret"
              className="form-control"
              placeholder="Enter your client secret"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-login"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Authenticating...
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt"></i>
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>Secure authentication powered by Alliance Management</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
