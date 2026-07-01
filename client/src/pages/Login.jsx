import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { login as loginEndpoint, signup } from "../services/auth"
import { useAuth } from '../store/auth';
import '../styles/Login.scss';
import { Sparkles } from 'lucide-react';

// Define Zod schemas for login and signup
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

const signupSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function Login() {
  const [login, setLogin] = useState(true);
  const [googleError, setGoogleError] = useState("");
  const { setUser } = useAuth()

  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors, isSubmitting: isLoginSubmitting },
    reset: resetLogin,
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      rememberMe: false,
    },
  });

  const {
    register: registerSignup,
    handleSubmit: handleSignupSubmit,
    formState: { errors: signupErrors, isSubmitting: isSignupSubmitting },
    reset: resetSignup,
  } = useForm({
    resolver: zodResolver(signupSchema),
  });

  const onLoginSubmit = (data) => {
    loginEndpoint(data.email, data.password).then((res) => {
      setUser(res.data.user)
    }).catch(err => {
      setGoogleError(err.response.data.message)
    })
  };

  const onSignupSubmit = (data) => {
    signup(data.email, data.password, data.name).then((res) => {
      setUser(res.data.user)
      res.data.errors && setGoogleError(res.data.errors[0].msg)
    }).catch(err => {
      setGoogleError(err.response.data.message)
    })
  };

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/api/v1/auth/google`;
  }

  const toggleForm = () => {
    setLogin(!login);
    resetLogin();
    resetSignup();
    setGoogleError("");
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (error) {
      setGoogleError(decodeURIComponent(error));
    }
  }, []);

  return (
    <div className="login-container">
       {/* Right Section - Hero with Animations */}
      <div className="hero-section">
        <div className="hero-pattern">
          <div className="circle circle-1"></div>
          <div className="circle circle-2"></div>
          <div className="circle circle-3"></div>
          <div className="circle circle-4"></div>
        </div>

        <div className="hero-content">
          {/* Floating Message Bubbles */}
          <div className="chat-bubbles">
            <div className="bubble-large">
              <div className="bubble-line"></div>
              <div className="bubble-line"></div>
              <div className="bubble-line short"></div>
            </div>

            <div className="bubble-small-group">
              <div className="bubble-small bubble-small-1">
                <div className="bubble-line"></div>
                <div className="bubble-line short"></div>
              </div>
              <div className="bubble-small bubble-small-2">
                <div className="bubble-line"></div>
                <div className="bubble-line medium"></div>
              </div>
            </div>

            <div className="floating-dots">
              <div className="dot dot-1"></div>
              <div className="dot dot-2"></div>
              <div className="dot dot-3"></div>
            </div>
          </div>

          <h2>Simple. Secure. Seamless.</h2>
          <p>
            Free, secure, and reliable messaging for everyone.
            <br />
            Your conversations, your way.
          </p>

          <div className="stats">
            <div className="stat-item">
              <div className="stat-number">15.7k+</div>
              <div className="stat-label">Active Users</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-number">1M+</div>
              <div className="stat-label">Messages Sent</div>
            </div>
          </div>
        </div>
      </div>
      {/* Left Section - Login Form */}
      <div className="login-form-wrapper">
        <div className="login-form-inner">
          <div className="brand-header">
            <Sparkles size={30} className="brand-icon" />
            <span className="brand-name">Nexus</span>
          </div>

          <h1 className="welcome-title">Welcome back</h1>
          <p className="welcome-subtitle">Sign in to continue your conversations</p>

          {googleError && (
            <div className="error-message">{googleError}</div>
          )}

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="google-btn"
          >
            <svg className="google-icon" viewBox="0 0 48 48" width="24" height="24">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
              <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="divider">
            <span>OR</span>
          </div>

          {login ? (
            <form onSubmit={handleLoginSubmit(onLoginSubmit)} className="auth-form">
              <div className="form-group">
                <label htmlFor="login-email">Email address</label>
                <input
                  type="email"
                  id="login-email"
                  {...registerLogin('email')}
                  placeholder="Enter your email"
                  className={loginErrors.email ? 'input-error' : ''}
                />
                {loginErrors.email && (
                  <p className="field-error">{loginErrors.email.message}</p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="login-password">Password</label>
                <input
                  type="password"
                  id="login-password"
                  {...registerLogin('password')}
                  placeholder="Enter your password"
                  className={loginErrors.password ? 'input-error' : ''}
                />
                {loginErrors.password && (
                  <p className="field-error">{loginErrors.password.message}</p>
                )}
              </div>

              <div className="form-options">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    {...registerLogin('rememberMe')}
                  />
                  <span>Remember me</span>
                </label>
                <button type="button" className="forgot-password">
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoginSubmitting}
                className="submit-btn"
              >
                {isLoginSubmitting ? 'Signing in...' : 'Sign in to your account'}
                <svg className="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>

              <p className="toggle-form">
                Don't have an account?{' '}
                <button type="button" onClick={toggleForm}>
                  Sign up
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleSignupSubmit(onSignupSubmit)} className="auth-form">
              <div className="form-group">
                <label htmlFor="signup-name">Full name</label>
                <input
                  type="text"
                  id="signup-name"
                  {...registerSignup('name')}
                  placeholder="Enter your full name"
                  className={signupErrors.name ? 'input-error' : ''}
                />
                {signupErrors.name && (
                  <p className="field-error">{signupErrors.name.message}</p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="signup-email">Email address</label>
                <input
                  type="email"
                  id="signup-email"
                  {...registerSignup('email')}
                  placeholder="Enter your email"
                  className={signupErrors.email ? 'input-error' : ''}
                />
                {signupErrors.email && (
                  <p className="field-error">{signupErrors.email.message}</p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="signup-password">Password</label>
                <input
                  type="password"
                  id="signup-password"
                  {...registerSignup('password')}
                  placeholder="Create a password"
                  className={signupErrors.password ? 'input-error' : ''}
                />
                {signupErrors.password && (
                  <p className="field-error">{signupErrors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSignupSubmitting}
                className="submit-btn"
              >
                {isSignupSubmitting ? 'Creating account...' : 'Create account'}
                <svg className="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>

              <p className="toggle-form">
                Already have an account?{' '}
                <button type="button" onClick={toggleForm}>
                  Sign in
                </button>
              </p>
            </form>
          )}
        </div>
      </div>

     
    </div>
  );
}