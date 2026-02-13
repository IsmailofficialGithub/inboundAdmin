import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CWidgetStatsA,
  CSpinner,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPeople, cilShieldAlt, cilHistory, cilUser } from '@coreui/icons'
import { supabase } from '../../../supabase/supabaseClient'
import { useAuth } from '../../../contexts/AuthContext'
import { usersAPI } from '../../../utils/api'

const AdminDashboard = () => {
  const { adminProfile } = useAuth()
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    recentSecurityEvents: 0,
  })
  const [recentActivity, setRecentActivity] = useState([])
  const [recentUsers, setRecentUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch user stats
        const { count: totalUsers } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })

        const { count: activeUsers } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('account_status', 'active')

        const { count: suspendedUsers } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('account_status', 'suspended')

        // Fetch recent security events count (last 24h)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const { count: recentSecurityEvents } = await supabase
          .from('security_events')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', oneDayAgo)

        setStats({
          totalUsers: totalUsers || 0,
          activeUsers: activeUsers || 0,
          suspendedUsers: suspendedUsers || 0,
          recentSecurityEvents: recentSecurityEvents || 0,
        })

        // Fetch recent admin activity
        const { data: activityData } = await supabase
          .from('admin_activity_log')
          .select('*, admin_profiles(email, first_name, last_name)')
          .order('created_at', { ascending: false })
          .limit(10)

        setRecentActivity(activityData || [])

        // Fetch recently registered users with email from backend API
        try {
          const usersResponse = await usersAPI.list({ 
            page: 0, 
            limit: 5
          })
          // Sort by created_at descending (most recent first)
          const sortedUsers = (usersResponse.users || []).sort((a, b) => {
            const dateA = new Date(a.created_at || 0)
            const dateB = new Date(b.created_at || 0)
            return dateB - dateA
          })
          setRecentUsers(sortedUsers.slice(0, 5))
        } catch (err) {
          console.error('Error fetching recent users:', err)
          // Fallback to user_profiles without email
          const { data: usersData } = await supabase
            .from('user_profiles')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5)
          setRecentUsers(usersData || [])
        }
      } catch (err) {
        console.error('Dashboard data error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
      </div>
    )
  }

  return (
    <>
      <h4 className="mb-4">
        Welcome back, {adminProfile?.first_name || adminProfile?.email || 'Admin'}
        <CBadge color="primary" className="ms-2 text-uppercase" size="sm">
          {adminProfile?.role?.replace('_', ' ')}
        </CBadge>
      </h4>

      {/* Stats Widgets */}
      <CRow className="mb-4 stats-widgets-row">
        <CCol sm={6} lg={3}>
          <CWidgetStatsA
            className="mb-4"
            color="primary"
            value={String(stats.totalUsers)}
            title="Total Users"
            icon={<CIcon icon={cilPeople} height={36} />}
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsA
            className="mb-4"
            color="success"
            value={String(stats.activeUsers)}
            title="Active Users"
            icon={<CIcon icon={cilUser} height={36} />}
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsA
            className="mb-4"
            color="warning"
            value={String(stats.suspendedUsers)}
            title="Suspended Users"
            icon={<CIcon icon={cilUser} height={36} />}
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsA
            className="mb-4"
            color="danger"
            value={String(stats.recentSecurityEvents)}
            title="Security Events (24h)"
            icon={<CIcon icon={cilShieldAlt} height={36} />}
          />
        </CCol>
      </CRow>

      <CRow>
        {/* Recent Users */}
        <CCol md={6}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Recently Registered Users</strong>
            </CCardHeader>
            <CCardBody>
              <CTable hover responsive small>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Email</CTableHeaderCell>
                    <CTableHeaderCell>Name</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    <CTableHeaderCell>Joined</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {recentUsers.length === 0 ? (
                    <CTableRow>
                      <CTableDataCell colSpan={4} className="text-center text-body-secondary">
                        No users found
                      </CTableDataCell>
                    </CTableRow>
                  ) : (
                    recentUsers.map((user) => (
                      <CTableRow key={user.id}>
                        <CTableDataCell>
                          <span className="text-body-secondary small">
                            {user.email || user.user_id || '-'}
                          </span>
                        </CTableDataCell>
                        <CTableDataCell>
                          {user.first_name || user.last_name 
                            ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                            : '-'}
                        </CTableDataCell>
                        <CTableDataCell>
                          <CBadge
                            color={
                              user.account_status === 'active'
                                ? 'success'
                                : user.account_status === 'suspended'
                                  ? 'warning'
                                  : 'secondary'
                            }
                          >
                            {user.account_status || 'unknown'}
                          </CBadge>
                        </CTableDataCell>
                        <CTableDataCell>
                          {user.created_at 
                            ? new Date(user.created_at).toLocaleDateString()
                            : '-'}
                        </CTableDataCell>
                      </CTableRow>
                    ))
                  )}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>

        {/* Recent Admin Activity */}
        <CCol md={6}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Recent Admin Activity</strong>
            </CCardHeader>
            <CCardBody>
              <CTable hover responsive small>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Admin</CTableHeaderCell>
                    <CTableHeaderCell>Action</CTableHeaderCell>
                    <CTableHeaderCell>Time</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {recentActivity.length === 0 ? (
                    <CTableRow>
                      <CTableDataCell colSpan={3} className="text-center text-body-secondary">
                        No activity yet
                      </CTableDataCell>
                    </CTableRow>
                  ) : (
                    recentActivity.map((activity) => (
                      <CTableRow key={activity.id}>
                        <CTableDataCell>
                          {activity.admin_profiles?.first_name ||
                            activity.admin_profiles?.email ||
                            'Unknown'}
                        </CTableDataCell>
                        <CTableDataCell>
                          <CBadge color="info">{activity.action}</CBadge>
                        </CTableDataCell>
                        <CTableDataCell>
                          {new Date(activity.created_at).toLocaleString()}
                        </CTableDataCell>
                      </CTableRow>
                    ))
                  )}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default AdminDashboard
