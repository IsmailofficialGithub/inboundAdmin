import React from 'react'
import { useLocation, useParams } from 'react-router-dom'

import routes from '../routes'

import { CBreadcrumb, CBreadcrumbItem } from '@coreui/react'

const AppBreadcrumb = () => {
  const currentLocation = useLocation().pathname
  const { rolePrefix } = useParams()

  // Strip the role prefix from the location for route matching
  const strippedLocation = rolePrefix
    ? currentLocation.replace(`/${rolePrefix}`, '')
    : currentLocation

  const getRouteName = (pathname, routes) => {
    const currentRoute = routes.find((route) => route.path === pathname)
    return currentRoute ? currentRoute.name : false
  }

  const getBreadcrumbs = (location) => {
    const breadcrumbs = []
    location.split('/').reduce((prev, curr, index, array) => {
      const currentPathname = `${prev}/${curr}`
      // Match against relative route paths (strip leading slash for matching)
      const pathToMatch = currentPathname.startsWith('/')
        ? currentPathname.substring(1)
        : currentPathname
      const routeName = getRouteName(pathToMatch, routes)
      routeName &&
        breadcrumbs.push({
          pathname: `/${rolePrefix}${currentPathname}`,
          name: routeName,
          active: index + 1 === array.length ? true : false,
        })
      return currentPathname
    })
    return breadcrumbs
  }

  const breadcrumbs = getBreadcrumbs(strippedLocation)

  return (
    <CBreadcrumb className="my-0">
      <CBreadcrumbItem href={`/${rolePrefix}/dashboard`}>Home</CBreadcrumbItem>
      {breadcrumbs.map((breadcrumb, index) => {
        return (
          <CBreadcrumbItem
            {...(breadcrumb.active ? { active: true } : { href: breadcrumb.pathname })}
            key={index}
          >
            {breadcrumb.name}
          </CBreadcrumbItem>
        )
      })}
    </CBreadcrumb>
  )
}

export default React.memo(AppBreadcrumb)
