/**
 * Cookie utility functions
 * Stores authentication tokens in httpOnly cookies (set by backend) or regular cookies (client-side)
 */

const COOKIE_NAME = 'auth_token'

/**
 * Set a cookie
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @param {number} days - Days until expiration (default: 7)
 * @param {object} options - Additional cookie options
 */
export const setCookie = (name, value, days = 7, options = {}) => {
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)

  let cookieString = `${name}=${value}; expires=${expires.toUTCString()}; path=/`

  // Add secure flag in production (HTTPS only)
  if (import.meta.env.PROD) {
    cookieString += '; secure'
  }

  // Add SameSite to prevent CSRF
  cookieString += '; SameSite=Lax'

  // Add any additional options
  if (options.domain) {
    cookieString += `; domain=${options.domain}`
  }

  document.cookie = cookieString
}

/**
 * Get a cookie value
 * @param {string} name - Cookie name
 * @returns {string|null} Cookie value or null if not found
 */
export const getCookie = (name) => {
  const nameEQ = name + '='
  const cookies = document.cookie.split(';')

  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i]
    while (cookie.charAt(0) === ' ') {
      cookie = cookie.substring(1, cookie.length)
    }
    if (cookie.indexOf(nameEQ) === 0) {
      return cookie.substring(nameEQ.length, cookie.length)
    }
  }
  return null
}

/**
 * Delete a cookie
 * @param {string} name - Cookie name
 */
export const deleteCookie = (name) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
  if (import.meta.env.PROD) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure`
  }
}

/**
 * Set the auth token in a cookie
 * @param {string} token - Access token
 */
export const setAuthToken = (token) => {
  setCookie(COOKIE_NAME, token, 7) // 7 days expiration
}

/**
 * Get the auth token from cookie
 * @returns {string|null} Access token or null if not found
 */
export const getAuthToken = () => {
  return getCookie(COOKIE_NAME)
}

/**
 * Clear the auth token cookie
 */
export const clearAuthToken = () => {
  deleteCookie(COOKIE_NAME)
}
