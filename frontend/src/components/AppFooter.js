import React from 'react'
import { CFooter } from '@coreui/react'

const AppFooter = () => {
  return (
    <CFooter className="px-4">
      <div>
        <span>&copy; 2025 DNAI.</span>
      </div>
    </CFooter>
  )
}

export default React.memo(AppFooter)
