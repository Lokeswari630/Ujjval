# AI-Powered Smart Hospital Assistant - Backend

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (running locally or cloud instance)
- Git

### Installation

1. **Clone and navigate to server directory**
```bash
cd server
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` file with your configuration:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/smart_hospital

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_in_production_12345
JWT_EXPIRE=7d

# CORS Configuration
FRONTEND_URL=http://localhost:3000
FRONTEND_URLS=http://localhost:3000,http://localhost:5173,http://localhost:5174

# External AI for health prediction recommendations (optional)
HEALTH_AI_API_URL=https://api.openai.com/v1/chat/completions
HEALTH_AI_MODEL=gpt-4o-mini
HEALTH_AI_API_KEY=
OPENAI_API_KEY=
HEALTH_AI_TIMEOUT_MS=12000
```

4. **Start MongoDB**
- Make sure MongoDB is running on your system
- Default connection: `mongodb://localhost:27017/smart_hospital`

5. **Start the server**
```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start
```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/password` - Update password
- `GET /api/auth/logout` - Logout

### Users
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get single user
- `PUT /api/users/:id` - Update user (Admin only)
- `DELETE /api/users/:id` - Deactivate user (Admin only)
- `PATCH /api/users/:id/status` - Activate/Deactivate user (Admin only)
- `GET /api/users/stats/overview` - User statistics (Admin only)

### Doctors
- `GET /api/doctors` - Get all doctors (Public)
- `GET /api/doctors/:id` - Get single doctor (Public)
- `POST /api/doctors` - Create doctor profile (Doctor only)
- `PUT /api/doctors/:id` - Update doctor profile (Doctor/Admin)
- `GET /api/doctors/profile/me` - Get doctor profile (Doctor only)
- `PUT /api/doctors/:id/availability` - Update availability (Doctor only)
- `POST /api/doctors/:id/timeslots` - Add time slots (Doctor only)
- `GET /api/doctors/:id/timeslots` - Get available time slots (Public)
- `PATCH /api/doctors/:id/verify` - Verify doctor (Admin only)
- `GET /api/doctors/stats/overview` - Doctor statistics (Admin only)

### Appointments
- `GET /api/appointments` - Get appointments (User-specific)
- `GET /api/appointments/:id` - Get single appointment
- `POST /api/appointments` - Book appointment (Patient only)
- `PATCH /api/appointments/:id/status` - Update appointment status
- `POST /api/appointments/:id/prescription` - Add prescription (Doctor only)
- `PATCH /api/appointments/:id/diagnosis` - Add diagnosis (Doctor only)
- `POST /api/appointments/:id/rating` - Rate appointment (Patient only)
- `GET /api/appointments/stats/overview` - Appointment statistics (Admin only)

### 🤖 AI Health Prediction
- `POST /api/health-prediction/predict` - Create health prediction (Patient only)
- `GET /api/health-prediction/my-predictions` - Get patient's predictions (Patient only)
- `GET /api/health-prediction/:id` - Get single prediction
- `PATCH /api/health-prediction/:id/review` - Review prediction (Doctor only)
- `GET /api/health-prediction/doctor/patients` - Get patients' predictions (Doctor only)
- `GET /api/health-prediction/high-risk` - Get high-risk patients (Admin/Doctor)
- `GET /api/health-prediction/stats/overview` - Prediction statistics (Admin only)
- `GET /api/health-prediction/symptom-trends` - Get symptom trends (Admin/Doctor)

### 💊 Smart Pharmacy System
- `POST /api/pharmacy/orders` - Create pharmacy order (Auto-triggered)
- `GET /api/pharmacy/queue` - Get pharmacy queue (Pharmacist/Admin)
- `PATCH /api/pharmacy/orders/:id/status` - Update order status (Pharmacist/Admin)
- `GET /api/pharmacy/orders/:id` - Get order details
- `GET /api/pharmacy/my-orders` - Get patient's orders (Patient only)
- `GET /api/pharmacy/stats` - Pharmacy statistics (Admin/Pharmacist)
- `POST /api/pharmacy/orders/:id/notes` - Add order note (Pharmacist/Admin)
- `POST /api/pharmacy/orders/:id/quality-check` - Quality check (Pharmacist/Admin)

### 🗣️ NLP Health Query System
- `POST /api/nlp/query` - Process natural language query
- `GET /api/nlp/intents` - Get supported intents
- `GET /api/nlp/suggestions` - Get query suggestions

### 📊 Appointment Prioritization
- `GET /api/priority/doctor/:doctorId/queue` - Get prioritized doctor queue (Doctor/Admin)
- `POST /api/priority/calculate/:appointmentId` - Calculate priority score (Admin/Doctor)
- `POST /api/priority/auto-prioritize` - Auto-prioritize all appointments (Admin only)
- `GET /api/priority/stats` - Priority statistics (Admin only)

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 👥 User Roles

- **patient**: Can book appointments, view medical history
- **doctor**: Can manage profile, view appointments, add prescriptions
- **admin**: Full system access, user management
- **pharmacist**: Can manage pharmacy operations (future feature)

## 🗄️ Database Schema

### Users Collection
- Authentication data
- Profile information
- Role-based access

### Doctors Collection
- Professional information
- Specialization and qualifications
- Availability and time slots
- Ratings and reviews

### Appointments Collection
- Booking information
- Status tracking
- Prescriptions and diagnoses
- Payment status

### Health Predictions Collection
- AI-powered risk analysis
- Symptom-based predictions
- Risk levels and recommendations
- Doctor reviews

### Pharmacy Orders Collection
- Prescription processing
- Priority queue management
- Order status tracking
- Delivery and notifications

## 🧪 Testing

### Sample API Calls

1. **Register a new patient**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "Password123",
    "phone": "1234567890",
    "role": "patient",
    "age": 30,
    "gender": "male"
  }'
```

2. **Login**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "Password123"
  }'
```

3. **Get all doctors**
```bash
curl -X GET http://localhost:5000/api/doctors
```

## 🛠️ Development

### Project Structure
```
server/
├── config/
│   └── database.js          # MongoDB connection
├── middleware/
│   ├── auth.js              # JWT authentication
│   ├── errorHandler.js      # Error handling
│   └── validation.js         # Input validation
├── models/
│   ├── User.js              # User schema
│   ├── Doctor.js            # Doctor schema
│   └── Appointment.js       # Appointment schema
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── users.js             # User management routes
│   ├── doctors.js           # Doctor management routes
│   └── appointments.js     # Appointment routes
├── .env.example             # Environment variables template
├── .gitignore               # Git ignore file
├── package.json             # Dependencies and scripts
├── server.js                # Main server file
└── README.md                # This file
```

### Environment Variables
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment (development/production)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT signing
- `JWT_EXPIRE`: Token expiration time
- `FRONTEND_URL`: Frontend URL for CORS

## 🔧 Features Implemented

✅ **Authentication System**
- JWT-based authentication
- Role-based access control
- Password hashing with bcrypt
- Input validation and sanitization

✅ **User Management**
- Multi-role user system
- Profile management
- Admin controls

✅ **Doctor Management**
- Professional profiles
- Specialization-based search
- Availability management
- Time slot system
- Rating system

✅ **Appointment System**
- Smart booking with conflict detection
- Status tracking
- Prescription management
- Payment status tracking
- Rating and review system

✅ **🤖 AI Health Prediction**
- Symptom-based risk analysis
- Rule-based condition matching
- Risk level calculation (Low/Medium/High/Urgent)
- Personalized recommendations
- Doctor review system

✅ **📊 Smart Appointment Prioritization**
- AI-powered priority scoring
- Multi-factor analysis (health risk, urgency, waiting time)
- Dynamic queue management
- Doctor-specific prioritized queues

✅ **💊 Smart Pharmacy System**
- Automated order creation from prescriptions
- Priority-based queue management
- Real-time status tracking
- Medicine availability checking
- Delivery integration
- Quality control system

✅ **🗣️ NLP Health Query Processing**
- Natural language intent detection
- Entity extraction (symptoms, dates, doctor types)
- Automated query-to-API conversion
- Multi-intent support
- Emergency detection

✅ **Security & Performance**
- Rate limiting
- CORS configuration
- Input validation
- Error handling
- Security headers

## 🚀 Next Steps

The backend is fully functional with AI features. The following can be added next:

1. **Frontend Development** (React/Vite + Tailwind)
2. **Video Consultation Integration** (WebRTC)
3. **Payment Gateway Integration** (Razorpay/Stripe)
4. **Email/SMS Notification Service**
5. **Advanced AI Models** (Machine Learning integration)
6. **Mobile App Development**
7. **Analytics Dashboard Enhancement**
8. **Multi-language Support**

## 📞 Support

For any issues or questions, please refer to the API documentation or contact the development team.
