import React from 'react'
import { Navigate, useParams } from 'react-router-dom'
import PropTypes from 'prop-types'
import { CSpinner } from '@coreui/react'
import { useAuth } from '../contexts/AuthContext'
import { validPrefixes } from '../utils/rolePrefix'

const ProtectedRoute = ({ children, requiredRoles }) => {
  const { isAuthenticated, loading, hasRole, rolePrefix } = useAuth()
  const { rolePrefix: urlPrefix } = useParams()

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

  // Validate that the URL prefix is a valid role prefix
  if (urlPrefix && !validPrefixes.includes(urlPrefix)) {
    return <Navigate to="/404" replace />
  }

  // Validate that the URL prefix matches the user's actual role prefix
  // e.g., a 'support' user cannot access '/admin/dashboard'
  if (urlPrefix && rolePrefix && urlPrefix !== rolePrefix) {
    return <Navigate to={`/${rolePrefix}/dashboard`} replace />
  }

  if (requiredRoles && !hasRole(requiredRoles)) {
    return <Navigate to="/404" replace />
  }

  return children
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  requiredRoles: PropTypes.arrayOf(PropTypes.string),
}

export default ProtectedRoute
