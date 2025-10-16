# Admin Panel - Development and Deployment Guide

## Project Structure

```
src/admin/
├── client/              # React Frontend
│   ├── components/      # Reusable components
│   ├── pages/          # Admin pages
│   ├── styles/         # Custom CSS
│   ├── App.tsx         # Main component
│   ├── entry-client.tsx # Client entry point
│   └── entry-server.tsx # SSR entry point
├── controllers/        # NestJS Controllers
├── services/          # Business services
└── admin.module.ts    # NestJS Module
```

## Local Development

### Option 1: Full Development Mode (Recommended)

Start both servers simultaneously with Hot Module Replacement:

```bash
npm run dev
```

This runs:
- **NestJS API** at `http://localhost:3001`
- **Vite Dev Server** at `http://localhost:5173` (invisible to the user)

**Access admin at:** `http://localhost:3001/admin`

**Benefits:**
- ✅ Hot Module Replacement (instant React changes)
- ✅ Frontend changes reflect without reload
- ✅ Better development experience
- ✅ Full source maps for debugging

### Option 2: Backend Only (Quick Testing)

If you only need to test the backend without working on the frontend:

```bash
# 1. Build assets once
npm run build:admin

# 2. Start only the backend
npm run start:dev
```

**Note:** If NestJS restarts, it may delete `dist`, so you would need to rebuild the assets.

## Production Deployment

### Step 1: Build Everything

```bash
npm run build
```

This command automatically executes:
1. `npm run build:admin` - Compiles React with Vite
2. `nest build` - Compiles NestJS backend

### Step 2: Verify Build Output

Compiled files will be in:
```
dist/
├── admin/
│   └── public/
│       ├── .vite/
│       │   └── manifest.json  # Assets manifest
│       └── assets/
│           ├── entry-client.[hash].js
│           └── entry-client.[hash].css
├── main.js
└── ... (other backend files)
```

### Step 3: Configure Environment Variables

Make sure to set:

```bash
NODE_ENV=production
ARI_PORT=3001
# ... other required variables
```

### Step 4: Start in Production

```bash
npm run start:prod
```

Or directly:
```bash
NODE_ENV=production node dist/main.js
```

## How It Works

### In Development (`npm run dev`):

1. User accesses `http://localhost:3001/admin`
2. NestJS renders base HTML with SSR
3. HTML includes references to `http://localhost:5173` (Vite dev server)
4. React loads and hydrates from Vite
5. Code changes update instantly (HMR)

### In Production:

1. User accesses `http://your-domain.com/admin`
2. NestJS renders base HTML with SSR
3. HTML includes references to `/admin/public/assets/[hash].js|css`
4. Assets are served from NestJS as static files
5. React loads and hydrates normally

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development with NestJS + Vite |
| `npm run dev:admin` | Vite dev server only |
| `npm run start:dev` | NestJS server in development mode only |
| `npm run build:admin` | Build admin panel assets |
| `npm run build` | Build everything (admin + backend) |
| `npm run build:prod` | Alias for `npm run build` |
| `npm run start:prod` | Start in production mode |

## Admin Panel Routes

- `/admin` - Main dashboard
- `/admin/dashboard` - Dashboard (alias)
- `/admin/users` - User management
- `/admin/settings` - Settings

## Important Notes

### Authentication

Admin panel routes are **excluded from JWT middleware**. If you need to add authentication to the admin:

1. Edit `src/app.module.ts`
2. Remove or modify the exclusion of `/admin(.*)`
3. Implement your authentication logic in `AdminController`

### Content Security Policy (CSP)

CSP is configured in `src/main.ts` to allow:
- Vite dev server scripts (`localhost:5173`)
- Bootstrap and Font Awesome CDNs
- WebSocket for HMR

In production, you can make CSP stricter by removing `localhost:5173` references.

### SSR (Server-Side Rendering)

The admin panel uses SSR for:
- Better SEO (if needed)
- Faster initial load
- Initial data in HTML

Do not import CSS files directly in components used by SSR (like `App.tsx`). Instead, import them in `entry-client.tsx`.

## Troubleshooting

### Styles Not Loading

**Problem:** Page displays without styles (plain text)

**Solution:**
```bash
# 1. Rebuild assets
npm run build:admin

# 2. Restart server
# (stop with Ctrl+C and restart)
npm run start:dev
```

### Error "Cannot find module './styles/admin.css'"

**Problem:** Attempting to import CSS in a file used by SSR

**Solution:** Only import CSS in `entry-client.tsx`, not in components.

### Vite Connection Refused (ERR_CONNECTION_REFUSED)

**Problem:** Vite server is not running

**Solution:** Use `npm run dev` instead of just `npm run start:dev`

## Architecture Summary

### Development Flow
```
User Browser
    ↓
http://localhost:3001/admin (NestJS serves HTML)
    ↓
HTML includes: <script src="http://localhost:5173/...">
    ↓
Browser loads JS/CSS from Vite Dev Server
    ↓
React hydrates with HMR enabled
```

### Production Flow
```
User Browser
    ↓
http://your-domain.com/admin (NestJS serves HTML)
    ↓
HTML includes: <script src="/admin/public/assets/[hash].js">
    ↓
NestJS serves compiled static assets
    ↓
React hydrates normally
```

### Key Points

1. **Single URL for Users**: Users always access `http://localhost:3001/admin` (or production domain)
2. **Asset Loading**:
   - Development: Assets load from Vite (`localhost:5173`) for HMR
   - Production: Assets load from NestJS static files
3. **SSR Enabled**: Initial HTML is server-rendered for faster load
4. **Automatic Detection**: `ReactRendererService` automatically detects if manifest exists and serves accordingly

## Deployment Checklist

- [ ] Run `npm run build` to compile everything
- [ ] Verify `dist/admin/public/.vite/manifest.json` exists
- [ ] Set `NODE_ENV=production` in production environment
- [ ] Configure all required environment variables
- [ ] Copy entire `dist/` folder to production server
- [ ] Run `npm run start:prod` or `node dist/main.js`
- [ ] Access `/admin` route to verify functionality

## Future Enhancements

- [ ] Add authentication to admin panel
- [ ] Implement roles and permissions
- [ ] Add more pages (analytics, logs, etc.)
- [ ] Implement REST API for admin
- [ ] Add E2E tests for admin panel
