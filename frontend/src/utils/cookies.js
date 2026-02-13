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

  // Add secure flag only if using HTTPS
  // Note: Removed automatic secure flag in production to support HTTP deployments
  // If you're using HTTPS, uncomment the line below:
  // if (window.location.protocol === 'https:') {
  //   cookieString += '; secure'
  // }

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
 * Checks both auth_token (custom) and sb-auth-token (Supabase format)
 * @returns {string|null} Access token or null if not found
 */
export const getAuthToken = () => {
  // First check our custom auth_token cookie
  const customToken = getCookie(COOKIE_NAME)
  if (customToken) {
    return customToken
  }

  // Fallback to Supabase's sb-auth-token cookie (JSON format)
  const sbAuthToken = getCookie('sb-auth-token')
  if (sbAuthToken) {
    try {
      // Parse the JSON object and extract access_token
      const sessionData = JSON.parse(sbAuthToken)
      if (sessionData && sessionData.access_token) {
        return sessionData.access_token
      }
    } catch (e) {
      // If parsing fails, try to use the cookie value directly as token
      // (in case it's just the token string, not JSON)
      return sbAuthToken
    }
  }

  return null
}

/**
 * Clear the auth token cookie
 */
export const clearAuthToken = () => {
  deleteCookie(COOKIE_NAME)
}
