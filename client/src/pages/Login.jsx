import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {  z } from 'zod';
import { useEffect, useState } from 'react';
import { login as loginEndpoint, signup} from "../services/auth"
import { useAuth } from '../store/auth';

// Define Zod schemas for login and signup
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});


export default function Login() {
  const [login, setLogin] = useState(true);
  const [googleError, setGoogleError] = useState("");
  const { setUser, user, clearUser } = useAuth()

  // React Hook Form for login
  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors, isSubmitting: isLoginSubmitting },
    reset: resetLogin,
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  // React Hook Form for signup
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
     signup(data.email, data.password, data.password).then((res) => {
      setUser(res.data.user)
    }).catch(err => {
      setGoogleError(err.response.data.message)
    })
  };

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
  }

  const toggleForm = () => {
    setLogin(!login);
    // Reset forms when switching
    resetLogin();
    resetSignup();
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (error) {
      setGoogleError(decodeURIComponent(error));
    }
  }, []);

  return (
    <div className="flex min-h-screen">
      {/* Left Section - Login Form */}
      <div className="w-full lg:w-1/2 bg-blue-100 dark:bg-gray-800 p-8 lg:p-16 flex flex-col justify-center">
        <div className="max-w-md mx-auto w-full">
          <div className="flex items-center gap-1 min-w-fit mb-8">

            <span className="text-3xl  text-blue-600 dark:text-white hidden sm:block zalando font-semibold">ConvoX</span>
            <svg className="w-5 h-5 text-blue-600 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>

          {/* Social Login Buttons */}
          <div className="space-y-3 mb-6">
            {googleError && (

              <p className="text-red-500 text-sm mt-1">{googleError}</p>


            )}

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-lg flex items-center justify-center gap-3 transition-colors border border-gray-300 dark:border-gray-600 font-bold"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign in with Google
            </button>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600"></div>
            <span className="text-gray-500 dark:text-gray-400 text-sm">or</span>
            <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600"></div>
          </div>

          {login ? (
            <form onSubmit={handleLoginSubmit(onLoginSubmit)}>
              {/* Login Form */}
              <div className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">
                    Email
                  </label>
                  <input
                    type="email"
                    id="login-email"
                    {...registerLogin('email')}
                    placeholder="Enter your email"
                    className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  {loginErrors.email && (
                    <p className="text-red-500 text-sm mt-1">{loginErrors.email.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="login-password" className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">
                    Password
                  </label>
                  <input
                    type="password"
                    id="login-password"
                    {...registerLogin('password')}
                    placeholder="········"
                    className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  {loginErrors.password && (
                    <p className="text-red-500 text-sm mt-1">{loginErrors.password.message}</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div />
                  <button
                    type="button"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoginSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                >
                  {isLoginSubmitting ? 'Signing in...' : 'Sign in to your account'}
                </button>
              </div>

              <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={toggleForm}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors"
                >
                  Sign up
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleSignupSubmit(onSignupSubmit)}>
              {/* Signup Form */}
              <div className="space-y-4">
                <div>
                  <label htmlFor="signup-name" className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">
                    Name
                  </label>
                  <input
                    type="text"
                    id="signup-name"
                    {...registerSignup('name')}
                    placeholder="Enter your name"
                    className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  {signupErrors.name && (
                    <p className="text-red-500 text-sm mt-1">{signupErrors.name.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="signup-email" className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">
                    Email
                  </label>
                  <input
                    type="email"
                    id="signup-email"
                    {...registerSignup('email')}
                    placeholder="Enter your email"
                    className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  {signupErrors.email && (
                    <p className="text-red-500 text-sm mt-1">{signupErrors.email.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="signup-password" className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">
                    Password
                  </label>
                  <input
                    type="password"
                    id="signup-password"
                    {...registerSignup('password')}
                    placeholder="········"
                    className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  {signupErrors.password && (
                    <p className="text-red-500 text-sm mt-1">{signupErrors.password.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSignupSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 px-4 rounded-lg transition-colors mt-4"
                >
                  {isSignupSubmitting ? 'Creating account...' : 'Create account'}
                </button>
              </div>

              <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={toggleForm}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors"
                >
                  Login
                </button>
              </p>
            </form>
          )}
        </div>
      </div>

      {/* Right Section - Hero */}
      <div className="hidden lg:flex lg:w-1/2 bg-blue-600 p-16 flex-col justify-center items-center text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 border-4 border-white rounded-full"></div>
          <div className="absolute bottom-20 right-20 w-24 h-24 border-4 border-white rounded-full"></div>
          <div className="absolute top-1/2 left-1/4 w-16 h-16 border-4 border-white rounded-full"></div>
          <div className="absolute bottom-1/3 left-1/2 w-20 h-20 border-4 border-white rounded-full"></div>
        </div>

        <div className="max-w-xl text-center z-10">
          {/* Floating Message Bubbles Illustration */}
          <div className="relative mb-12">
            {/* Large Chat Bubble */}
            <div className="mx-auto w-64 h-40 bg-white/20 backdrop-blur-sm rounded-3xl rounded-bl-none p-6 mb-6 transform -rotate-3">
              <div className="space-y-3">
                <div className="h-3 bg-white/40 rounded w-3/4"></div>
                <div className="h-3 bg-white/40 rounded w-full"></div>
                <div className="h-3 bg-white/40 rounded w-1/2"></div>
              </div>
            </div>

            {/* Small Chat Bubbles */}
            <div className="flex justify-center gap-4">
              <div className="w-32 h-20 bg-white/20 backdrop-blur-sm rounded-2xl rounded-br-none p-4 transform rotate-2">
                <div className="space-y-2">
                  <div className="h-2 bg-white/40 rounded w-full"></div>
                  <div className="h-2 bg-white/40 rounded w-2/3"></div>
                </div>
              </div>
              <div className="w-32 h-20 bg-white/20 backdrop-blur-sm rounded-2xl rounded-bl-none p-4 transform -rotate-2">
                <div className="space-y-2">
                  <div className="h-2 bg-white/40 rounded w-full"></div>
                  <div className="h-2 bg-white/40 rounded w-3/4"></div>
                </div>
              </div>
            </div>

            {/* Floating Dots */}
            <div className="absolute -top-6 right-1/4 w-3 h-3 bg-white rounded-full animate-pulse"></div>
            <div className="absolute top-1/2 -right-8 w-2 h-2 bg-white rounded-full animate-pulse delay-100"></div>
            <div className="absolute -bottom-4 left-1/4 w-2.5 h-2.5 bg-white rounded-full animate-pulse delay-200"></div>
          </div>

          <h2 className="text-4xl font-bold mb-4">Simple. Secure. Seamless.</h2>
          <p className="text-blue-100 text-lg leading-relaxed">
            Free, secure, and reliable messaging for everyone. Your conversations, your way.
          </p>

          {/* Stats */}
          <div className="mt-12 flex justify-center gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold mb-1">15.7k+</div>
              <div className="text-blue-100 text-sm">Active Users</div>
            </div>
            <div className="w-px bg-white/20"></div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-1">1M+</div>
              <div className="text-blue-100 text-sm">Messages Sent</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}