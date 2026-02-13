import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilBell,
  cilCalculator,
  cilChartPie,
  cilCursor,
  cilDescription,
  cilDrop,
  cilExternalLink,
  cilNotes,
  cilPencil,
  cilPeople,
  cilPuzzle,
  cilShieldAlt,
  cilSpeedometer,
  cilStar,
  cilUser,
  cilHistory,
  cilSettings,
  cilMicrophone,
  cilPhone,
  cilDollar,
  cilCreditCard,
  cilTask,
  cilToggleOn,
  cilWarning,
  cilCheckCircle,
  cilChart,
  cilCloudDownload,
  cilLockLocked,
  cilClock,
  cilCalendar,
  cilCog,
  cilEnvelopeOpen,
} from '@coreui/icons'
import { CNavGroup, CNavItem, CNavTitle } from '@coreui/react'

// ============================================================
// ADMIN NAVIGATION — accepts rolePrefix to build correct URLs
// ============================================================
const getNavItems = (rolePrefix = 'admin') => {
  const prefix = `/${rolePrefix}`

  return [
    {
      component: CNavItem,
      name: 'Dashboard',
      to: `${prefix}/dashboard`,
      icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
    },
    {
      component: CNavTitle,
      name: 'Management',
    },
    {
      component: CNavGroup,
      name: 'Users',
      icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
      items: [
        {
          component: CNavItem,
          name: 'All Users',
          to: `${prefix}/users/list`,
        },
        {
          component: CNavItem,
          name: 'Consumer',
          to: `${prefix}/users/list?tab=consumer`,
        },
        {
          component: CNavItem,
          name: 'Admin',
          to: `${prefix}/users/list?tab=admin`,
        },
        {
          component: CNavItem,
          name: 'Account Deactivations',
          to: `${prefix}/users/deactivations`,
        },
        {
          component: CNavItem,
          name: 'User Emails',
          to: `${prefix}/users/emails`,
        },
      ],
    },
    {
      component: CNavItem,
      name: 'Activity Log',
      to: `${prefix}/activity-log`,
      icon: <CIcon icon={cilHistory} customClassName="nav-icon" />,
    },
    {
      component: CNavTitle,
      name: 'Business',
    },
    {
      component: CNavItem,
      name: 'Voice Agents',
      to: `${prefix}/voice-agents`,
      icon: <CIcon icon={cilMicrophone} customClassName="nav-icon" />,
    },
    {
      component: CNavItem,
      name: 'Call History',
      to: `${prefix}/calls`,
      icon: <CIcon icon={cilPhone} customClassName="nav-icon" />,
    },
    {
      component: CNavGroup,
      name: 'Credits',
      icon: <CIcon icon={cilDollar} customClassName="nav-icon" />,
      items: [
        {
          component: CNavItem,
          name: 'User Credits',
          to: `${prefix}/credits`,
        },
        {
          component: CNavItem,
          name: 'Transactions',
          to: `${prefix}/transactions`,
        },
      ],
    },
    {
      component: CNavGroup,
      name: 'Subscriptions',
      icon: <CIcon icon={cilCreditCard} customClassName="nav-icon" />,
      items: [
        {
          component: CNavItem,
          name: 'All Subscriptions',
          to: `${prefix}/subscriptions`,
        },
        {
          component: CNavItem,
          name: 'Packages',
          to: `${prefix}/packages`,
        },
      ],
    },
    {
      component: CNavGroup,
      name: 'Billing & Invoices',
      icon: <CIcon icon={cilDollar} customClassName="nav-icon" />,
      items: [
        {
          component: CNavItem,
          name: 'Invoices',
          to: `${prefix}/billing/invoices`,
        },
        {
          component: CNavItem,
          name: 'Payment History',
          to: `${prefix}/billing/payments`,
        },
        {
          component: CNavItem,
          name: 'Coupons',
          to: `${prefix}/billing/coupons`,
        },
        {
          component: CNavItem,
          name: 'Credit Transactions',
          to: `${prefix}/billing/transactions`,
        },
        {
          component: CNavItem,
          name: 'Tax Configuration',
          to: `${prefix}/billing/tax-config`,
        },
        {
          component: CNavItem,
          name: 'Invoice Settings',
          to: `${prefix}/billing/settings`,
        },
        {
          component: CNavItem,
          name: 'Package Management',
          to: `${prefix}/billing/packages`,
        },
      ],
    },
    {
      component: CNavItem,
      name: 'Inbound Numbers',
      to: `${prefix}/inbound-numbers`,
      icon: <CIcon icon={cilPhone} customClassName="nav-icon" />,
    },
    {
      component: CNavItem,
      name: 'Reports & Exports',
      to: `${prefix}/reports`,
      icon: <CIcon icon={cilChart} customClassName="nav-icon" />,
    },
    {
      component: CNavTitle,
      name: 'Support & Operations',
    },
    {
      component: CNavItem,
      name: 'Support Tickets',
      to: `${prefix}/support/tickets`,
      icon: <CIcon icon={cilTask} customClassName="nav-icon" />,
    },
    {
      component: CNavItem,
      name: 'KYC Moderation',
      to: `${prefix}/kyc`,
      icon: <CIcon icon={cilCheckCircle} customClassName="nav-icon" />,
    },
    {
      component: CNavTitle,
      name: 'System',
    },
    {
      component: CNavItem,
      name: 'Feature Flags',
      to: `${prefix}/settings/feature-flags`,
      icon: <CIcon icon={cilToggleOn} customClassName="nav-icon" />,
      // Only show to super_admin (handled by ProtectedRoute)
    },
    {
      component: CNavItem,
      name: 'System Settings',
      to: `${prefix}/settings/system`,
      icon: <CIcon icon={cilSettings} customClassName="nav-icon" />,
      // Only show to super_admin (handled by ProtectedRoute)
    },
    {
      component: CNavItem,
      name: 'Security Events',
      to: `${prefix}/security-events`,
      icon: <CIcon icon={cilShieldAlt} customClassName="nav-icon" />,
    },
    {
      component: CNavGroup,
      name: 'Security',
      icon: <CIcon icon={cilLockLocked} customClassName="nav-icon" />,
      items: [
        {
          component: CNavItem,
          name: 'Security Settings',
          to: `${prefix}/security`,
        },
        {
          component: CNavItem,
          name: 'Verification Tokens',
          to: `${prefix}/security/tokens`,
        },
        {
          component: CNavItem,
          name: '2FA Management',
          to: `${prefix}/security/2fa`,
        },
      ],
    },
    {
      component: CNavTitle,
      name: 'Scheduling',
    },
    {
      component: CNavItem,
      name: 'Call Schedules',
      to: `${prefix}/scheduling/schedules`,
      icon: <CIcon icon={cilClock} customClassName="nav-icon" />,
    },
    {
      component: CNavItem,
      name: 'Holidays',
      to: `${prefix}/scheduling/holidays`,
      icon: <CIcon icon={cilCalendar} customClassName="nav-icon" />,
    },
    {
      component: CNavTitle,
      name: 'Knowledge Base',
    },
    {
      component: CNavItem,
      name: 'Knowledge Bases',
      to: `${prefix}/knowledge/bases`,
      icon: <CIcon icon={cilDescription} customClassName="nav-icon" />,
    },
    {
      component: CNavTitle,
      name: 'Communication',
    },
    {
      component: CNavItem,
      name: 'AI Prompts',
      to: `${prefix}/communication/prompts`,
      icon: <CIcon icon={cilCog} customClassName="nav-icon" />,
    },
    {
      component: CNavItem,
      name: 'Email Logs',
      to: `${prefix}/communication/emails`,
      icon: <CIcon icon={cilEnvelopeOpen} customClassName="nav-icon" />,
    },
    {
      component: CNavItem,
      name: 'Email Templates',
      to: `${prefix}/communication/templates`,
      icon: <CIcon icon={cilDescription} customClassName="nav-icon" />,
    },
  ]
}

export default getNavItems

// ============================================================
// ORIGINAL TEMPLATE NAVIGATION (hidden, not removed)
// Uncomment below to restore original CoreUI template navigation
// ============================================================
/*
const _nav_template = [
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
    badge: {
      color: 'info',
      text: 'NEW',
    },
  },
  {
    component: CNavTitle,
    name: 'Theme',
  },
  {
    component: CNavItem,
    name: 'Colors',
    to: '/theme/colors',
    icon: <CIcon icon={cilDrop} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Typography',
    to: '/theme/typography',
    icon: <CIcon icon={cilPencil} customClassName="nav-icon" />,
  },
  {
    component: CNavTitle,
    name: 'Components',
  },
  {
    component: CNavGroup,
    name: 'Base',
    to: '/base',
    icon: <CIcon icon={cilPuzzle} customClassName="nav-icon" />,
    items: [
      { component: CNavItem, name: 'Accordion', to: '/base/accordion' },
      { component: CNavItem, name: 'Breadcrumb', to: '/base/breadcrumbs' },
      { component: CNavItem, name: 'Cards', to: '/base/cards' },
      { component: CNavItem, name: 'Carousel', to: '/base/carousels' },
      { component: CNavItem, name: 'Collapse', to: '/base/collapses' },
      { component: CNavItem, name: 'List group', to: '/base/list-groups' },
      { component: CNavItem, name: 'Navs & Tabs', to: '/base/navs' },
      { component: CNavItem, name: 'Pagination', to: '/base/paginations' },
      { component: CNavItem, name: 'Placeholders', to: '/base/placeholders' },
      { component: CNavItem, name: 'Popovers', to: '/base/popovers' },
      { component: CNavItem, name: 'Progress', to: '/base/progress' },
      { component: CNavItem, name: 'Spinners', to: '/base/spinners' },
      { component: CNavItem, name: 'Tables', to: '/base/tables' },
      { component: CNavItem, name: 'Tabs', to: '/base/tabs' },
      { component: CNavItem, name: 'Tooltips', to: '/base/tooltips' },
    ],
  },
  {
    component: CNavGroup,
    name: 'Buttons',
    to: '/buttons',
    icon: <CIcon icon={cilCursor} customClassName="nav-icon" />,
    items: [
      { component: CNavItem, name: 'Buttons', to: '/buttons/buttons' },
      { component: CNavItem, name: 'Buttons groups', to: '/buttons/button-groups' },
      { component: CNavItem, name: 'Dropdowns', to: '/buttons/dropdowns' },
    ],
  },
  {
    component: CNavGroup,
    name: 'Forms',
    icon: <CIcon icon={cilNotes} customClassName="nav-icon" />,
    items: [
      { component: CNavItem, name: 'Checks & Radios', to: '/forms/checks-radios' },
      { component: CNavItem, name: 'Floating Labels', to: '/forms/floating-labels' },
      { component: CNavItem, name: 'Form Control', to: '/forms/form-control' },
      { component: CNavItem, name: 'Input Group', to: '/forms/input-group' },
      { component: CNavItem, name: 'Range', to: '/forms/range' },
      { component: CNavItem, name: 'Select', to: '/forms/select' },
      { component: CNavItem, name: 'Layout', to: '/forms/layout' },
      { component: CNavItem, name: 'Validation', to: '/forms/validation' },
    ],
  },
  {
    component: CNavItem,
    name: 'Charts',
    to: '/charts',
    icon: <CIcon icon={cilChartPie} customClassName="nav-icon" />,
  },
  {
    component: CNavGroup,
    name: 'Icons',
    icon: <CIcon icon={cilStar} customClassName="nav-icon" />,
    items: [
      { component: CNavItem, name: 'CoreUI Free', to: '/icons/coreui-icons' },
      { component: CNavItem, name: 'CoreUI Flags', to: '/icons/flags' },
      { component: CNavItem, name: 'CoreUI Brands', to: '/icons/brands' },
    ],
  },
  {
    component: CNavGroup,
    name: 'Notifications',
    icon: <CIcon icon={cilBell} customClassName="nav-icon" />,
    items: [
      { component: CNavItem, name: 'Alerts', to: '/notifications/alerts' },
      { component: CNavItem, name: 'Badges', to: '/notifications/badges' },
      { component: CNavItem, name: 'Modal', to: '/notifications/modals' },
      { component: CNavItem, name: 'Toasts', to: '/notifications/toasts' },
    ],
  },
  {
    component: CNavItem,
    name: 'Widgets',
    to: '/widgets',
    icon: <CIcon icon={cilCalculator} customClassName="nav-icon" />,
    badge: { color: 'info', text: 'NEW' },
  },
  {
    component: CNavTitle,
    name: 'Extras',
  },
  {
    component: CNavGroup,
    name: 'Pages',
    icon: <CIcon icon={cilStar} customClassName="nav-icon" />,
    items: [
      { component: CNavItem, name: 'Login', to: '/login' },
      { component: CNavItem, name: 'Register', to: '/register' },
      { component: CNavItem, name: 'Error 404', to: '/404' },
      { component: CNavItem, name: 'Error 500', to: '/500' },
    ],
  },
  {
    component: CNavItem,
    name: 'Docs',
    href: 'https://coreui.io/react/docs/templates/installation/',
    icon: <CIcon icon={cilDescription} customClassName="nav-icon" />,
  },
]
*/
