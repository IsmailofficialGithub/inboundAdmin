import React, { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CRow,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilUser } from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { login, isSupabaseConfigured, loading: authLoading, isAuthenticated, rolePrefix } = useAuth()
  const navigate = useNavigate()

  // If already authenticated, redirect to dashboard
  if (!authLoading && isAuthenticated && rolePrefix) {
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
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center"
      style={{
        background: 'linear-gradient(135deg, #1a1c2e 0%, #16213e 50%, #0f3460 100%)',
      }}
    >
      {/* Decorative background elements */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          left: '10%',
          width: '300px',
          height: '300px',
          background: 'rgba(99, 102, 241, 0.08)',
          borderRadius: '50%',
          filter: 'blur(80px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '10%',
          right: '10%',
          width: '400px',
          height: '400px',
          background: 'rgba(59, 130, 246, 0.06)',
          borderRadius: '50%',
          filter: 'blur(100px)',
        }}
      />

      <CContainer>
        <CRow className="justify-content-center">
          <CCol xs={11} sm={9} md={7} lg={5} xl={4}>
            <CCard
              className="border-0"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(20px)',
                borderRadius: '20px',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.08)',
              }}
            >
              <CCardBody className="p-4 p-md-5">
                {/* Logo / Brand */}
                <div className="text-center mb-4">
                  <h2
                    className="mb-1"
                    style={{
                      color: '#fff',
                      fontWeight: '700',
                      fontSize: '1.6rem',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    Welcome Back
                  </h2>
                  <p style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: '0.9rem' }}>
                    Sign in to the admin dashboard
                  </p>
                </div>

                {!isSupabaseConfigured && (
                  <CAlert color="warning" className="border-0" style={{ borderRadius: '12px', fontSize: '0.85rem' }}>
                    <strong>Supabase not configured.</strong> Update{' '}
                    <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in
                    your <code>.env</code> file, then restart the dev server.
                  </CAlert>
                )}

                {error && (
                  <CAlert
                    color="danger"
                    dismissible
                    onClose={() => setError(null)}
                    className="border-0"
                    style={{ borderRadius: '12px', fontSize: '0.85rem' }}
                  >
                    {error}
                  </CAlert>
                )}

                <CForm onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label
                      className="d-block mb-2"
                      style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    >
                      Email Address
                    </label>
                    <CInputGroup>
                      <CInputGroupText
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRight: 'none',
                          borderRadius: '12px 0 0 12px',
                          color: 'rgba(255, 255, 255, 0.4)',
                        }}
                      >
                        <CIcon icon={cilUser} />
                      </CInputGroupText>
                      <CFormInput
                        type="email"
                        placeholder="admin@example.com"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderLeft: 'none',
                          borderRadius: '0 12px 12px 0',
                          color: '#fff',
                          padding: '12px 16px',
                          fontSize: '0.95rem',
                        }}
                      />
                    </CInputGroup>
                  </div>

                  <div className="mb-4">
                    <label
                      className="d-block mb-2"
                      style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    >
                      Password
                    </label>
                    <CInputGroup>
                      <CInputGroupText
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRight: 'none',
                          borderRadius: '12px 0 0 12px',
                          color: 'rgba(255, 255, 255, 0.4)',
                        }}
                      >
                        <CIcon icon={cilLockLocked} />
                      </CInputGroupText>
                      <CFormInput
                        type="password"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderLeft: 'none',
                          borderRadius: '0 12px 12px 0',
                          color: '#fff',
                          padding: '12px 16px',
                          fontSize: '0.95rem',
                        }}
                      />
                    </CInputGroup>
                  </div>

                  <CButton
                    type="submit"
                    disabled={loading}
                    className="w-100 border-0 mb-3"
                    style={{
                      background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
                      borderRadius: '12px',
                      padding: '12px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      letterSpacing: '0.02em',
                      boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {loading ? (
                      <CSpinner size="sm" className="me-2" />
                    ) : null}
                    {loading ? 'Signing in...' : 'Sign In'}
                  </CButton>

                  <div className="text-center">
                    <CButton
                      color="link"
                      className="px-0 text-decoration-none"
                      style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.85rem' }}
                    >
                      Forgot your password?
                    </CButton>
                  </div>
                </CForm>
              </CCardBody>
            </CCard>

            {/* Footer text */}
            <p
              className="text-center mt-4"
              style={{ color: 'rgba(255, 255, 255, 0.2)', fontSize: '0.8rem' }}
            >
              Inbound Admin Panel &copy; {new Date().getFullYear()}
            </p>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Login
