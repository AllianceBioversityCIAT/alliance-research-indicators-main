# Admin Panel - React SSR

Admin panel with React and Server-Side Rendering (SSR) integrated in NestJS.

## 🚀 Quick Start

### Development

1. **Start both servers simultaneously:**
```bash
npm run dev
```
This starts both NestJS API and Vite dev server together.

**Alternative - Start servers separately:**

Vite dev server:
```bash
npm run dev:admin
```
This starts Vite in development mode at `http://localhost:5173`

NestJS server:
```bash
npm run start:dev
```

2. **Access the panel:**
- `http://localhost:{PORT}/admin`
- `http://localhost:{PORT}/admin/dashboard`
- `http://localhost:{PORT}/admin/users`
- `http://localhost:{PORT}/admin/settings`

### Production

1. **Build everything:**
```bash
npm run build
```
This automatically compiles both React and NestJS.

2. **Start in production:**
```bash
npm run start:prod
```

## 📁 File Structure

```
src/admin/
├── client/                      # React Code
│   ├── components/              # Reusable components
│   │   ├── Layout.tsx          # Main layout
│   │   ├── Sidebar.tsx         # Side navigation
│   │   ├── Header.tsx          # Header
│   │   └── StatsCard.tsx       # Statistics cards
│   ├── pages/                   # React Pages
│   │   ├── Dashboard.tsx       # Main dashboard
│   │   ├── Users.tsx           # User management
│   │   └── Settings.tsx        # Settings
│   ├── hooks/                   # Custom React Hooks
│   ├── utils/                   # Utilities
│   ├── styles/                  # CSS Styles
│   │   └── admin.css
│   ├── App.tsx                  # Root component
│   ├── entry-client.tsx         # Client entry point (hydration)
│   ├── entry-server.tsx         # Server entry point (SSR)
│   └── tsconfig.json            # TypeScript config for React
├── controllers/                 # NestJS Controllers
│   └── admin.controller.ts
├── services/                    # Services
│   ├── admin.service.ts
│   └── react-renderer.service.ts
├── guards/                      # Authentication guards
└── admin.module.ts
```

## 🎨 How SSR Works

### 1. Request Flow

```
User → /admin/dashboard
         ↓
    AdminController
         ↓
    AdminService (fetch data)
         ↓
    ReactRendererService
         ↓
    Render React on server
         ↓
    Send complete HTML to client
         ↓
    React hydrates on client
```

### 2. Controller Example

```typescript
@Get('dashboard')
async dashboard(@Req() req: Request, @Res() res: Response) {
  // 1. Get data from your services
  const stats = await this.adminService.getDashboardStats();

  // 2. Prepare initial data
  const initialData = { stats };

  // 3. Render React with SSR
  const html = await this.reactRenderer.render(req.url, initialData);

  // 4. Send complete HTML
  res.send(html);
}
```

### 3. React Component

```typescript
const Dashboard: React.FC<DashboardProps> = ({ initialData }) => {
  // initialData comes from server (SSR)
  const [stats, setStats] = useState(initialData?.stats || {});

  // You can load more data from client if needed
  useEffect(() => {
    // fetch more data...
  }, []);

  return (
    <div>
      <StatsCard value={stats.totalUsers} />
    </div>
  );
};
```

## 🔧 Add New Page

### 1. Create React component

```tsx
// src/admin/client/pages/MyPage.tsx
import React from 'react';

interface MyPageProps {
  initialData?: any;
}

const MyPage: React.FC<MyPageProps> = ({ initialData }) => {
  return (
    <div className="container-fluid">
      <h1>My Page</h1>
      {/* Your content */}
    </div>
  );
};

export default MyPage;
```

### 2. Add route in App.tsx

```tsx
import MyPage from './pages/MyPage';

// In App component:
<Routes>
  <Route path="/admin/my-page" element={<MyPage initialData={initialData} />} />
</Routes>
```

### 3. Create endpoint in Controller

```typescript
@Get('my-page')
async myPage(@Req() req: Request, @Res() res: Response) {
  // Get data from your service
  const data = await this.yourService.getData();

  const initialData = { data };
  const html = await this.reactRenderer.render(req.url, initialData);
  res.send(html);
}
```

### 4. Add to Sidebar

```tsx
// src/admin/client/components/Sidebar.tsx
<li>
  <Link to="/admin/my-page" className={isActive('/admin/my-page')}>
    <i className="fas fa-icon"></i>
    <span>My Page</span>
  </Link>
</li>
```

## 🔌 Using Backend Services

### Option 1: SSR (Recommended for initial data)

```typescript
// Controller
@Get('results')
async results(@Req() req: Request, @Res() res: Response) {
  // Inject your existing service
  const results = await this.resultService.findAll();

  const initialData = { results };
  const html = await this.reactRenderer.render(req.url, initialData);
  res.send(html);
}

// React Component
const Results: React.FC = ({ initialData }) => {
  const [results] = useState(initialData?.results || []);

  return (
    <table>
      {results.map(r => <tr key={r.id}>...</tr>)}
    </table>
  );
};
```

### Option 2: Client-Side Fetch

```typescript
// React Component
const Results: React.FC = () => {
  const [results, setResults] = useState([]);

  useEffect(() => {
    fetch('/api/results')
      .then(res => res.json())
      .then(data => setResults(data));
  }, []);

  return <table>...</table>;
};
```

### Option 3: Hybrid (Best performance)

```typescript
// SSR for initial load, then fetch to update
const Results: React.FC = ({ initialData }) => {
  const [results, setResults] = useState(initialData?.results || []);

  const refresh = () => {
    fetch('/api/results')
      .then(res => res.json())
      .then(data => setResults(data));
  };

  return (
    <>
      <button onClick={refresh}>Refresh</button>
      <table>...</table>
    </>
  );
};
```

## 🔐 Authentication

### Create Guard

```typescript
// src/admin/guards/admin.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    // Your authentication logic
    return true;
  }
}
```

### Use in Controller

```typescript
import { UseGuards } from '@nestjs/common';
import { AdminGuard } from '../guards/admin.guard';

@Controller('admin')
@UseGuards(AdminGuard)  // Protect all routes
export class AdminController {
  // ...
}
```

## 🎨 Styles and UI

### Custom CSS

Edit `src/admin/client/styles/admin.css`:

```css
:root {
  --primary-color: #your-color;
}

.custom-class {
  /* your styles */
}
```

### Use Tailwind CSS (Optional)

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init
```

### Use Material-UI (Optional)

```bash
npm install @mui/material @emotion/react @emotion/styled
```

## 📊 State Management

### Option 1: React Context (Simple)

```tsx
// Context for global state
const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  return (
    <AdminContext.Provider value={{ user, setUser }}>
      {children}
    </AdminContext.Provider>
  );
};
```

### Option 2: Zustand (Recommended)

```bash
npm install zustand
```

```tsx
import create from 'zustand';

const useStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
```

### Option 3: Redux Toolkit

```bash
npm install @reduxjs/toolkit react-redux
```

## 🧪 Testing

```bash
npm install -D @testing-library/react @testing-library/jest-dom
```

```tsx
// Dashboard.test.tsx
import { render, screen } from '@testing-library/react';
import Dashboard from './Dashboard';

test('renders dashboard', () => {
  render(<Dashboard initialData={{ stats: {} }} />);
  expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
});
```

## 🚀 Optimizations

### 1. Code Splitting

```tsx
import { lazy, Suspense } from 'react';

const Users = lazy(() => import('./pages/Users'));

<Suspense fallback={<div>Loading...</div>}>
  <Users />
</Suspense>
```

### 2. Memoization

```tsx
import { memo, useMemo, useCallback } from 'react';

const StatsCard = memo(({ title, value }) => {
  return <div>{value}</div>;
});
```

### 3. React Query (For data fetching)

```bash
npm install @tanstack/react-query
```

## 📝 Important Notes

- ✅ **Development**: Vite runs on `:5173`, NestJS uses SSR in development
- ✅ **Production**: Compiles React first, then NestJS
- ✅ **Hot Reload**: Works automatically in development
- ✅ **TypeScript**: Fully typed
- ✅ **SEO**: Server-side rendering

## 🔗 Useful URLs

- Admin Panel: `http://localhost:{PORT}/admin`
- Vite Dev Server: `http://localhost:5173`
- API Swagger: `http://localhost:{PORT}/swagger`

## 🛠️ Troubleshooting

### Problem: "Cannot find module react-router-dom/server"

Solution: The import is correct, it's a TypeScript warning. It will work at runtime.

### Problem: "Vite manifest not found"

Solution: Run `npm run build:admin` before production.

### Problem: Changes don't reflect

Solution:
1. Restart Vite: `npm run dev:admin`
2. Clear cache: `rm -rf node_modules/.vite`
