import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CAvatar,
  CBadge,
  CDropdown,
  CDropdownDivider,
  CDropdownHeader,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
} from '@coreui/react'
import {
  cilAccountLogout,
  cilHistory,
  cilSettings,
  cilShieldAlt,
  cilUser,
} from '@coreui/icons'
import CIcon from '@coreui/icons-react'
import { useAuth } from '../../contexts/AuthContext'

import avatar8 from './../../assets/images/avatars/8.jpg'

const AppHeaderDropdown = () => {
  const { adminProfile, logout, rolePrefix } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const prefix = rolePrefix || 'admin'

  const displayName = adminProfile?.first_name
    ? `${adminProfile.first_name} ${adminProfile.last_name || ''}`
    : adminProfile?.email || 'Admin'

  const roleBadgeColor = {
    super_admin: 'danger',
    finance: 'warning',
    support: 'info',
    ops: 'success',
  }

  // Get avatar URL or generate initials
  const getAvatarContent = () => {
    // If avatar_url exists, use it
    if (adminProfile?.avatar_url) {
      return { src: adminProfile.avatar_url }
    }
    
    // Otherwise, generate initials from name or email
    let initials = ''
    if (adminProfile?.first_name) {
      initials = adminProfile.first_name.charAt(0).toUpperCase()
      if (adminProfile?.last_name) {
        initials += adminProfile.last_name.charAt(0).toUpperCase()
      }
    } else if (adminProfile?.email) {
      initials = adminProfile.email.charAt(0).toUpperCase()
    } else {
      initials = 'A' // Default to 'A' for Admin
    }
    
    return { text: initials }
  }

  const avatarContent = getAvatarContent()

  return (
    <CDropdown variant="nav-item">
      <CDropdownToggle placement="bottom-end" className="py-0 pe-0" caret={false}>
        <CAvatar 
          {...avatarContent}
          size="md"
          color={adminProfile?.avatar_url ? undefined : 'primary'}
        />
      </CDropdownToggle>
      <CDropdownMenu className="pt-0" placement="bottom-end">
        <CDropdownHeader className="bg-body-secondary fw-semibold mb-2">
          <div>{displayName}</div>
          {adminProfile?.role && (
            <CBadge
              color={roleBadgeColor[adminProfile.role] || 'secondary'}
              className="text-uppercase mt-1"
              size="sm"
            >
              {adminProfile.role.replace('_', ' ')}
            </CBadge>
          )}
        </CDropdownHeader>
        <CDropdownItem href={`/${prefix}/profile`}>
          <CIcon icon={cilSettings} className="me-2" />
          Profile
        </CDropdownItem>
        <CDropdownItem href={`/${prefix}/dashboard`}>
          <CIcon icon={cilUser} className="me-2" />
          Dashboard
        </CDropdownItem>
        <CDropdownItem href={`/${prefix}/activity-log`}>
          <CIcon icon={cilHistory} className="me-2" />
          Activity Log
        </CDropdownItem>
        <CDropdownItem href={`/${prefix}/security-events`}>
          <CIcon icon={cilShieldAlt} className="me-2" />
          Security Events
        </CDropdownItem>
        <CDropdownDivider />
        <CDropdownItem onClick={handleLogout} style={{ cursor: 'pointer' }}>
          <CIcon icon={cilAccountLogout} className="me-2" />
          Logout
        </CDropdownItem>
      </CDropdownMenu>
    </CDropdown>
  )
}

export default AppHeaderDropdown
