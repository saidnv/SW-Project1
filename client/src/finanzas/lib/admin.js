export const ADMIN_USERNAME = 'robinson'
export const ADMIN_PIN = '2524'

export function isAdminUsername(name) {
  return String(name || '').trim().toLowerCase() === ADMIN_USERNAME
}
