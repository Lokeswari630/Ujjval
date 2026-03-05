# AI-Powered Smart Hospital Assistant

Production-ready full-stack healthcare platform with AI risk prediction, NLP assistant, pharmacy queue automation, role-based dashboards, and remote monitoring.

## Tech Stack
- Frontend: React (Vite) + Tailwind CSS + Recharts
- Backend: Node.js + Express + MongoDB (Mongoose)
- Auth: JWT + bcrypt
- AI/NLP: Node.js services (`compromise` + rule-based AI)
- Voice: Web Speech API (STT) + Browser Speech Synthesis (TTS)

## Project Structure
- `frontend/` React app
- `server/` Express API
- `server/services/` AI + NLP modules

## 1) Backend Setup (Express + MongoDB + APIs)
1. Open terminal in `server/`
2. Install dependencies:
   - `npm install`
3. Create env file:
   - Copy `server/.env.example` to `server/.env`
4. Start MongoDB locally (or use Atlas)
5. Run backend:
   - `npm run dev`
6. Health check:
   - `GET http://localhost:5000/health`

## 2) NLP + AI Logic
Implemented modules:
- AI Health Risk Prediction: `server/services/aiHealthPredictor.js`
- NLP intent/entity processing: `server/services/nlpHealthService.js`
- NLP query execution: `server/routes/nlp-query.js`
- AI medical report explanation: `server/services/medicalReportExplainer.js` + `POST /api/health-prediction/explain-report`

## 3) Frontend Setup (React + Vite + Tailwind)
1. Open terminal in `frontend/`
2. Install dependencies:
   - `npm install`
3. Create env file:
   - Copy `frontend/.env.example` to `frontend/.env`
4. Start frontend:
   - `npm run dev`
5. Open `http://localhost:5173`

## 4) Feature-Wise Implementation Coverage
### Authentication + RBAC
- Register/Login for `patient`, `doctor`, `pharmacist`, `admin`
- JWT auth with protected routes
- Role-based dashboards (`/patient`, `/doctor`, `/pharmacist`, `/admin`)

### Core Features
- AI risk prediction + persistence
- Smart appointment booking + prioritization
- Doctor queue/prescription support
- Pharmacy queue with status tracking
- NLP query assistant (chat style UI)
- Voice assistant (mic input + TTS output)
- Medical report explanation
- Remote patient monitoring (BP/sugar/heart rate trends + alerts)
- Mock payment confirmation before appointment confirmation

## 5) Integration Notes
- Frontend API base URL is configurable via `VITE_API_BASE_URL`
- Default local API: `http://localhost:5000/api`
- CORS is configured in `server/server.js`

## 6) Final Run Instructions
Use two terminals:
- Terminal 1:
  - `cd server`
  - `npm run dev`
- Terminal 2:
  - `cd frontend`
  - `npm run dev`

### Demo login users (frontend mock fallback)
- `patient@example.com`
- `doctor@example.com`
- `pharmacist@example.com`
- `admin@example.com`
- Password for all: `password123`

## Key New/Updated APIs
- `POST /api/appointments/:id/payment/initiate`
- `POST /api/appointments/:id/payment/confirm`
- `POST /api/health-prediction/explain-report`
- `POST /api/monitoring/readings`
- `GET /api/monitoring/trends`
- `GET /api/monitoring/alerts`

## Sample Data
- `server/sample-data/sample-users.json`
- `server/sample-data/sample-vitals.json`

## Security Practices Included
- JWT verification middleware
- Password hashing (bcrypt)
- Helmet + rate limiting + CORS restriction
- Input validation and centralized error handling
