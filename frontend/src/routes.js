import React from 'react'

// ============================================================
// ADMIN PAGES
// ============================================================
const AdminDashboard = React.lazy(() => import('./views/admin/dashboard/AdminDashboard'))
const Profile = React.lazy(() => import('./views/admin/profile/Profile'))
const UsersList = React.lazy(() => import('./views/admin/users/UsersList'))
const UserDetail = React.lazy(() => import('./views/admin/users/UserDetail'))
const ActivityLog = React.lazy(() => import('./views/admin/activity/ActivityLog'))
const SecurityEvents = React.lazy(() => import('./views/admin/security/SecurityEvents'))
const SecuritySettings = React.lazy(() => import('./views/admin/security/SecuritySettings'))

// Voice Agents
const VoiceAgentsList = React.lazy(() => import('./views/admin/voice-agents/VoiceAgentsList'))
const VoiceAgentDetail = React.lazy(() => import('./views/admin/voice-agents/VoiceAgentDetail'))

// Calls
const CallsList = React.lazy(() => import('./views/admin/calls/CallsList'))
const CallDetail = React.lazy(() => import('./views/admin/calls/CallDetail'))

// Credits
const CreditsList = React.lazy(() => import('./views/admin/credits/CreditsList'))
const TransactionsList = React.lazy(() => import('./views/admin/credits/TransactionsList'))

// Subscriptions
const SubscriptionsList = React.lazy(() => import('./views/admin/subscriptions/SubscriptionsList'))
const PackagesList = React.lazy(() => import('./views/admin/subscriptions/PackagesList'))

// Billing & Invoices
const InvoicesList = React.lazy(() => import('./views/admin/billing/InvoicesList'))
const InvoiceDetail = React.lazy(() => import('./views/admin/billing/InvoiceDetail'))
const PaymentHistory = React.lazy(() => import('./views/admin/billing/PaymentHistory'))
const CouponsList = React.lazy(() => import('./views/admin/billing/CouponsList'))
const InvoiceSettings = React.lazy(() => import('./views/admin/billing/InvoiceSettings'))
const PackagesManagement = React.lazy(() => import('./views/admin/billing/PackagesManagement'))

// Inbound Numbers
const InboundNumbersList = React.lazy(() => import('./views/admin/inbound-numbers/InboundNumbersList'))
const InboundNumberDetail = React.lazy(() => import('./views/admin/inbound-numbers/InboundNumberDetail'))

// Support & Operations
const TicketsList = React.lazy(() => import('./views/admin/support/TicketsList'))
const TicketDetail = React.lazy(() => import('./views/admin/support/TicketDetail'))
const FeatureFlags = React.lazy(() => import('./views/admin/settings/FeatureFlags'))
const SystemSettings = React.lazy(() => import('./views/admin/settings/SystemSettings'))
const KYCModeration = React.lazy(() => import('./views/admin/kyc/KYCModeration'))
const KYCUserDetail = React.lazy(() => import('./views/admin/kyc/KYCUserDetail'))

// User Authentication & Security
const AccountDeactivations = React.lazy(() => import('./views/admin/users/AccountDeactivations'))
const UserEmails = React.lazy(() => import('./views/admin/users/UserEmails'))
const VerificationTokens = React.lazy(() => import('./views/admin/security/VerificationTokens'))
const TwoFactorManagement = React.lazy(() => import('./views/admin/security/TwoFactorManagement'))

// Scheduling
const CallSchedules = React.lazy(() => import('./views/admin/scheduling/CallSchedules'))
const CallScheduleDetail = React.lazy(() => import('./views/admin/scheduling/CallScheduleDetail'))
const CallScheduleNew = React.lazy(() => import('./views/admin/scheduling/CallScheduleNew'))
const Holidays = React.lazy(() => import('./views/admin/scheduling/Holidays'))

// Knowledge Base
const KnowledgeBases = React.lazy(() => import('./views/admin/knowledge/KnowledgeBases'))

// Billing Extensions
const CreditTransactions = React.lazy(() => import('./views/admin/billing/CreditTransactions'))
const TaxConfiguration = React.lazy(() => import('./views/admin/billing/TaxConfiguration'))

// Communication
const AIPrompts = React.lazy(() => import('./views/admin/communication/AIPrompts'))
const EmailLogs = React.lazy(() => import('./views/admin/communication/EmailLogs'))
const EmailTemplates = React.lazy(() => import('./views/admin/communication/EmailTemplates'))

// Reports
const Reports = React.lazy(() => import('./views/admin/reports/Reports'))

// ============================================================
// ORIGINAL TEMPLATE PAGES (kept, not removed)
// ============================================================
const Dashboard = React.lazy(() => import('./views/dashboard/Dashboard'))
const Colors = React.lazy(() => import('./views/theme/colors/Colors'))
const Typography = React.lazy(() => import('./views/theme/typography/Typography'))

// Base
const Accordion = React.lazy(() => import('./views/base/accordion/Accordion'))
const Breadcrumbs = React.lazy(() => import('./views/base/breadcrumbs/Breadcrumbs'))
const Cards = React.lazy(() => import('./views/base/cards/Cards'))
const Carousels = React.lazy(() => import('./views/base/carousels/Carousels'))
const Collapses = React.lazy(() => import('./views/base/collapses/Collapses'))
const ListGroups = React.lazy(() => import('./views/base/list-groups/ListGroups'))
const Navs = React.lazy(() => import('./views/base/navs/Navs'))
const Paginations = React.lazy(() => import('./views/base/paginations/Paginations'))
const Placeholders = React.lazy(() => import('./views/base/placeholders/Placeholders'))
const Popovers = React.lazy(() => import('./views/base/popovers/Popovers'))
const Progress = React.lazy(() => import('./views/base/progress/Progress'))
const Spinners = React.lazy(() => import('./views/base/spinners/Spinners'))
const Tabs = React.lazy(() => import('./views/base/tabs/Tabs'))
const Tables = React.lazy(() => import('./views/base/tables/Tables'))
const Tooltips = React.lazy(() => import('./views/base/tooltips/Tooltips'))

// Buttons
const Buttons = React.lazy(() => import('./views/buttons/buttons/Buttons'))
const ButtonGroups = React.lazy(() => import('./views/buttons/button-groups/ButtonGroups'))
const Dropdowns = React.lazy(() => import('./views/buttons/dropdowns/Dropdowns'))

//Forms
const ChecksRadios = React.lazy(() => import('./views/forms/checks-radios/ChecksRadios'))
const FloatingLabels = React.lazy(() => import('./views/forms/floating-labels/FloatingLabels'))
const FormControl = React.lazy(() => import('./views/forms/form-control/FormControl'))
const InputGroup = React.lazy(() => import('./views/forms/input-group/InputGroup'))
const Layout = React.lazy(() => import('./views/forms/layout/Layout'))
const Range = React.lazy(() => import('./views/forms/range/Range'))
const Select = React.lazy(() => import('./views/forms/select/Select'))
const Validation = React.lazy(() => import('./views/forms/validation/Validation'))

const Charts = React.lazy(() => import('./views/charts/Charts'))

// Icons
const CoreUIIcons = React.lazy(() => import('./views/icons/coreui-icons/CoreUIIcons'))
const Flags = React.lazy(() => import('./views/icons/flags/Flags'))
const Brands = React.lazy(() => import('./views/icons/brands/Brands'))

// Notifications
const Alerts = React.lazy(() => import('./views/notifications/alerts/Alerts'))
const Badges = React.lazy(() => import('./views/notifications/badges/Badges'))
const Modals = React.lazy(() => import('./views/notifications/modals/Modals'))
const Toasts = React.lazy(() => import('./views/notifications/toasts/Toasts'))

const Widgets = React.lazy(() => import('./views/widgets/Widgets'))

// ============================================================
// Routes use RELATIVE paths (no leading slash) because they are
// nested inside /:rolePrefix/* in App.js
// ============================================================
const routes = [
  // ADMIN ROUTES
  { path: 'dashboard', name: 'Dashboard', element: AdminDashboard },
  { path: 'profile', name: 'Profile', element: Profile },
  { path: 'users', name: 'Users', element: UsersList, exact: true },
  { path: 'users/list', name: 'All Users', element: UsersList },
  { path: 'users/:id', name: 'User Detail', element: UserDetail },
  { path: 'activity-log', name: 'Activity Log', element: ActivityLog },
  { path: 'security-events', name: 'Security Events', element: SecurityEvents, requiredRoles: ['super_admin', 'support'] },
  { path: 'security', name: 'Security Settings', element: SecuritySettings, requiredRoles: ['super_admin', 'ops'] },

  // Voice Agents
  { path: 'voice-agents', name: 'Voice Agents', element: VoiceAgentsList, exact: true },
  { path: 'voice-agents/:id', name: 'Agent Detail', element: VoiceAgentDetail },

  // Calls & Recordings
  { path: 'calls', name: 'Call History', element: CallsList, exact: true },
  { path: 'calls/:id', name: 'Call Detail', element: CallDetail },

  // Credits & Transactions
  { path: 'credits', name: 'User Credits', element: CreditsList, exact: true },
  { path: 'transactions', name: 'Transactions', element: TransactionsList },

  // Subscriptions & Packages
  { path: 'subscriptions', name: 'Subscriptions', element: SubscriptionsList, exact: true },
  { path: 'packages', name: 'Packages', element: PackagesList },

  // Billing & Invoices
  { path: 'billing/invoices', name: 'Invoices', element: InvoicesList, exact: true },
  { path: 'billing/invoices/:id', name: 'Invoice Detail', element: InvoiceDetail },
  { path: 'billing/payments', name: 'Payment History', element: PaymentHistory },
  { path: 'billing/coupons', name: 'Coupons', element: CouponsList },
  { path: 'billing/settings', name: 'Invoice Settings', element: InvoiceSettings, requiredRoles: ['super_admin', 'finance'] },
  { path: 'billing/packages', name: 'Package Management', element: PackagesManagement, requiredRoles: ['super_admin', 'finance'] },

  // Inbound Numbers
  { path: 'inbound-numbers', name: 'Inbound Numbers', element: InboundNumbersList, exact: true },
  { path: 'inbound-numbers/:id', name: 'Number Detail', element: InboundNumberDetail },

  // Support & Operations
  { path: 'support/tickets', name: 'Support Tickets', element: TicketsList, exact: true },
  { path: 'support/tickets/:id', name: 'Ticket Detail', element: TicketDetail },
  { path: 'settings/feature-flags', name: 'Feature Flags', element: FeatureFlags, requiredRoles: ['super_admin'] },
  { path: 'settings/system', name: 'System Settings', element: SystemSettings, requiredRoles: ['super_admin'] },
  { path: 'kyc', name: 'KYC Moderation', element: KYCModeration, requiredRoles: ['super_admin', 'support', 'ops'] },
  { path: 'kyc/users/:id', name: 'KYC User Detail', element: KYCUserDetail, requiredRoles: ['super_admin', 'support', 'ops'] },

  // User Authentication & Security
  { path: 'users/deactivations', name: 'Account Deactivations', element: AccountDeactivations, requiredRoles: ['super_admin', 'support'] },
  { path: 'users/emails', name: 'User Emails', element: UserEmails, requiredRoles: ['super_admin', 'support'] },
  { path: 'security/tokens', name: 'Verification Tokens', element: VerificationTokens, requiredRoles: ['super_admin', 'support'] },
  { path: 'security/2fa', name: 'Two-Factor Management', element: TwoFactorManagement, requiredRoles: ['super_admin', 'support'] },

  // Scheduling
  { path: 'scheduling/schedules', name: 'Call Schedules', element: CallSchedules, requiredRoles: ['super_admin', 'support', 'ops'] },
  { path: 'scheduling/schedules/new', name: 'New Schedule', element: CallScheduleNew, requiredRoles: ['super_admin', 'ops'] },
  { path: 'scheduling/schedules/:id', name: 'Schedule Detail', element: CallScheduleDetail, requiredRoles: ['super_admin', 'support', 'ops'] },
  { path: 'scheduling/holidays', name: 'Holidays', element: Holidays, requiredRoles: ['super_admin', 'support', 'ops'] },

  // Knowledge Base
  { path: 'knowledge/bases', name: 'Knowledge Bases', element: KnowledgeBases, requiredRoles: ['super_admin', 'support', 'ops'] },

  // Billing Extensions
  { path: 'billing/transactions', name: 'Credit Transactions', element: CreditTransactions },
  { path: 'billing/tax-config', name: 'Tax Configuration', element: TaxConfiguration, requiredRoles: ['super_admin', 'finance'] },

  // Communication
  { path: 'communication/prompts', name: 'AI Prompts', element: AIPrompts, requiredRoles: ['super_admin', 'support', 'ops'] },
  { path: 'communication/emails', name: 'Email Logs', element: EmailLogs, requiredRoles: ['super_admin', 'support'] },
  { path: 'communication/templates', name: 'Email Templates', element: EmailTemplates, requiredRoles: ['super_admin', 'support', 'ops'] },

  // Reports & Exports
  { path: 'reports', name: 'Reports & Exports', element: Reports },

  // ============================================================
  // ORIGINAL TEMPLATE ROUTES (kept for reference, still accessible)
  // ============================================================
  { path: 'template/dashboard', name: 'Template Dashboard', element: Dashboard },
  { path: 'theme', name: 'Theme', element: Colors, exact: true },
  { path: 'theme/colors', name: 'Colors', element: Colors },
  { path: 'theme/typography', name: 'Typography', element: Typography },
  { path: 'base', name: 'Base', element: Cards, exact: true },
  { path: 'base/accordion', name: 'Accordion', element: Accordion },
  { path: 'base/breadcrumbs', name: 'Breadcrumbs', element: Breadcrumbs },
  { path: 'base/cards', name: 'Cards', element: Cards },
  { path: 'base/carousels', name: 'Carousel', element: Carousels },
  { path: 'base/collapses', name: 'Collapse', element: Collapses },
  { path: 'base/list-groups', name: 'List Groups', element: ListGroups },
  { path: 'base/navs', name: 'Navs', element: Navs },
  { path: 'base/paginations', name: 'Paginations', element: Paginations },
  { path: 'base/placeholders', name: 'Placeholders', element: Placeholders },
  { path: 'base/popovers', name: 'Popovers', element: Popovers },
  { path: 'base/progress', name: 'Progress', element: Progress },
  { path: 'base/spinners', name: 'Spinners', element: Spinners },
  { path: 'base/tabs', name: 'Tabs', element: Tabs },
  { path: 'base/tables', name: 'Tables', element: Tables },
  { path: 'base/tooltips', name: 'Tooltips', element: Tooltips },
  { path: 'buttons', name: 'Buttons', element: Buttons, exact: true },
  { path: 'buttons/buttons', name: 'Buttons', element: Buttons },
  { path: 'buttons/dropdowns', name: 'Dropdowns', element: Dropdowns },
  { path: 'buttons/button-groups', name: 'Button Groups', element: ButtonGroups },
  { path: 'charts', name: 'Charts', element: Charts },
  { path: 'forms', name: 'Forms', element: FormControl, exact: true },
  { path: 'forms/form-control', name: 'Form Control', element: FormControl },
  { path: 'forms/select', name: 'Select', element: Select },
  { path: 'forms/checks-radios', name: 'Checks & Radios', element: ChecksRadios },
  { path: 'forms/range', name: 'Range', element: Range },
  { path: 'forms/input-group', name: 'Input Group', element: InputGroup },
  { path: 'forms/floating-labels', name: 'Floating Labels', element: FloatingLabels },
  { path: 'forms/layout', name: 'Layout', element: Layout },
  { path: 'forms/validation', name: 'Validation', element: Validation },
  { path: 'icons', exact: true, name: 'Icons', element: CoreUIIcons },
  { path: 'icons/coreui-icons', name: 'CoreUI Icons', element: CoreUIIcons },
  { path: 'icons/flags', name: 'Flags', element: Flags },
  { path: 'icons/brands', name: 'Brands', element: Brands },
  { path: 'notifications', name: 'Notifications', element: Alerts, exact: true },
  { path: 'notifications/alerts', name: 'Alerts', element: Alerts },
  { path: 'notifications/badges', name: 'Badges', element: Badges },
  { path: 'notifications/modals', name: 'Modals', element: Modals },
  { path: 'notifications/toasts', name: 'Toasts', element: Toasts },
  { path: 'widgets', name: 'Widgets', element: Widgets },
]

export default routes
