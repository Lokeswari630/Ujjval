# Smart Hospital Frontend

AI-Powered Healthcare Assistant - React + Vite + Tailwind CSS

## 🚀 Setup Complete

### Routing Note
- The app uses `HashRouter` to avoid 404 errors on browser refresh in static deployments.
- Route examples: `/#/auth`, `/#/doctor`, `/#/pharmacist/inventory`.

### ✅ What's Been Set Up:

1. **Tailwind CSS Configuration**
   - Custom color scheme (primary, secondary)
   - Component classes (btn-primary, btn-secondary, input-field, card)
   - Responsive design utilities

2. **Clean Folder Structure**
   ```
   src/
   ├── components/     # Reusable UI components
   ├── pages/         # Page components
   │   ├── Login.jsx  # Login page with role selection
   │   └── Dashboard.jsx # Main dashboard
   ├── utils/         # Utility functions
   └── hooks/         # Custom React hooks
   ```

3. **Basic Pages Implemented**
   - **Login Page**: Role-based login (Patient/Doctor/Pharmacist/Admin)
   - **Dashboard Page**: Stats grid, quick actions, recent activity

4. **React Router Setup**
   - Navigation between pages
   - Protected routes (to be implemented)
   - Clean URL structure

## 🎯 Features Ready to Build

### Current Pages:
- ✅ Login Page - Clean, responsive design
- ✅ Dashboard Page - Overview with stats and quick actions

### Next Pages to Add:
- Appointments booking
- Health prediction interface
- Pharmacy order tracking
- Doctor profiles
- Patient records

## 🛠️ Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🎨 Design System

### Colors:
- **Primary**: Blue theme (#3b82f6)
- **Secondary**: Gray theme (#64748b)
- **Success**: Green
- **Warning**: Orange
- **Error**: Red

### Components:
- `btn-primary`: Primary action buttons
- `btn-secondary`: Secondary action buttons
- `input-field`: Form inputs with focus states
- `card`: Content containers with shadows

## 📱 Responsive Design

- Mobile-first approach
- Tailwind responsive utilities
- Flexible grid layouts
- Touch-friendly interfaces

## 🔗 Backend Integration

Ready to connect to:
- Authentication API
- Appointments API
- Health Prediction API
- Pharmacy API
- NLP Query API

## 🚀 Next Steps

1. Add authentication context
2. Implement API integration
3. Add more pages
4. Add loading states
5. Add error handling
6. Add form validation

---

**Current Status**: ✅ Basic setup complete, ready for feature development!
