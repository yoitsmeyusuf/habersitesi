# Turkish News Website (Haber Sitesi)

**ALWAYS follow these instructions first** and only fallback to additional search and context gathering if the information here is incomplete or found to be in error.

This is a full-stack Turkish news website with React 19 frontend and ASP.NET Core backend. The application consists of a modern, SEO-optimized news portal with user authentication, admin panel, and content management.

## System Requirements & Installation

### Prerequisites
- Node.js 20+ (verified: v20.19.4)
- npm 10+ (verified: v10.8.2) 
- .NET 8 SDK (verified: v8.0.119)
- PostgreSQL (required for backend database)

### Essential Setup Commands
Run these commands **exactly in this order** for first-time setup:

```bash
# Install frontend dependencies - NEVER CANCEL this process
cd haber-sitesi-frontend && npm cache clean --force && rm -rf node_modules package-lock.json && npm install
# Time: ~60 seconds. Set timeout to 300+ seconds.

# Install backend dependencies  
cd ../habersitesi-backend && dotnet restore
# Time: ~20 seconds. Set timeout to 180+ seconds.

# Install EF Core tools globally (required for database operations)
dotnet tool install --global dotnet-ef

# Setup PostgreSQL and create database
sudo service postgresql start
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
sudo -u postgres createdb habersitesi

# Apply database migrations - NEVER CANCEL this process
dotnet ef database update
# Time: ~30 seconds. Set timeout to 180+ seconds.
```

## Build & Development

### Frontend (haber-sitesi-frontend/)
```bash
cd haber-sitesi-frontend

# Development server (auto-reloads on changes)
npm run dev
# Runs on: http://localhost:5173
# Time: Instant startup. NEVER CANCEL - runs continuously.

# Production build - NEVER CANCEL this process
npm run build:prod  
# Time: ~15 seconds. Set timeout to 120+ seconds.

# Linting (has warnings, not errors - this is normal)
npm run lint
# Expected: 7 warnings about fast refresh, 0 errors

# Bundle analysis
npm run build:analyze
```

### Backend (habersitesi-backend/)
```bash
cd habersitesi-backend

# Development server
dotnet run
# Runs on: http://localhost:5255
# Time: ~10 seconds startup. NEVER CANCEL - runs continuously.

# Production build - NEVER CANCEL this process  
dotnet build --configuration Release
# Time: ~7 seconds. Set timeout to 60+ seconds.

# Database operations
dotnet ef database update      # Apply migrations
dotnet ef migrations add <Name>  # Create new migration
```

## Configuration Requirements

### Database Configuration (CRITICAL)
The backend requires PostgreSQL with specific connection configuration:

1. **For appsettings.Development.json** (required for EF tools):
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=habersitesi;Username=postgres;Password=postgres;"
  }
}
```

2. **PostgreSQL must have password set**:
```bash
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
```

### Frontend CSP Configuration (CRITICAL)
The application has **different Content Security Policies for development vs production**:

- **Development**: Must allow `localhost:*` connections for API communication
- **Production**: Strict CSP blocking localhost for security

**For development testing**, temporarily modify `haber-sitesi-frontend/index.html`:
- Change `connect-src 'self' https:;` to `connect-src 'self' https: http://localhost:* ws://localhost:*;`
- Add `localhost:*` to `script-src` directive
- Revert these changes before production deployment

## Validation Scenarios

### MANDATORY End-to-End Testing
After any changes, **ALWAYS** run these complete validation scenarios:

1. **Full Application Startup**:
   ```bash
   # Terminal 1: Start backend
   cd habersitesi-backend && dotnet run
   
   # Terminal 2: Start frontend  
   cd haber-sitesi-frontend && npm run dev
   
   # Both servers MUST start without errors
   # Backend: http://localhost:5255 (no UI, API only)
   # Frontend: http://localhost:5173 (full website)
   ```

2. **Homepage Validation**:
   - Navigate to `http://localhost:5173`
   - Verify: Turkish news website loads with header, navigation, footer
   - Verify: No CSP errors in browser console (with dev CSP config)
   - Verify: Featured news content displays (or empty state if no data)

3. **User Authentication Flow**:
   - Click "Giriş yap" (Login) button
   - Verify: Login form loads at `/giris` route  
   - Verify: Form has username, password fields and Google OAuth button
   - Verify: Navigation breadcrumbs work correctly

4. **API Connectivity Test**:
   - Open browser developer tools
   - Check Network tab for API calls to `http://localhost:5255/api/*`
   - Verify: No CORS errors, no 500 errors (404s are OK if no data)

### Performance Expectations
- **Frontend build**: 15 seconds (NEVER CANCEL - Set 120+ second timeout)
- **Backend build**: 7 seconds (NEVER CANCEL - Set 60+ second timeout)  
- **Database migration**: 30 seconds (NEVER CANCEL - Set 180+ second timeout)
- **npm install**: 60 seconds (NEVER CANCEL - Set 300+ second timeout)

## Project Structure

### Frontend (`haber-sitesi-frontend/`)
- **Technology**: React 19 + Vite + Tailwind CSS
- **Key files**: `vite.config.js`, `package.json`, `index.html`
- **Important**: Has strict CSP configuration in `index.html`
- **Build output**: `dist/` directory

### Backend (`habersitesi-backend/`)  
- **Technology**: ASP.NET Core 8 + PostgreSQL + Entity Framework Core
- **Key files**: `Program.cs`, `*.csproj`, `appsettings.*.json`
- **Database**: Uses PostgreSQL with EF Core migrations
- **Architecture**: Controllers → Services → DbContext pattern

## Common Issues & Solutions

### Frontend Issues
1. **CSP blocking API calls**: Modify CSP in `index.html` for development (see Configuration section)
2. **npm install fails**: Run `npm cache clean --force && rm -rf node_modules package-lock.json && npm install`
3. **Build warnings**: ESLint warnings about fast refresh are normal, not errors

### Backend Issues  
1. **Connection string not found**: Ensure `appsettings.Development.json` has correct PostgreSQL connection
2. **Database connection fails**: Verify PostgreSQL is running and password is set
3. **EF tools not found**: Run `dotnet tool install --global dotnet-ef`

### Integration Issues
1. **API calls fail**: Check CSP configuration and ensure both servers running
2. **CORS errors**: Backend has CORS configured for `localhost:5173`
3. **Empty homepage**: Normal when database has no seed data

## Important Directories

### Frequently Modified Files
- `haber-sitesi-frontend/src/`: React components, pages, services
- `haber-sitesi-frontend/package.json`: Dependencies and scripts
- `habersitesi-backend/Controllers/`: API endpoints
- `habersitesi-backend/Program.cs`: Backend configuration
- `habersitesi-backend/appsettings.Development.json`: Database connection

### Build Artifacts (DO NOT COMMIT)
- `haber-sitesi-frontend/dist/`: Frontend build output
- `haber-sitesi-frontend/node_modules/`: npm dependencies  
- `habersitesi-backend/bin/`: .NET build output
- `habersitesi-backend/obj/`: .NET compilation cache

## Pre-Commit Validation

**ALWAYS** run before committing changes:
```bash
# Frontend validation
cd haber-sitesi-frontend
npm run lint                    # Should show warnings, no errors
npm run build:prod             # Must complete successfully

# Backend validation  
cd ../habersitesi-backend
dotnet build --configuration Release  # Must complete successfully

# Full integration test (run both servers and test manually)
```

## Architecture Notes

- **Monorepo**: Frontend and backend are separate but related projects
- **Database**: PostgreSQL with EF Core Code-First migrations
- **Authentication**: JWT + Google OAuth 2.0
- **Security**: Content Security Policy, CORS, rate limiting
- **Deployment**: Frontend builds to static files, backend is self-hosted ASP.NET Core

This application is a production-ready Turkish news website with comprehensive security, performance optimizations, and modern development practices.