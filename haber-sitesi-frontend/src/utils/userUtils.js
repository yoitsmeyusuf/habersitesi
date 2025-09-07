/**
 * User utilities for display name handling
 */

/**
 * Get display name for user based on priority:
 * 1. DisplayName if set
 * 2. FirstName + LastName if either exists
 * 3. Username as fallback
 * @param {object} user - User object
 * @returns {string} Display name
 */
export function getDisplayName(user) {
  if (!user) return 'Anonim';

  // Priority 1: DisplayName
  if (user.displayName && user.displayName.trim()) {
    return user.displayName.trim();
  }

  // Priority 2: FirstName + LastName
  const firstName = user.firstName?.trim() || '';
  const lastName = user.lastName?.trim() || '';
  
  if (firstName || lastName) {
    return `${firstName} ${lastName}`.trim();
  }

  // Priority 3: Name or Username fallback
  return user.name || user.username || 'Anonim';
}

/**
 * Get user initials for avatars
 * @param {object} user - User object
 * @returns {string} User initials (max 2 characters)
 */
export function getUserInitials(user) {
  if (!user) return '?';

  const displayName = getDisplayName(user);
  
  // Split by spaces and take first letter of each word
  const words = displayName.split(' ').filter(word => word.length > 0);
  
  if (words.length >= 2) {
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  } else if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  
  return '?';
}

/**
 * Get full name (FirstName + LastName only)
 * @param {object} user - User object  
 * @returns {string} Full name or empty string
 */
export function getFullName(user) {
  if (!user) return '';

  const firstName = user.firstName?.trim() || '';
  const lastName = user.lastName?.trim() || '';
  
  return `${firstName} ${lastName}`.trim();
}

/**
 * Check if user has real name information
 * @param {object} user - User object
 * @returns {boolean} True if user has firstName or lastName
 */
export function hasRealName(user) {
  if (!user) return false;
  
  return !!(user.firstName?.trim() || user.lastName?.trim());
}

/**
 * Get user profile display data
 * @param {object} user - User object
 * @returns {object} Profile display data
 */
export function getUserProfileData(user) {
  if (!user) {
    return {
      displayName: 'Anonim',
      initials: '?',
      fullName: '',
      hasRealName: false,
      username: ''
    };
  }

  return {
    displayName: getDisplayName(user),
    initials: getUserInitials(user),
    fullName: getFullName(user),
    hasRealName: hasRealName(user),
    username: user.username || ''
  };
}

export default {
  getDisplayName,
  getUserInitials,
  getFullName,
  hasRealName,
  getUserProfileData
};
