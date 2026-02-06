import React from 'react'
import { Navigate } from 'react-router-dom'
import { CSpinner } from '@coreui/react'
import { useAuth } from '../contexts/AuthContext'

const RootRedirect = () => {
  const { isAuthenticated, loading, rolePrefix } = useAuth()

  if (loading) {
    return (
      <div className="pt-3 text-center">
        <CSpinner color="primary" variant="grow" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Redirect to the role-prefixed dashboard
  return <Navigate to={`/${rolePrefix}/dashboard`} replace />
}

export default RootRedirect
