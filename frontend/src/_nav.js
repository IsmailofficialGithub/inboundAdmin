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
      to: `${prefix}/users`,
      icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
      items: [
        {
          component: CNavItem,
          name: 'All Users',
          to: `${prefix}/users/list`,
        },
      ],
    },
    {
      component: CNavItem,
      name: 'Admins',
      to: `${prefix}/admins`,
      icon: <CIcon icon={cilShieldAlt} customClassName="nav-icon" />,
      // Only show to super_admin (handled by ProtectedRoute)
    },
    {
      component: CNavItem,
      name: 'Activity Log',
      to: `${prefix}/activity-log`,
      icon: <CIcon icon={cilHistory} customClassName="nav-icon" />,
    },
    {
      component: CNavTitle,
      name: 'System',
    },
    {
      component: CNavItem,
      name: 'Security Events',
      to: `${prefix}/security-events`,
      icon: <CIcon icon={cilShieldAlt} customClassName="nav-icon" />,
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
