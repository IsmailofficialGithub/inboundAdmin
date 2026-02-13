import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
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
  const checkIsActive = (linkTo, currentLocation) => {
    if (!linkTo) return false
    
    // Parse the link's 'to' prop to get pathname and search params
    const [linkPathname, linkSearch] = linkTo.split('?')
    const currentPathname = currentLocation.pathname
    const currentSearch = currentLocation.search || ''
    
    // First check if pathname matches
    if (currentPathname !== linkPathname) {
      return false
    }
    
    // If the link has query parameters, check if they match exactly
    if (linkSearch) {
      const linkParams = new URLSearchParams(linkSearch)
      const currentParams = new URLSearchParams(currentSearch)
      
      // Check if all query params in the link match the current URL
      for (const [key, value] of linkParams.entries()) {
        if (currentParams.get(key) !== value) {
          return false
        }
      }
      return true
    } else {
      // For links without query params, only match if current URL also has no 'tab' query param
      // This handles the "All Users" link which should only be active when there's no tab param
      if (currentSearch) {
        const currentParams = new URLSearchParams(currentSearch)
        // If current URL has a 'tab' param but link doesn't, don't match
        if (currentParams.has('tab')) {
          return false
        }
      }
      return true
    }
  }

  const navItem = (item, index, indent = false) => {
    const { component, name, badge, icon, to, href, className: itemClassName, ...rest } = item
    const Component = component
    
    // Check if this link needs custom active state handling (users/list with query params)
    const needsCustomActive = to && !href && to.includes('/users/list')
    
    // Build the props for CNavLink
    const linkProps = {
      ...rest,
      ...(to && { 
        to, 
        as: NavLink,
        // Use className function to handle active state
        ...(needsCustomActive && {
          className: ({ isActive: navIsActive, isPending }) => {
            // Determine if this link should be active based on our custom logic
            const shouldBeActive = checkIsActive(to, location)
            // Combine classes
            const baseClass = itemClassName || ''
            const activeClass = shouldBeActive ? 'active' : ''
            const pendingClass = isPending ? 'pending' : ''
            return [baseClass, activeClass, pendingClass].filter(Boolean).join(' ') || undefined
          },
        }),
        // For non-custom links, use default className handling
        ...(!needsCustomActive && itemClassName && { className: itemClassName }),
      }),
      ...(href && { href, target: '_blank', rel: 'noopener noreferrer' }),
    }
    
    return (
      <Component as="div" key={index}>
        {to || href ? (
          <CNavLink {...linkProps}>
            {navLink(name, icon, badge, indent)}
          </CNavLink>
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
