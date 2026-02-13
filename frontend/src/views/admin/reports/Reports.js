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
  CFormInput,
  CFormSelect,
  CButton,
  CSpinner,
  CBadge,
  CNav,
  CNavItem,
  CNavLink,
  CAlert,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilChart,
  cilCloudDownload,
  cilReload,
  cilDollar,
  cilPhone,
  cilUser,
  cilSettings,
} from '@coreui/icons'
import { reportsAPI, subscriptionsAPI } from '../../../utils/api'
import toast from 'react-hot-toast'

const Reports = () => {
  const [activeTab, setActiveTab] = useState('revenue')
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState('')

  // Revenue Report
  const [revenueData, setRevenueData] = useState(null)
  const [revenueFilters, setRevenueFilters] = useState({
    period: 'monthly',
    package_id: '',
    date_from: '',
    date_to: '',
  })

  // Usage Report
  const [usageData, setUsageData] = useState(null)
  const [usageFilters, setUsageFilters] = useState({
    group_by: 'user',
    user_id: '',
    package_id: '',
    date_from: '',
    date_to: '',
  })

  // Agent Performance Report
  const [agentPerfData, setAgentPerfData] = useState(null)
  const [agentPerfFilters, setAgentPerfFilters] = useState({
    agent_id: '',
    date_from: '',
    date_to: '',
  })

  // Provider Performance Report
  const [providerPerfData, setProviderPerfData] = useState(null)
  const [providerPerfFilters, setProviderPerfFilters] = useState({
    provider: '',
    date_from: '',
    date_to: '',
  })

  const [packages, setPackages] = useState([])

  useEffect(() => {
    loadPackages()
  }, [])

  const loadPackages = async () => {
    try {
      const data = await subscriptionsAPI.getPackages()
      setPackages(data.packages || [])
    } catch (err) {
      console.error('Failed to load packages:', err)
    }
  }

  const loadRevenueReport = async () => {
    setLoading(true)
    try {
      const data = await reportsAPI.getRevenueReport(revenueFilters)
      setRevenueData(data)
    } catch (err) {
      toast.error('Failed to load revenue report')
    } finally {
      setLoading(false)
    }
  }

  const loadUsageReport = async () => {
    setLoading(true)
    try {
      const data = await reportsAPI.getUsageReport(usageFilters)
      setUsageData(data)
    } catch (err) {
      toast.error('Failed to load usage report')
    } finally {
      setLoading(false)
    }
  }

  const loadAgentPerformanceReport = async () => {
    setLoading(true)
    try {
      const data = await reportsAPI.getAgentPerformanceReport(agentPerfFilters)
      setAgentPerfData(data)
    } catch (err) {
      toast.error('Failed to load agent performance report')
    } finally {
      setLoading(false)
    }
  }

  const loadProviderPerformanceReport = async () => {
    setLoading(true)
    try {
      const data = await reportsAPI.getProviderPerformanceReport(providerPerfFilters)
      setProviderPerfData(data)
    } catch (err) {
      toast.error('Failed to load provider performance report')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (type, params = {}) => {
    setExporting(type)
    try {
      if (type === 'users') {
        await reportsAPI.exportUsers(params)
        toast.success('Users exported successfully')
      } else if (type === 'subscriptions') {
        await reportsAPI.exportSubscriptions(params)
        toast.success('Subscriptions exported successfully')
      } else if (type === 'invoices') {
        await reportsAPI.exportInvoices(params)
        toast.success('Invoices exported successfully')
      } else if (type === 'call-logs') {
        await reportsAPI.exportCallLogs(params)
        toast.success('Call logs exported successfully')
      }
    } catch (err) {
      toast.error('Export failed')
    } finally {
      setExporting('')
    }
  }

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Reports & Exports</strong>
          </CCardHeader>
          <CCardBody>
            <CNav variant="tabs" role="tablist">
              <CNavItem>
                <CNavLink
                  active={activeTab === 'revenue'}
                  onClick={() => setActiveTab('revenue')}
                  style={{ cursor: 'pointer' }}
                >
                  <CIcon icon={cilDollar} className="me-2" />
                  Revenue Reports
                </CNavLink>
              </CNavItem>
              <CNavItem>
                <CNavLink
                  active={activeTab === 'usage'}
                  onClick={() => setActiveTab('usage')}
                  style={{ cursor: 'pointer' }}
                >
                  <CIcon icon={cilPhone} className="me-2" />
                  Usage Reports
                </CNavLink>
              </CNavItem>
              <CNavItem>
                <CNavLink
                  active={activeTab === 'agent-performance'}
                  onClick={() => setActiveTab('agent-performance')}
                  style={{ cursor: 'pointer' }}
                >
                  <CIcon icon={cilUser} className="me-2" />
                  Agent Performance
                </CNavLink>
              </CNavItem>
              <CNavItem>
                <CNavLink
                  active={activeTab === 'provider-performance'}
                  onClick={() => setActiveTab('provider-performance')}
                  style={{ cursor: 'pointer' }}
                >
                  <CIcon icon={cilSettings} className="me-2" />
                  Provider Performance
                </CNavLink>
              </CNavItem>
              <CNavItem>
                <CNavLink
                  active={activeTab === 'exports'}
                  onClick={() => setActiveTab('exports')}
                  style={{ cursor: 'pointer' }}
                >
                  <CIcon icon={cilCloudDownload} className="me-2" />
                  Exports
                </CNavLink>
              </CNavItem>
            </CNav>

            {/* Revenue Reports */}
            {activeTab === 'revenue' && (
              <div className="mt-4">
                <CRow className="mb-3">
                  <CCol md={3}>
                    <CFormSelect
                      value={revenueFilters.period}
                      onChange={(e) => setRevenueFilters({ ...revenueFilters, period: e.target.value })}
                    >
                      <option value="daily">Daily</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </CFormSelect>
                  </CCol>
                  <CCol md={3}>
                    <CFormSelect
                      value={revenueFilters.package_id}
                      onChange={(e) => setRevenueFilters({ ...revenueFilters, package_id: e.target.value })}
                    >
                      <option value="">All Packages</option>
                      {packages.map((pkg) => (
                        <option key={pkg.id} value={pkg.package_code}>
                          {pkg.package_name}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  <CCol md={2}>
                    <CFormInput
                      type="date"
                      value={revenueFilters.date_from}
                      onChange={(e) => setRevenueFilters({ ...revenueFilters, date_from: e.target.value })}
                      placeholder="From Date"
                    />
                  </CCol>
                  <CCol md={2}>
                    <CFormInput
                      type="date"
                      value={revenueFilters.date_to}
                      onChange={(e) => setRevenueFilters({ ...revenueFilters, date_to: e.target.value })}
                      placeholder="To Date"
                    />
                  </CCol>
                  <CCol md={2}>
                    <CButton color="primary" onClick={loadRevenueReport} disabled={loading}>
                      {loading ? <CSpinner size="sm" /> : <CIcon icon={cilReload} />} Load Report
                    </CButton>
                  </CCol>
                </CRow>

                {revenueData && (
                  <>
                    <CAlert color="info" className="mb-3">
                      <strong>Summary:</strong> Total Revenue: {formatCurrency(revenueData.summary.total_revenue, revenueData.summary.currency)} | Total Invoices: {revenueData.summary.total_invoices}
                    </CAlert>

                    <h5>Revenue by Period</h5>
                    <CTable striped hover className="mb-4">
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>Period</CTableHeaderCell>
                          <CTableHeaderCell>Total Revenue</CTableHeaderCell>
                          <CTableHeaderCell>Invoice Count</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {revenueData.revenue_by_period.map((item, idx) => (
                          <CTableRow key={idx}>
                            <CTableDataCell>{item.period}</CTableDataCell>
                            <CTableDataCell>{formatCurrency(item.total_revenue, item.currency)}</CTableDataCell>
                            <CTableDataCell>{item.invoice_count}</CTableDataCell>
                          </CTableRow>
                        ))}
                      </CTableBody>
                    </CTable>

                    <h5>Revenue by Package</h5>
                    <CTable striped hover>
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>Package</CTableHeaderCell>
                          <CTableHeaderCell>Total Revenue</CTableHeaderCell>
                          <CTableHeaderCell>Invoice Count</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {revenueData.revenue_by_package.map((item, idx) => (
                          <CTableRow key={idx}>
                            <CTableDataCell>{item.package_name}</CTableDataCell>
                            <CTableDataCell>{formatCurrency(item.total_revenue, item.currency)}</CTableDataCell>
                            <CTableDataCell>{item.invoice_count}</CTableDataCell>
                          </CTableRow>
                        ))}
                      </CTableBody>
                    </CTable>
                  </>
                )}
              </div>
            )}

            {/* Usage Reports */}
            {activeTab === 'usage' && (
              <div className="mt-4">
                <CRow className="mb-3">
                  <CCol md={3}>
                    <CFormSelect
                      value={usageFilters.group_by}
                      onChange={(e) => setUsageFilters({ ...usageFilters, group_by: e.target.value })}
                    >
                      <option value="user">By User</option>
                      <option value="package">By Package</option>
                    </CFormSelect>
                  </CCol>
                  <CCol md={2}>
                    <CFormInput
                      type="date"
                      value={usageFilters.date_from}
                      onChange={(e) => setUsageFilters({ ...usageFilters, date_from: e.target.value })}
                      placeholder="From Date"
                    />
                  </CCol>
                  <CCol md={2}>
                    <CFormInput
                      type="date"
                      value={usageFilters.date_to}
                      onChange={(e) => setUsageFilters({ ...usageFilters, date_to: e.target.value })}
                      placeholder="To Date"
                    />
                  </CCol>
                  <CCol md={2}>
                    <CButton color="primary" onClick={loadUsageReport} disabled={loading}>
                      {loading ? <CSpinner size="sm" /> : <CIcon icon={cilReload} />} Load Report
                    </CButton>
                  </CCol>
                </CRow>

                {usageData && (
                  <>
                    <CAlert color="info" className="mb-3">
                      <strong>Summary:</strong> Total Calls: {usageData.summary.total_calls} | Total Minutes: {usageData.summary.total_minutes.toFixed(2)} | Unique Users: {usageData.summary.unique_users}
                    </CAlert>

                    {usageFilters.group_by === 'user' ? (
                      <CTable striped hover>
                        <CTableHead>
                          <CTableRow>
                            <CTableHeaderCell>User Email</CTableHeaderCell>
                            <CTableHeaderCell>Total Calls</CTableHeaderCell>
                            <CTableHeaderCell>Answered Calls</CTableHeaderCell>
                            <CTableHeaderCell>Total Minutes</CTableHeaderCell>
                            <CTableHeaderCell>Answered Minutes</CTableHeaderCell>
                          </CTableRow>
                        </CTableHead>
                        <CTableBody>
                          {usageData.usage_by_user.map((item, idx) => (
                            <CTableRow key={idx}>
                              <CTableDataCell>{item.email || 'N/A'}</CTableDataCell>
                              <CTableDataCell>{item.total_calls}</CTableDataCell>
                              <CTableDataCell>{item.answered_calls}</CTableDataCell>
                              <CTableDataCell>{item.total_minutes.toFixed(2)}</CTableDataCell>
                              <CTableDataCell>{item.answered_minutes.toFixed(2)}</CTableDataCell>
                            </CTableRow>
                          ))}
                        </CTableBody>
                      </CTable>
                    ) : (
                      <CTable striped hover>
                        <CTableHead>
                          <CTableRow>
                            <CTableHeaderCell>Package</CTableHeaderCell>
                            <CTableHeaderCell>Total Calls</CTableHeaderCell>
                            <CTableHeaderCell>Answered Calls</CTableHeaderCell>
                            <CTableHeaderCell>Total Minutes</CTableHeaderCell>
                            <CTableHeaderCell>Unique Users</CTableHeaderCell>
                          </CTableRow>
                        </CTableHead>
                        <CTableBody>
                          {usageData.usage_by_package.map((item, idx) => (
                            <CTableRow key={idx}>
                              <CTableDataCell>{item.package_name}</CTableDataCell>
                              <CTableDataCell>{item.total_calls}</CTableDataCell>
                              <CTableDataCell>{item.answered_calls}</CTableDataCell>
                              <CTableDataCell>{item.total_minutes.toFixed(2)}</CTableDataCell>
                              <CTableDataCell>{item.unique_users}</CTableDataCell>
                            </CTableRow>
                          ))}
                        </CTableBody>
                      </CTable>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Agent Performance Reports */}
            {activeTab === 'agent-performance' && (
              <div className="mt-4">
                <CRow className="mb-3">
                  <CCol md={3}>
                    <CFormInput
                      type="date"
                      value={agentPerfFilters.date_from}
                      onChange={(e) => setAgentPerfFilters({ ...agentPerfFilters, date_from: e.target.value })}
                      placeholder="From Date"
                    />
                  </CCol>
                  <CCol md={3}>
                    <CFormInput
                      type="date"
                      value={agentPerfFilters.date_to}
                      onChange={(e) => setAgentPerfFilters({ ...agentPerfFilters, date_to: e.target.value })}
                      placeholder="To Date"
                    />
                  </CCol>
                  <CCol md={2}>
                    <CButton color="primary" onClick={loadAgentPerformanceReport} disabled={loading}>
                      {loading ? <CSpinner size="sm" /> : <CIcon icon={cilReload} />} Load Report
                    </CButton>
                  </CCol>
                </CRow>

                {agentPerfData && (
                  <>
                    <CAlert color="info" className="mb-3">
                      <strong>Summary:</strong> Total Agents: {agentPerfData.summary.total_agents} | Total Calls: {agentPerfData.summary.total_calls} | Avg Answer Rate: {agentPerfData.summary.avg_answer_rate.toFixed(2)}%
                    </CAlert>

                    <CTable striped hover>
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>Agent Name</CTableHeaderCell>
                          <CTableHeaderCell>Total Calls</CTableHeaderCell>
                          <CTableHeaderCell>Answered Calls</CTableHeaderCell>
                          <CTableHeaderCell>Answer Rate (%)</CTableHeaderCell>
                          <CTableHeaderCell>Avg Duration (min)</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {agentPerfData.agent_performance.map((item, idx) => (
                          <CTableRow key={idx}>
                            <CTableDataCell>{item.agent_name}</CTableDataCell>
                            <CTableDataCell>{item.total_calls}</CTableDataCell>
                            <CTableDataCell>{item.answered_calls}</CTableDataCell>
                            <CTableDataCell>
                              <CBadge color={item.answer_rate >= 80 ? 'success' : item.answer_rate >= 50 ? 'warning' : 'danger'}>
                                {item.answer_rate}%
                              </CBadge>
                            </CTableDataCell>
                            <CTableDataCell>{item.avg_duration_minutes}</CTableDataCell>
                          </CTableRow>
                        ))}
                      </CTableBody>
                    </CTable>
                  </>
                )}
              </div>
            )}

            {/* Provider Performance Reports */}
            {activeTab === 'provider-performance' && (
              <div className="mt-4">
                <CRow className="mb-3">
                  <CCol md={3}>
                    <CFormInput
                      type="text"
                      value={providerPerfFilters.provider}
                      onChange={(e) => setProviderPerfFilters({ ...providerPerfFilters, provider: e.target.value })}
                      placeholder="Provider (optional)"
                    />
                  </CCol>
                  <CCol md={3}>
                    <CFormInput
                      type="date"
                      value={providerPerfFilters.date_from}
                      onChange={(e) => setProviderPerfFilters({ ...providerPerfFilters, date_from: e.target.value })}
                      placeholder="From Date"
                    />
                  </CCol>
                  <CCol md={3}>
                    <CFormInput
                      type="date"
                      value={providerPerfFilters.date_to}
                      onChange={(e) => setProviderPerfFilters({ ...providerPerfFilters, date_to: e.target.value })}
                      placeholder="To Date"
                    />
                  </CCol>
                  <CCol md={3}>
                    <CButton color="primary" onClick={loadProviderPerformanceReport} disabled={loading}>
                      {loading ? <CSpinner size="sm" /> : <CIcon icon={cilReload} />} Load Report
                    </CButton>
                  </CCol>
                </CRow>

                {providerPerfData && (
                  <>
                    <CAlert color="info" className="mb-3">
                      <strong>Summary:</strong> Total Providers: {providerPerfData.summary.total_providers} | Total Calls: {providerPerfData.summary.total_calls} | Avg Failure Rate: {providerPerfData.summary.avg_failure_rate.toFixed(2)}%
                    </CAlert>

                    <CTable striped hover>
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>Provider</CTableHeaderCell>
                          <CTableHeaderCell>Total Calls</CTableHeaderCell>
                          <CTableHeaderCell>Failed Calls</CTableHeaderCell>
                          <CTableHeaderCell>Success Rate (%)</CTableHeaderCell>
                          <CTableHeaderCell>Failure Rate (%)</CTableHeaderCell>
                          <CTableHeaderCell>Avg Latency (ms)</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {providerPerfData.provider_performance.map((item, idx) => (
                          <CTableRow key={idx}>
                            <CTableDataCell>{item.provider}</CTableDataCell>
                            <CTableDataCell>{item.total_calls}</CTableDataCell>
                            <CTableDataCell>{item.failed_calls}</CTableDataCell>
                            <CTableDataCell>
                              <CBadge color={item.success_rate >= 95 ? 'success' : item.success_rate >= 80 ? 'warning' : 'danger'}>
                                {item.success_rate}%
                              </CBadge>
                            </CTableDataCell>
                            <CTableDataCell>
                              <CBadge color={item.failure_rate <= 5 ? 'success' : item.failure_rate <= 20 ? 'warning' : 'danger'}>
                                {item.failure_rate}%
                              </CBadge>
                            </CTableDataCell>
                            <CTableDataCell>{item.avg_latency_ms.toFixed(2)}</CTableDataCell>
                          </CTableRow>
                        ))}
                      </CTableBody>
                    </CTable>
                  </>
                )}
              </div>
            )}

            {/* Exports */}
            {activeTab === 'exports' && (
              <div className="mt-4">
                <h5>Export Data</h5>
                <p className="text-muted">Export data to CSV format for analysis</p>

                <CRow className="g-3">
                  <CCol md={6}>
                    <CCard>
                      <CCardBody>
                        <h6>Export Users</h6>
                        <p className="text-muted small">Export all users with their profile information</p>
                        <CButton
                          color="primary"
                          onClick={() => handleExport('users')}
                          disabled={exporting === 'users'}
                        >
                          {exporting === 'users' ? (
                            <>
                              <CSpinner size="sm" className="me-2" />
                              Exporting...
                            </>
                          ) : (
                            <>
                              <CIcon icon={cilCloudDownload} className="me-2" />
                              Export Users
                            </>
                          )}
                        </CButton>
                      </CCardBody>
                    </CCard>
                  </CCol>

                  <CCol md={6}>
                    <CCard>
                      <CCardBody>
                        <h6>Export Subscriptions</h6>
                        <p className="text-muted small">Export all subscriptions with package details</p>
                        <CButton
                          color="primary"
                          onClick={() => handleExport('subscriptions')}
                          disabled={exporting === 'subscriptions'}
                        >
                          {exporting === 'subscriptions' ? (
                            <>
                              <CSpinner size="sm" className="me-2" />
                              Exporting...
                            </>
                          ) : (
                            <>
                              <CIcon icon={cilCloudDownload} className="me-2" />
                              Export Subscriptions
                            </>
                          )}
                        </CButton>
                      </CCardBody>
                    </CCard>
                  </CCol>

                  <CCol md={6}>
                    <CCard>
                      <CCardBody>
                        <h6>Export Invoices</h6>
                        <p className="text-muted small">Export all invoices with payment details</p>
                        <CButton
                          color="primary"
                          onClick={() => handleExport('invoices')}
                          disabled={exporting === 'invoices'}
                        >
                          {exporting === 'invoices' ? (
                            <>
                              <CSpinner size="sm" className="me-2" />
                              Exporting...
                            </>
                          ) : (
                            <>
                              <CIcon icon={cilCloudDownload} className="me-2" />
                              Export Invoices
                            </>
                          )}
                        </CButton>
                      </CCardBody>
                    </CCard>
                  </CCol>

                  <CCol md={6}>
                    <CCard>
                      <CCardBody>
                        <h6>Export Call Logs</h6>
                        <p className="text-muted small">Export all call logs with agent and user details</p>
                        <CButton
                          color="primary"
                          onClick={() => handleExport('call-logs')}
                          disabled={exporting === 'call-logs'}
                        >
                          {exporting === 'call-logs' ? (
                            <>
                              <CSpinner size="sm" className="me-2" />
                              Exporting...
                            </>
                          ) : (
                            <>
                              <CIcon icon={cilCloudDownload} className="me-2" />
                              Export Call Logs
                            </>
                          )}
                        </CButton>
                      </CCardBody>
                    </CCard>
                  </CCol>
                </CRow>
              </div>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default Reports
