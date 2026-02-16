import React, { useState } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  CAlert,
  CButton,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilUser } from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import logoImage from '../../../assets/logo/DNAI-Logo 1 (1).png'
import illustrationImage from '../../../assets/logo/womeniscalling.png'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { login, isSupabaseConfigured, loading: authLoading, isAuthenticated, rolePrefix } = useAuth()
  const navigate = useNavigate()

  // If already authenticated, redirect to dashboard
  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CSpinner color="primary" />
      </div>
    )
  }

  if (isAuthenticated && rolePrefix) {
    return <Navigate to={`/${rolePrefix}/dashboard`} replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await login(email, password)

      if (result.success) {
        toast.success('Login successful! Redirecting...')
        // Small delay to show success message
        setTimeout(() => {
          navigate(`/${result.rolePrefix}/dashboard`, { replace: true })
        }, 500)
      } else {
        const errorMessage = result.error || 'Login failed. Please try again.'
        setError(errorMessage)
        toast.error(errorMessage)
      }
    } catch (err) {
      const errorMessage = err.message || 'An unexpected error occurred. Please try again.'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }


  return (
    <>
      <style>
        {`
          .force-light-input::placeholder {
            color: #666666 !important;
            opacity: 1 !important;
          }
          .force-light-input:-ms-input-placeholder {
            color: #666666 !important;
          }
          .force-light-input::-ms-input-placeholder {
            color: #666666 !important;
          }
          .force-light-input {
            -webkit-text-fill-color: #000000 !important;
          }
        `}
      </style>
      <div style={{
        minHeight: '100vh',
        height: '100%',
        display: 'flex',
        width: '100%',
        margin: 0,
        padding: 0,
      }}>
        {/* Left Side - Promotional Section */}
        <div
          style={{
            flex: '1',
            background: '#fff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-around',
            alignItems: 'center',
            padding: '4rem 5rem',
            position: 'relative',
            overflow: 'hidden',
            minHeight: '100vh',
          }}
        >
          {/* Diagonal Grid Pattern Background */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `
              linear-gradient(45deg, rgba(255, 255, 255, 0.05) 25%, transparent 25%),
              linear-gradient(-45deg, rgba(255, 255, 255, 0.05) 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, rgba(255, 255, 255, 0.05) 75%),
              linear-gradient(-45deg, transparent 75%, rgba(255, 255, 255, 0.05) 75%)
            `,
              backgroundSize: '40px 40px',
              backgroundPosition: '0 0, 0 20px, 20px -20px, -20px 0px',
              opacity: 0.3,
            }}
          />

          {/* Illustration div with text inside */}
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              width: '100%',
              maxWidth: '600px',
              padding: '3rem',
              background: '#3086FF',
              borderRadius: '24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <h1
              style={{
                fontSize: '3.5rem',
                fontWeight: '700',
                lineHeight: '1.2',
                marginBottom: '1.5rem',
                color: '#fff',
                letterSpacing: '-0.02em',
              }}
            >
              Build your AI-powered social growth engine
            </h1>
            <p
              style={{
                fontSize: '1.125rem',
                lineHeight: '1.7',
                color: 'rgba(255, 255, 255, 0.95)',
                marginBottom: '2rem',
              }}
            >
              Launch your personal AI agent to handle content, insights, and execution across platforms. Stop reacting. Start controlling your social media with data-driven automation.
            </p>
            {/* Illustration Image */}
            <div
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: '1rem',
              }}
            >
              {illustrationImage ? (
                <img
                  src={illustrationImage}
                  alt="AI-powered social growth illustration"
                  style={{
                    width: '100%',
                    maxWidth: '500px',
                    height: 'auto',
                    minHeight: '300px',
                    objectFit: 'contain',
                    borderRadius: '12px',
                  }}
                  onError={(e) => {
                    // Hide image if it fails to load
                    e.target.style.display = 'none'
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '300px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '0.9rem',
                  }}
                >
                  {/* Placeholder - Add illustration.png to frontend/src/assets/images/ and uncomment the import */}
                  Illustration
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div
          style={{
            flex: '1',
            background: '#fff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-around',
            alignItems: 'center',
            padding: '3rem 5rem',
            minHeight: '100vh',
            overflow: 'auto',
          }}
        >
          <div style={{ width: '100%', maxWidth: '450px' }}>
            {/* Logo */}
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <img
                src={logoImage}
                alt="DNAi Logo"
                style={{
                  height: '55px',
                  width: 'auto',
                  objectFit: 'contain',
                  marginBottom: '0.5rem',
                }}
              />
              <p style={{ color: '#666', fontSize: '0.875rem', margin: 0, fontWeight: '400' }}>Duha Nashrah</p>
            </div>

            {/* Heading */}
            <h2
              style={{
                fontSize: '2.25rem',
                fontWeight: '700',
                color: '#1a1a1a',
                marginBottom: '0.5rem',
                textAlign: 'center',
                letterSpacing: '-0.01em',
              }}
            >
              Welcome Back!
            </h2>
            <p
              style={{
                color: '#666',
                fontSize: '0.95rem',
                marginBottom: '2.5rem',
                textAlign: 'center',
                fontWeight: '400',
              }}
            >
              Sign in to your account to continue
            </p>

            {!isSupabaseConfigured && (
              <CAlert color="warning" className="mb-3" style={{ borderRadius: '8px' }}>
                <strong>Supabase not configured.</strong> Update <code>VITE_SUPABASE_URL</code> and{' '}
                <code>VITE_SUPABASE_ANON_KEY</code> in your <code>.env</code> file, then restart the
                dev server.
              </CAlert>
            )}

            {error && (
              <CAlert
                color="danger"
                dismissible
                onClose={() => setError(null)}
                className="mb-3"
                style={{ borderRadius: '8px' }}
              >
                {error}
              </CAlert>
            )}

            <CForm onSubmit={handleSubmit}>
              {/* Email Field */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    color: '#333',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                  }}
                >
                  Email Address <span style={{ color: '#e74c3c' }}>*</span>
                </label>
                <CInputGroup>
                  <CInputGroupText
                    style={{
                      background: '#f8f9fa',
                      border: '1px solid #dee2e6',
                      borderRight: 'none',
                      borderRadius: '8px 0 0 8px',
                      color: '#666',
                    }}
                  >
                    <CIcon icon={cilUser} />
                  </CInputGroupText>
                  <CFormInput
                    type="email"
                    placeholder="Enter your email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{
                      background: '#ffffff',
                      border: '1px solid #dee2e6',
                      borderLeft: 'none',
                      borderRadius: '0 8px 8px 0',
                      padding: '12px 16px',
                      fontSize: '0.95rem',
                      color: '#000000',
                      colorScheme: 'light',
                    }}
                    className="force-light-input"
                  />
                </CInputGroup>
              </div>

              {/* Password Field */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    color: '#333',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                  }}
                >
                  Password <span style={{ color: '#e74c3c' }}>*</span>
                </label>
                <CInputGroup>
                  <CInputGroupText
                    style={{
                      background: '#f8f9fa',
                      border: '1px solid #dee2e6',
                      borderRight: 'none',
                      borderRadius: '8px 0 0 8px',
                      color: '#666',
                    }}
                  >
                    <CIcon icon={cilLockLocked} />
                  </CInputGroupText>
                  <CFormInput
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{
                      background: '#ffffff',
                      border: '1px solid #dee2e6',
                      borderLeft: 'none',
                      borderRadius: '0',
                      padding: '12px 16px',
                      fontSize: '0.95rem',
                      color: '#000000',
                      colorScheme: 'light',
                    }}
                    className="force-light-input"
                  />
                  <CInputGroupText
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      background: '#f8f9fa',
                      border: '1px solid #dee2e6',
                      borderLeft: 'none',
                      borderRadius: '0 8px 8px 0',
                      color: '#666',
                      cursor: 'pointer',
                    }}
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </CInputGroupText>
                </CInputGroup>
              </div>

              {/* Sign In Button */}
              <CButton
                type="submit"
                disabled={loading}
                className="w-100 border-0 mb-4"
                style={{
                  background: '#3086FF',
                  borderRadius: '8px',
                  padding: '14px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 4px rgba(48, 134, 255, 0.2)',
                }}
              >
                {loading ? (
                  <>
                    <CSpinner size="sm" className="me-2" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </CButton>
            </CForm>
          </div>
        </div>
      </div>
    </>
  )
}

export default Login
