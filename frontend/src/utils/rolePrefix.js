// Maps admin roles to URL prefixes
const rolePrefixMap = {
  super_admin: 'admin',
  finance: 'finance',
  support: 'support',
  ops: 'ops',
}

// Get the URL prefix for a given role
export const getRolePrefix = (role) => {
  return rolePrefixMap[role] || 'admin'
}

// Get the role from a URL prefix
export const getRoleFromPrefix = (prefix) => {
  const entry = Object.entries(rolePrefixMap).find(([, value]) => value === prefix)
  return entry ? entry[0] : null
}

// All valid prefixes
export const validPrefixes = Object.values(rolePrefixMap)

export default rolePrefixMap
