import React, { Suspense } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { CContainer, CSpinner } from '@coreui/react'
import ProtectedRoute from './ProtectedRoute'

// routes config
import routes from '../routes'

const AppContent = () => {
  const { rolePrefix } = useParams()

  return (
    <CContainer className="px-4" lg>
      <Suspense fallback={<CSpinner color="primary" />}>
        <Routes>
          {routes.map((route, idx) => {
            return (
              route.element && (
                <Route
                  key={idx}
                  path={route.path}
                  exact={route.exact}
                  name={route.name}
                  element={
                    route.requiredRoles ? (
                      <ProtectedRoute requiredRoles={route.requiredRoles}>
                        <route.element />
                      </ProtectedRoute>
                    ) : (
                      <route.element />
                    )
                  }
                />
              )
            )
          })}
          <Route path="/" element={<Navigate to={`/${rolePrefix}/dashboard`} replace />} />
        </Routes>
      </Suspense>
    </CContainer>
  )
}

export default React.memo(AppContent)
