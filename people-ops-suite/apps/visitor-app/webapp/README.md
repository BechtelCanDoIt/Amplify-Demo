# WSO2 People Ops Suite - Visitor App (Web Application)

A comprehensive visitor management web application for managing visitor registrations, visits, employee interactions, and access control with role-based authentication.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Building for Production](#building-for-production)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [User Roles & Access Control](#user-roles--access-control)
- [Environment Setup](#environment-setup)
- [Available Scripts](#available-scripts)
- [Key Dependencies](#key-dependencies)
- [Development Guidelines](#development-guidelines)
- [Troubleshooting](#troubleshooting)

## Overview

The **Visitor App** is a full-featured React-based web application designed to streamline visitor management for organizations. It provides distinct interfaces for different user roles (Admin, Employee) and includes an external visitor registration portal. The application integrates with a Ballerina backend service and uses Asgardeo for secure authentication and authorization.

### Purpose

- **Visitor Management**: Register visitors, schedule visits, and track visit status
- **Check-in/Check-out**: QR code-based scanning system for visitor entry and exit
- **Admin Control**: Comprehensive administrative panel for monitoring active visits and historical data

## Features

### Authentication & Authorization

- **Asgardeo Integration**: Secure OAuth2/OIDC authentication
- **Role-Based Access Control**: Admin and Employee roles with different permissions
- **Session Management**: Automatic token refresh and idle timeout handling

### Visitor Management

- **Visitor Registration**: Capture visitor details, contact information, and purpose of visit
- **Visitor Profiles**: Store and retrieve visitor information by hashed NIC
- **Visit Scheduling**: Pre-schedule visits with host employee assignment
- **Visit Status Tracking**: Monitor visit lifecycle (Requested → Approved → Completed/Rejected)

### Visit Management

- **Create New Visits**: Employees can create visit requests for their guests
- **Visit Approval Workflow**: Admin approval for visit requests
- **Active Visits Monitoring**: Real-time view of ongoing visits
- **Visit History**: Complete audit trail with filtering and export capabilities
- **Invitation Management**: Generate and send visit invitations with QR codes

### QR Code System

- **QR Code Generation**: Automatic generation for approved visits
- **QR Scanner**: Mobile-optimized scanner for check-in/check-out
- **Quick Access**: Fast visitor verification and entry logging

### Admin Panel

- **Active Visits Dashboard**: Monitor all current visits in real-time
- **Visit History**: Comprehensive historical data with advanced filtering

### User Experience

- **Material-UI Design**: Modern, responsive, and accessible interface
- **Dark/Light Theme**: User-selectable theme with system preference detection
- **Notifications**: Toast notifications for user feedback (using Notistack)
- **Loading States**: Skeleton loaders and spinners for better UX
- **Error Handling**: Comprehensive error boundaries and user-friendly error messages

---

## Tech Stack

### Core Framework

- **React 18.2.0**: Component-based UI library
- **TypeScript 4.9.3**: Type-safe JavaScript superset
- **React Router DOM 6.4.5**: Client-side routing

### UI & Styling

- **Material-UI (MUI) 5.10+**: Component library and design system
  - `@mui/material`: Core components
  - `@mui/icons-material`: Icon library
  - `@mui/x-data-grid`: Advanced data tables
  - `@mui/x-date-pickers`: Date/time pickers
- **Emotion**: CSS-in-JS styling
- **SASS**: CSS preprocessor for custom styles

### State Management

- **Redux Toolkit 1.9.1**: Centralized state management
- **React Redux 8.0.5**: React bindings for Redux
- **Redux Thunk**: Async action handling

### Authentication

- **@asgardeo/auth-react 5.1.2**: Asgardeo authentication SDK

### HTTP & API

- **Axios 1.2.1**: HTTP client with interceptors
- **retry-axios 3.1.3**: Automatic retry mechanism for failed requests

### Forms & Validation

- **Formik 2.4.6**: Form management
- **Yup 0.32.11**: Schema validation

### Rich Content

- **Editor.js 2.26.5**: Block-style rich text editor with plugins
- **React Quill 2.0.0**: Alternative WYSIWYG editor
- **Draft.js 0.11.7**: Rich text framework
- **markdown-preview**: Markdown rendering

### QR Code & Scanning

- **qrcode 1.5.4**: QR code generation
- **html5-qrcode 2.3.8**: Camera-based QR scanning

### Utilities

- **Day.js 1.11.15**: Date manipulation
- **Lodash 4.17.21**: Utility functions
- **google-libphonenumber 3.2.42**: Phone number validation
- **sanitize-html 2.10.0**: HTML sanitization
- **export-from-json 1.7.2**: Data export functionality
- **uuid 13.0.0**: Unique ID generation
- **react-idle-timer 5.5.2**: Idle session detection

### Build Tools

- **react-scripts 5.0.1**: Create React App scripts
- **react-app-rewired 2.2.1**: Override CRA config without ejecting
- **autoprefixer 10.4.13**: CSS vendor prefixes

### Development Tools

- **TypeScript**: Static type checking
- **ESLint**: Code linting
- **source-map-explorer 2.5.3**: Bundle size analysis

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v16.x or higher (recommended: v18.x)
- **npm**: v8.x or higher (comes with Node.js)
- **Git**: For version control
- **Modern Web Browser**: Chrome, Firefox, Safari, or Edge
- **Backend Service**: The Visitor App Backend (Ballerina service) must be running
- **Asgardeo Account**: For authentication configuration

---

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd people-ops-suite/apps/visitor-app/webapp
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages listed in `package.json`.

---

## Configuration

### 1. Environment Configuration

The application uses runtime configuration via `public/config.js`. Create or modify this file based on your environment:

**Development Configuration** (`public/config.js`):

```javascript
window.config = {
  APP_NAME: "Visitor App - Development",

  // Backend API Base URL
  REACT_APP_BACKEND_BASE_URL: "http://localhost:9090",

  // Asgardeo Authentication Configuration
  ASGARDEO_BASE_URL: "https://api.asgardeo.io/t/your-org",
  ASGARDEO_CLIENT_ID: "your-client-id",

  // OAuth Redirect URLs
  AUTH_SIGN_IN_REDIRECT_URL: "http://localhost:3000",
  AUTH_SIGN_OUT_REDIRECT_URL: "http://localhost:3000",
};
```

**Production Configuration**:

```javascript
window.config = {
  APP_NAME: "Visitor App",
  REACT_APP_BACKEND_BASE_URL: "https://api.yourcompany.com/visitor-app/v1.0",
  ASGARDEO_BASE_URL: "https://api.asgardeo.io/t/your-org",
  ASGARDEO_CLIENT_ID: "your-prod-client-id",
  AUTH_SIGN_IN_REDIRECT_URL: "https://visitor.yourcompany.com",
  AUTH_SIGN_OUT_REDIRECT_URL: "https://visitor.yourcompany.com",
};
```

### 2. Backend Configuration

Ensure the backend service is running and accessible. The backend endpoints are defined in `src/config/config.ts`:

- `/user-info` - User authentication and profile
- `/app-config` - Application configuration
- `/visitors` - Visitor CRUD operations
- `/visits` - Visit management
- `/invitations` - Invitation handling
- `/employees` - Employee information

### 3. Asgardeo Setup

1. Create an application in Asgardeo
2. Configure OAuth2 settings:
   - **Grant Types**: Authorization Code, Refresh Token
   - **Callback URLs**: Your app URLs (e.g., `http://localhost:3000`)
   - **Allowed Origins**: Your app domain
   - **Scopes**: `openid`, `email`, `groups`
3. Configure user groups/roles:
   - Create `Admin` and `Employee` groups
   - Assign appropriate users to each group

### 4. Path Aliases

The application uses custom path aliases configured in `config-overrides.js`:

```javascript
@src       → src/
@app       → src/app/
@assets    → src/assets/
@component → src/component/
@config    → src/config/
@context   → src/context/
@layout    → src/layout/
@slices    → src/slices/
@view      → src/view/
@utils     → src/utils/
@/types    → src/types/
```

---

## Running the Application

### Development Mode

Start the development server with hot reload:

```bash
npm start
```

The app will open at: **http://localhost:3000**

- Hot reloading enabled
- Source maps for debugging
- React DevTools compatible
- Redux DevTools integration

## Building for Production

### Create Production Build

```bash
npm run build
```

This creates an optimized build in the `build/` directory:

- Minified and bundled JavaScript
- Optimized CSS
- Compressed assets
- Source maps for debugging
- Production React build

### Analyze Bundle Size

```bash
npm run analyze
```

This opens an interactive treemap visualization of bundle contents to help optimize bundle size.

### Serve Production Build Locally

```bash
npx serve -s build
```

---

## Project Structure

```
webapp/
│
├── public/                          # Static files
│   ├── index.html                   # HTML template
│   ├── config.js                    # Runtime configuration
│   ├── config.js.local             # Local config template
│   └── doc/                         # Documentation assets
│
├── src/
│   ├── App.tsx                      # Root application component
│   ├── App.scss                     # Global styles
│   ├── index.tsx                    # Application entry point
│   ├── route.ts                     # Route definitions with role-based access
│   ├── theme.ts                     # MUI theme configuration
│   │
│   ├── app/
│   │   └── AppHandler.tsx           # Main app logic and routing
│   │
│   ├── assets/
│   │   ├── fonts/                   # Custom fonts
│   │   └── images/                  # Images and icons
│   │
│   ├── component/
│   │   ├── common/                  # Reusable components
│   │   │   ├── BackgroundLoader.tsx
│   │   │   ├── ErrorHandler.tsx
│   │   │   └── PreLoader.tsx
│   │   ├── layout/                  # Layout components
│   │   │   └── LinkItem.tsx
│   │   ├── panel/                   # Panel components
│   │   │   └── PanelHeader.tsx
│   │   └── ui/                      # UI components
│   │       ├── StateWithImage.tsx
│   │       └── StatusWithAction.tsx
│   │
│   ├── config/
│   │   ├── config.ts                # App configuration
│   │   ├── constant.ts              # Constants and messages
│   │   └── ui.ts                    # UI constants
│   │
│   ├── context/
│   │   ├── AuthContext.tsx          # Authentication context
│   │   └── DialogContext.tsx        # Dialog/modal context
│   │
│   ├── layout/
│   │   ├── Layout.tsx               # Main layout wrapper
│   │   ├── header/                  # Header component
│   │   ├── sidebar/                 # Sidebar navigation
│   │   └── pages/                   # Layout pages
│   │       ├── 404.tsx              # Not found page
│   │       ├── CommonPage.tsx       # Common page template
│   │       └── Maintenance.tsx      # Maintenance page
│   │
│   ├── slices/                      # Redux slices
│   │   ├── store.ts                 # Redux store configuration
│   │   ├── authSlice/               # Authentication state
│   │   ├── commonSlice/             # Common app state
│   │   ├── configSlice/             # Configuration state
│   │   ├── employeeSlice/           # Employee data
│   │   ├── invitationSlice/         # Invitation management
│   │   ├── userSlice/               # User profile
│   │   ├── visitorSlice/            # Visitor data
│   │   └── visitSlice/              # Visit management
│   │
│   ├── types/
│   │   ├── types.tsx                # TypeScript type definitions
│   │   └── qrcode.d.ts              # QR code type declarations
│   │
│   ├── utils/
│   │   ├── apiService.ts            # Axios instance and interceptors
│   │   ├── utils.ts                 # Utility functions
│   │   └── types.ts                 # Utility types
│   │
│   └── view/                        # Feature views
│       ├── index.tsx                # View exports
│       │
│       ├── admin/                   # Admin panel
│       │   ├── admin.tsx            # Admin main view
│       │   ├── scan.tsx             # Admin scan view
│       │   └── panel/               # Admin panels
│       │       ├── activeVisits.tsx
│       │       └── visitHistory.tsx
│       │
│       ├── employee/                # Employee view
│       │   ├── employee.tsx         # Employee main view
│       │   ├── component/           # Employee components
│       │   └── panel/               # Employee panels
│       │       ├── createVisit.tsx
│       │       └── visitHistory.tsx
│       │
│       ├── external/                # External portal
│       │   └── visitorRegisterCard.tsx
│       │
│       ├── help/                    # Help section
│       │   └── help.tsx
│       │
│       └── scanner/                 # QR Scanner
│           ├── scanner.tsx          # Scanner main view
│           └── panel/
│               └── scanVisit.tsx    # QR scanning logic
│
├── config-overrides.js              # Webpack config overrides
├── tsconfig.json                    # TypeScript configuration
├── tsconfig.paths.json              # TS path mappings
├── package.json                     # Dependencies and scripts
└── README.md                        # This file
```

---

## Architecture

### Application Flow

```
┌─────────────────────┐
│   index.tsx         │  Application Entry Point
│   (Renders App)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│      App.tsx        │  Root Component
│  - Theme Provider   │  - Manages theme (light/dark)
│  - Redux Provider   │  - Provides Redux store
│  - Auth Provider    │  - Asgardeo authentication
│  - Snackbar         │  - Notification system
└──────────┬──────────┘
           │
           ├──────────────────────────┐
           │                          │
           ▼                          ▼
┌──────────────────┐      ┌────────────────────┐
│  AppHandler      │      │  External Portal   │
│  (Authenticated) │      │  (Public Access)   │
│  - Layout        │      │  - Visitor         │
│  - Routing       │      │    Registration    │
│  - Role Check    │      └────────────────────┘
└────────┬─────────┘
         │
         ├─────────────────┬──────────────────┐
         ▼                 ▼                  ▼
   ┌──────────┐     ┌───────────┐     ┌──────────┐
   │ Employee │     │   Admin   │     │ Scanner  │
   │   View   │     │   Panel   │     │   View   │
   └──────────┘     └───────────┘     └──────────┘
```

### State Management (Redux)

The application uses Redux Toolkit for state management with the following slices:

1. **authSlice**: User authentication status, roles, and privileges
2. **userSlice**: Current user profile and preferences
3. **configSlice**: Application configuration
4. **visitorSlice**: Visitor data and operations
5. **visitSlice**: Visit management and status
6. **invitationSlice**: Invitation handling
7. **employeeSlice**: Employee information
8. **commonSlice**: Shared app state (loading, errors, etc.)

### API Service Architecture

```
Component
    ↓
Redux Thunk Action
    ↓
apiService.ts (Axios Instance)
    ↓ (Interceptors)
    ├─ Request: Add auth token
    ├─ Response: Handle success
    └─ Error: Retry, refresh token, or logout
    ↓
Backend API (Ballerina)
```

### Authentication Flow

```
1. User visits app
2. Redirect to Asgardeo login
3. User authenticates
4. OAuth callback with code
5. Exchange code for access token
6. Store token in session
7. Fetch user info and roles
8. Route to appropriate view based on role
9. Token auto-refresh on expiry
10. Session timeout after idle period
```

---

## User Roles & Access Control

### Role Definitions

The application supports two primary roles defined in `src/slices/authSlice/auth.ts`:

#### 1. **ADMIN**

- Full system access
- Permissions:
  - View all active visits
  - Access visit history for all employees
  - Approve/reject visit requests
  - Scan QR codes for check-in/check-out
  - Access admin panel
  - View employee information
  - Generate reports and analytics

#### 2. **EMPLOYEE**

- Standard user access
- Permissions:
  - Create visit requests for guests
  - View own visit history
  - Manage own invitations
  - Access help documentation

### Route Protection

Routes are protected using the `allowRoles` property in `src/route.ts`:

```typescript
{
  path: "/admin-panel",
  text: "Admin Panel",
  icon: <AdminPanelSettingsOutlinedIcon />,
  element: <View.admin />,
  allowRoles: [Role.ADMIN],  // Only admins can access
}
```

### Public Routes

- `/external` - Visitor registration (no authentication required)

---

## Environment Setup

### Local Development

1. **Backend**: Run the Ballerina backend service locally

   ```bash
   cd ../backend
   bal run
   ```

2. **Frontend**: Start the React development server

   ```bash
   npm start
   ```

3. **Access**:
   - Internal App: http://localhost:3000
   - Backend API: http://localhost:9090

### Staging/Production

1. Build the application:

   ```bash
   npm run build
   ```

2. Deploy the `build/` directory to your web server or CDN

3. Update `public/config.js` with production values

4. Ensure backend is deployed and accessible

5. Configure Asgardeo with production URLs

---

## Available Scripts

| Command           | Description                                  |
| ----------------- | -------------------------------------------- |
| `npm start`       | Start development server on port 3000        |
| `npm run build`   | Create production build                      |
| `npm test`        | Run test suite                               |
| `npm run eject`   | Eject from Create React App (irreversible)   |
| `npm run analyze` | Analyze bundle size with source-map-explorer |

---

## Key Dependencies

### Production Dependencies

| Package                | Version | Purpose                 |
| ---------------------- | ------- | ----------------------- |
| `react`                | 18.2.0  | Core React library      |
| `@mui/material`        | 5.10.17 | Material-UI components  |
| `@reduxjs/toolkit`     | 1.9.1   | Redux state management  |
| `@asgardeo/auth-react` | 5.1.2   | Asgardeo authentication |
| `axios`                | 1.2.1   | HTTP client             |
| `react-router-dom`     | 6.4.5   | Routing                 |
| `formik`               | 2.4.6   | Form management         |
| `yup`                  | 0.32.11 | Validation schemas      |
| `dayjs`                | 1.11.15 | Date manipulation       |
| `qrcode`               | 1.5.4   | QR code generation      |
| `html5-qrcode`         | 2.3.8   | QR scanning             |
| `notistack`            | 2.0.8   | Notifications           |

### Development Dependencies

| Package             | Version | Purpose                     |
| ------------------- | ------- | --------------------------- |
| `typescript`        | 4.9.3   | Type checking               |
| `react-app-rewired` | 2.2.1   | Customize CRA config        |
| `@types/*`          | Various | TypeScript type definitions |

---

## Development Guidelines

### Code Style

- **TypeScript**: Use strict mode with explicit types
- **Components**: Functional components with hooks
- **Naming**: PascalCase for components, camelCase for functions
- **File Structure**: One component per file
- **Imports**: Use path aliases (`@src`, `@component`, etc.)

### State Management

- Use Redux for global state
- Use local `useState` for component-specific state
- Use `useContext` for theme and auth context
- Follow Redux Toolkit best practices

### API Calls

- All API calls through `apiService.ts`
- Use Redux Thunk for async actions
- Handle loading, success, and error states
- Implement retry logic for transient failures

### Theming

- Use MUI theme tokens for colors and spacing
- Support both light and dark themes
- Persist theme preference in localStorage
- Respect system theme preference

### Best Practices

- **Error Handling**: Use try-catch blocks and error boundaries
- **Loading States**: Show loaders for async operations
- **Validation**: Validate all user inputs with Yup schemas
- **Accessibility**: Follow WCAG guidelines
- **Performance**: Lazy load routes and heavy components
- **Security**: Sanitize HTML, validate tokens, secure API calls

---

## Troubleshooting

### Common Issues

#### 1. **Application Won't Start**

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm start
```

#### 2. **Authentication Fails**

- Check Asgardeo configuration in `public/config.js`
- Verify client ID and base URL are correct
- Ensure redirect URLs match Asgardeo app settings
- Clear browser cookies and localStorage

#### 3. **API Calls Fail**

- Verify backend is running and accessible
- Check `REACT_APP_BACKEND_BASE_URL` in config
- Open browser DevTools Network tab to inspect requests
- Check backend logs for errors

#### 4. **Build Errors**

```bash
# Check TypeScript errors
npx tsc --noEmit

# Fix linting issues
npm run lint --fix
```

#### 5. **Theme Issues**

- Clear localStorage: `localStorage.clear()`
- Check browser console for theme errors
- Verify MUI theme configuration in `src/theme.ts`

#### 6. **Path Alias Errors**

- Ensure `tsconfig.paths.json` is properly configured
- Verify `config-overrides.js` has correct path mappings
- Restart development server after config changes
