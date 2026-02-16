import React from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import PropTypes from 'prop-types'

import SimpleBar from 'simplebar-react'
import 'simplebar-react/dist/simplebar.min.css'

import { CBadge, CNavLink, CSidebarNav } from '@coreui/react'

export const AppSidebarNav = ({ items }) => {
  const location = useLocation()
  const navLink = (name, icon, badge, indent = false) => {
    return (
      <>
        {icon
          ? icon
          : indent && (
              <span className="nav-icon">
                <span className="nav-icon-bullet"></span>
              </span>
            )}
        {name && name}
        {badge && (
          <CBadge color={badge.color} className="ms-auto" size="sm">
            {badge.text}
          </CBadge>
        )}
      </>
    )
  }

  // Custom function to check if a link should be active based on pathname and query parameters
  // This is specifically for /users/list routes that differ only by the 'tab' query parameter
  const checkIsActive = (linkTo, currentLocation) => {
    if (!linkTo) return false

    // Parse the link's 'to' prop to get pathname and search params
    const [linkPathname, linkSearch] = linkTo.split('?')
    const currentPathname = currentLocation.pathname
    const currentSearch = currentLocation.search || ''

    // First check if pathname matches exactly
    if (currentPathname !== linkPathname) {
      return false
    }

    // Parse query parameters
    const currentParams = new URLSearchParams(currentSearch)
    const linkParams = linkSearch ? new URLSearchParams(linkSearch) : new URLSearchParams()

    // Get the 'tab' value from both URLs (null if not present)
    const currentTab = currentParams.get('tab')
    const linkTab = linkParams.get('tab')

    // Compare the 'tab' values - they must match exactly (including both being null/undefined)
    // This ensures only one link is active at a time
    if (linkTab === null || linkTab === undefined) {
      // Link has no 'tab' param - only active if current URL also has no 'tab' param
      return currentTab === null
    } else {
      // Link has a 'tab' param - only active if current URL has the same 'tab' value
      return currentTab === linkTab
    }
  }

  const navItem = (item, index, indent = false) => {
    const { component, name, badge, icon, to, href, className: itemClassName, ...rest } = item
    const Component = component

    // Check if this link needs custom active state handling (users/list with query params)
    const needsCustomActive = to && !href && to.includes('/users/list')

    // Build the props for CNavLink (only used for non-custom links)
    const linkProps = {
      ...rest,
      ...(to && {
        to,
        as: NavLink,
        ...(itemClassName && { className: itemClassName }),
      }),
      ...(href && { href, target: '_blank', rel: 'noopener noreferrer' }),
    }

    return (
      <Component as="div" key={index}>
        {needsCustomActive && to ? (
          // For links sharing the same pathname (e.g. /users/list with different ?tab= params),
          // render a plain Link to avoid NavLink's pathname-only active matching.
          // We manually control the 'active' class based on query param comparison.
          <Link
            to={to}
            className={`nav-link${checkIsActive(to, location) ? ' active' : ''}`}
          >
            {navLink(name, icon, badge, indent)}
          </Link>
        ) : to || href ? (
          <CNavLink {...linkProps}>{navLink(name, icon, badge, indent)}</CNavLink>
        ) : (
          navLink(name, icon, badge, indent)
        )}
      </Component>
    )
  }

  const navGroup = (item, index) => {
    const { component, name, icon, items, to, ...rest } = item
    const Component = component
    // Remove 'to' from rest to prevent CNavGroup from being a link
    const { to: _, ...groupProps } = rest
    return (
      <Component compact as="div" key={index} toggler={navLink(name, icon)} {...groupProps}>
        {items?.map((item, index) =>
          item.items ? navGroup(item, index) : navItem(item, index, true),
        )}
      </Component>
    )
  }

  return (
    <CSidebarNav as={SimpleBar}>
      {items &&
        items.map((item, index) => (item.items ? navGroup(item, index) : navItem(item, index)))}
    </CSidebarNav>
  )
}

AppSidebarNav.propTypes = {
  items: PropTypes.arrayOf(PropTypes.any).isRequired,
}
