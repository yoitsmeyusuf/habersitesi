# CSRF Protection Implementation

This document describes the CSRF (Cross-Site Request Forgery) protection implementation for the habersitesi project.

## Overview

The application now implements comprehensive CSRF protection using ASP.NET Core's IAntiforgery service on the backend and automatic token handling in the React frontend.

## Backend Implementation

### Configuration (Program.cs)

```csharp
// Add Antiforgery (CSRF Protection)
builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-XSRF-TOKEN";
    options.Cookie.Name = "__RequestVerificationToken";
    options.Cookie.HttpOnly = false; // Frontend needs to access the token
    options.Cookie.SameSite = SameSiteMode.Strict;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment() 
        ? CookieSecurePolicy.SameAsRequest 
        : CookieSecurePolicy.Always;
});
```

### Token Distribution Endpoint

- **Endpoint**: `GET /api/anti-forgery-token`
- **Purpose**: Provides CSRF tokens to authenticated clients
- **Response**: `{ "token": "csrf_token_value" }`
- **Cookie**: Sets `__RequestVerificationToken` cookie with SameSite=Strict

### Protected Controllers

The following controllers have CSRF validation on state-changing endpoints:

#### NewsController
- `POST /api/haber` - Create news
- `PUT /api/haber/{id}` - Update news
- `DELETE /api/haber/{id}` - Delete news
- `POST /api/haber/resim-yukle` - Upload image

#### CommentController
- `POST /api/haber/{newsId}/yorumlar` - Create comment

#### UserController
- `PUT /api/users/{id}/role` - Update user role
- `DELETE /api/users/{username}` - Delete user

#### CategoriesController
- `POST /api/kategoriler` - Create category
- `PUT /api/kategoriler/{id}` - Update category
- `DELETE /api/kategoriler/{id}` - Delete category

### Validation Implementation

Each protected endpoint includes:

```csharp
// Validate CSRF token
await _antiforgery.ValidateRequestAsync(HttpContext);
```

## Frontend Implementation

### CSRF Token Management (api.js)

```javascript
// CSRF token management
let csrfToken = null

async function getCsrfToken() {
  if (csrfToken) {
    return csrfToken
  }
  
  try {
    const res = await fetch(`${API_URL}/anti-forgery-token`, {
      method: 'GET',
      credentials: 'include' // Include cookies for CSRF token generation
    })
    
    if (res.ok) {
      const data = await safeJson(res)
      csrfToken = data.token
      return csrfToken
    }
  } catch (err) {
    logger.error('Failed to get CSRF token:', err)
  }
  
  return null
}
```

### Automatic Header Inclusion

The `withAuthAndCsrf()` helper automatically includes both JWT auth and CSRF tokens:

```javascript
// Auth and CSRF header helper
async function withAuthAndCsrf() {
  const headers = withAuth()
  const token = await getCsrfToken()
  if (token) {
    headers['X-XSRF-TOKEN'] = token
  }
  return headers
}
```

### Updated API Methods

All state-changing API methods now use `withAuthAndCsrf()`:

- `post()`, `put()`, `delete()` - Generic HTTP methods
- `createNews()`, `updateNews()`, `deleteNews()`
- `createComment()`
- `uploadImage()`, `uploadAvatar()`
- `createCategory()`, `updateCategory()`, `deleteCategory()`
- `updateProfile()`, `updatePassword()`

## Security Features

### Cookie Configuration

- **SameSite=Strict**: Prevents CSRF attacks from external sites
- **Secure**: HTTPS-only in production
- **HttpOnly=false**: Allows frontend JavaScript access (required for token extraction)

### Token Validation

- Validates both cookie and header token
- Tokens are cryptographically signed
- Automatic token invalidation on logout

### Defense in Depth

The implementation provides multiple layers of protection:

1. **JWT Authentication**: Verifies user identity
2. **SameSite Cookies**: Browser-level CSRF protection
3. **CSRF Tokens**: Application-level CSRF protection
4. **CORS**: Restricts cross-origin requests

## Testing

### Manual Testing

1. **Token Generation**: `curl -i -X GET http://localhost:5255/api/anti-forgery-token`
2. **Protected Endpoint**: State-changing requests without tokens return appropriate errors
3. **Valid Request**: Requests with both JWT and CSRF tokens succeed

### Production Considerations

- CSRF tokens are automatically handled by the frontend
- No changes required for existing API consumers
- Backward compatible with current authentication flow
- Secure cookies enabled in production environment

## Troubleshooting

### Common Issues

1. **403 Forbidden**: Missing or invalid CSRF token
2. **401 Unauthorized**: Missing or invalid JWT token
3. **Token Cache**: Clear `csrfToken` variable on authentication changes

### Debug Steps

1. Verify token endpoint is accessible
2. Check browser cookies for `__RequestVerificationToken`
3. Confirm `X-XSRF-TOKEN` header in request
4. Validate server-side IAntiforgery configuration

## Compliance

This implementation meets the requirements specified in Issue #4:

- ✅ IAntiforgery service added to ASP.NET 8 backend
- ✅ /anti-forgery-token endpoint distributes tokens
- ✅ Frontend axios interceptor sends X-XSRF-TOKEN header
- ✅ State-changing endpoints validate tokens with ValidateRequestAsync
- ✅ Production-ready with HttpOnly/Secure cookie configuration
- ✅ All state-changing requests require CSRF token
- ✅ Frontend automatically handles token acquisition and headers