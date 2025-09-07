/**
 * Slug URL utilities for SEO-friendly URLs
 * Converts news titles to URL-safe slugs and handles slug-id format
 */

/**
 * Generate URL-safe slug from Turkish text
 * @param {string} text - Text to convert to slug
 * @returns {string} URL-safe slug
 */
export function generateSlug(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Turkish character replacements
  const turkishChars = {
    'ç': 'c', 'Ç': 'C',
    'ğ': 'g', 'Ğ': 'G', 
    'ı': 'i', 'I': 'I',
    'İ': 'I', 'i': 'i',
    'ö': 'o', 'Ö': 'O',
    'ş': 's', 'Ş': 'S',
    'ü': 'u', 'Ü': 'U'
  };

  return text
    // Replace Turkish characters
    .replace(/[çÇğĞıIİiöÖşŞüÜ]/g, (match) => turkishChars[match] || match)
    // Convert to lowercase
    .toLowerCase()
    // Replace spaces and special characters with hyphens
    .replace(/[^a-z0-9]+/g, '-')
    // Remove leading and trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Replace multiple consecutive hyphens with single hyphen
    .replace(/-+/g, '-')
    // Limit length to 100 characters
    .substring(0, 100)
    // Remove trailing hyphen if exists after substring
    .replace(/-+$/, '');
}

/**
 * Create slug-id format for URLs (slug-id)
 * @param {string} title - News title
 * @param {number|string} id - News ID
 * @returns {string} Slug in format "slug-id"
 */
export function createSlugId(title, id) {
  if (!title || !id) {
    return String(id || '');
  }

  const slug = generateSlug(title);
  
  // If slug is empty, just return the ID
  if (!slug) {
    return String(id);
  }

  return `${slug}-${id}`;
}

/**
 * Extract ID from slug-id format
 * @param {string} slugId - Slug in format "slug-id" or just "id"
 * @returns {string} Extracted ID
 */
export function extractIdFromSlug(slugId) {
  if (!slugId || typeof slugId !== 'string') {
    return '';
  }

  // If it's just a number, return it
  if (/^\d+$/.test(slugId)) {
    return slugId;
  }

  // Extract ID from slug-id format
  const parts = slugId.split('-');
  const lastPart = parts[parts.length - 1];
  
  // Check if last part is a number
  if (/^\d+$/.test(lastPart)) {
    return lastPart;
  }

  // If no valid ID found, return the original string
  return slugId;
}

/**
 * Extract slug part from slug-id format
 * @param {string} slugId - Slug in format "slug-id"
 * @returns {string} Extracted slug part
 */
export function extractSlugFromSlugId(slugId) {
  if (!slugId || typeof slugId !== 'string') {
    return '';
  }

  // If it's just a number, return empty string
  if (/^\d+$/.test(slugId)) {
    return '';
  }

  // Extract slug part from slug-id format
  const parts = slugId.split('-');
  const lastPart = parts[parts.length - 1];
  
  // Check if last part is a number
  if (/^\d+$/.test(lastPart)) {
    // Return all parts except the last one (which is the ID)
    return parts.slice(0, -1).join('-');
  }

  // If no valid ID found, return the original string
  return slugId;
}

/**
 * Validate if a string is a valid slug-id format
 * @param {string} slugId - String to validate
 * @returns {boolean} True if valid slug-id format
 */
export function isValidSlugId(slugId) {
  if (!slugId || typeof slugId !== 'string') {
    return false;
  }

  // Just a number is valid
  if (/^\d+$/.test(slugId)) {
    return true;
  }

  // Check slug-id format
  const parts = slugId.split('-');
  if (parts.length < 2) {
    return false;
  }

  const lastPart = parts[parts.length - 1];
  return /^\d+$/.test(lastPart);
}

/**
 * Convert old news URLs to new slug URLs
 * @param {string} oldUrl - Old URL like "/news/123"
 * @param {string} title - News title for slug generation
 * @returns {string} New slug URL like "/haber/slug-123"
 */
export function migrateOldUrl(oldUrl, title) {
  if (!oldUrl) {
    return oldUrl;
  }

  // Extract ID from old URL format
  const idMatch = oldUrl.match(/\/news\/(\d+)/);
  if (!idMatch) {
    return oldUrl;
  }

  const id = idMatch[1];
  const slugId = createSlugId(title, id);
  
  return `/haber/${slugId}`;
}

/**
 * Generate SEO-friendly URL for news
 * @param {object} news - News object with id and title
 * @returns {string} SEO-friendly URL
 */
export function generateNewsUrl(news) {
  if (!news || !news.id) {
    return '/';
  }

  const slugId = createSlugId(news.title || news.headline, news.id);
  return `/haber/${slugId}`;
}

/**
 * Check if current URL is old format and redirect if needed
 * @param {string} currentPath - Current URL path
 * @param {function} navigate - React Router navigate function
 * @param {object} news - News object for slug generation
 */
export function handleUrlMigration(currentPath, navigate, news) {
  // Check if current path is old format (/news/123)
  const oldFormatMatch = currentPath.match(/^\/news\/(\d+)$/);
  
  if (oldFormatMatch && news && news.title) {
    const newUrl = generateNewsUrl(news);
    
    // Replace current URL without adding to history
    navigate(newUrl, { replace: true });
    return true;
  }

  return false;
}

// Export default object with all functions
export default {
  generateSlug,
  createSlugId,
  extractIdFromSlug,
  extractSlugFromSlugId,
  isValidSlugId,
  migrateOldUrl,
  generateNewsUrl,
  handleUrlMigration
};
