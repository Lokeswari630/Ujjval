const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const HealthPrediction = require('../models/HealthPrediction');
const MedicineInventory = require('../models/MedicineInventory');
const NLPQueryHistory = require('../models/NLPQueryHistory');
const User = require('../models/User');
const aiHealthPredictor = require('../services/aiHealthPredictor');

const STOP_WORDS = new Set([
  'i', 'me', 'my', 'mine', 'we', 'our', 'you', 'your', 'yours',
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'being', 'been',
  'to', 'for', 'of', 'on', 'in', 'at', 'by', 'with', 'from', 'as',
  'and', 'or', 'but', 'if', 'then', 'so', 'than', 'that', 'this',
  'please', 'kindly', 'can', 'could', 'would', 'should', 'want', 'need', 'help'
]);

const DOCTOR_SPECIALIZATION_RULES = [
  { pattern: /cardiologist|cardiology|heart/i, value: 'Cardiology' },
  { pattern: /neurologist|neurology|brain|migraine|headache/i, value: 'Neurology' },
  { pattern: /orthopedic|orthopaedic|orthopedics|bone|joint|fracture/i, value: 'Orthopedics' },
  { pattern: /pediatrician|pediatrics|child|baby|kid/i, value: 'Pediatrics' },
  { pattern: /dermatologist|dermatology|skin|rash|acne/i, value: 'Dermatology' },
  { pattern: /gynecologist|gynecology|pregnan|women/i, value: 'Gynecology' },
  { pattern: /psychiatrist|psychiatry|mental|anxiety|depression/i, value: 'Psychiatry' },
  { pattern: /\b(ent|ear|nose|throat)\b/i, value: 'ENT' },
  { pattern: /ophthalmologist|ophthalmology|eye|vision/i, value: 'Ophthalmology' },
  { pattern: /dentist|dentistry|dental|tooth/i, value: 'Dentistry' },
  { pattern: /urologist|urology/i, value: 'Urology' },
  { pattern: /gastroenterologist|gastroenterology|stomach|gastric/i, value: 'Gastroenterology' },
  { pattern: /endocrinologist|endocrinology|thyroid|hormone|diabetes/i, value: 'Endocrinology' },
  { pattern: /pulmonologist|pulmonology|lung|breath|respiratory/i, value: 'Pulmonology' },
  { pattern: /nephrologist|nephrology|kidney/i, value: 'Nephrology' },
  { pattern: /rheumatologist|rheumatology|arthritis/i, value: 'Rheumatology' },
  { pattern: /oncologist|oncology|cancer/i, value: 'Oncology' },
  { pattern: /anesthesiologist|anesthesiology/i, value: 'Anesthesiology' },
  { pattern: /radiologist|radiology|scan|xray|x-ray/i, value: 'Radiology' },
  { pattern: /general physician|general doctor|general medicine/i, value: 'General Medicine' }
];

const preprocessQuery = (rawQuery) => {
  const original = String(rawQuery || '').trim();
  const normalized = original.toLowerCase().replace(/[^a-z0-9\s:/-]/g, ' ').replace(/\s+/g, ' ').trim();
  const tokens = normalized ? normalized.split(' ') : [];
  const filteredTokens = tokens.filter((token) => token && !STOP_WORDS.has(token));

  return {
    original,
    normalized,
    tokens,
    filteredTokens
  };
};

const extractDoctorTypeFromQuery = (normalizedQuery) => {
  for (const rule of DOCTOR_SPECIALIZATION_RULES) {
    if (rule.pattern.test(normalizedQuery)) {
      return rule.value;
    }
  }
  return null;
};

const extractDateEntity = (normalizedQuery) => {
  if (/\btoday\b/i.test(normalizedQuery)) return 'today';
  if (/\btomorrow\b/i.test(normalizedQuery)) return 'tomorrow';
  if (/\bday after tomorrow\b/i.test(normalizedQuery)) return 'day_after_tomorrow';
  if (/\bnext week\b/i.test(normalizedQuery)) return 'next_week';
  if (/\bthis week\b/i.test(normalizedQuery)) return 'this_week';

  const numericDate = normalizedQuery.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (numericDate) return numericDate[0];

  const textualDate = normalizedQuery.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/i);
  if (textualDate) return textualDate[0];

  return null;
};

const parseRelativeDate = (dateEntity) => {
  const today = new Date();
  today.setHours(10, 0, 0, 0);

  if (!dateEntity) return null;

  if (dateEntity === 'today') return today;
  if (dateEntity === 'tomorrow') {
    const next = new Date(today);
    next.setDate(next.getDate() + 1);
    return next;
  }
  if (dateEntity === 'day_after_tomorrow') {
    const next = new Date(today);
    next.setDate(next.getDate() + 2);
    return next;
  }

  const parsed = new Date(dateEntity);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const roleSuggestions = {
  patient: [
    'Go to my appointments page',
    'Open my profile page',
    'Show my upcoming appointments',
    'Book appointment with cardiologist tomorrow',
    'I have fever and cough, what should I do at home?'
  ],
  doctor: [
    'Open patient records page',
    'Open health predictions page',
    "Show today's appointments"
  ],
  admin: [
    'Go to dashboard page',
    'Open admin profile page',
    'Check low stock medicines'
  ],
  pharmacist: [
    'Open inventory page',
    'Open pharmacy page',
    'Check low stock medicines'
  ]
};

const getSuggestionsForRole = (role) => roleSuggestions[role] || roleSuggestions.patient;

const extractSymptomsFromQuery = (rawQuery) => {
  const query = String(rawQuery || '').toLowerCase();
  const symptomPatterns = [
    { regex: /fever|temperature|chills/, value: 'fever' },
    { regex: /cough|cold|sore throat/, value: 'cough' },
    { regex: /headache|migraine|head pain/, value: 'headache' },
    { regex: /chest pain|chest tightness|heart pain/, value: 'chest_pain' },
    { regex: /stomach pain|abdominal pain|belly pain/, value: 'abdominal_pain' },
    { regex: /shortness of breath|breathing difficulty|breathless/, value: 'shortness_of_breath' },
    { regex: /nausea|vomiting|throwing up/, value: 'nausea' },
    { regex: /fatigue|tired|exhausted|weakness/, value: 'fatigue' },
    { regex: /dizziness|vertigo|lightheaded/, value: 'dizziness' }
  ];

  return symptomPatterns
    .filter((item) => item.regex.test(query))
    .map((item) => item.value);
};

const parseIntent = (rawQuery) => {
  const pipeline = preprocessQuery(rawQuery);
  const query = pipeline.normalized;

  const has = (terms) => terms.some((term) => query.includes(term));

  const bookingIntentDetected = has(['book', 'schedule', 'appointment', 'consult', 'meet doctor', 'see doctor']);
  if (bookingIntentDetected) {
    const doctorType = extractDoctorTypeFromQuery(query);
    const date = extractDateEntity(query);
    const symptoms = extractSymptomsFromQuery(query);

    return {
      intent: 'appointments.book',
      confidence: doctorType ? 0.93 : 0.78,
      entities: {
        doctorType,
        date,
        symptoms
      },
      pipeline
    };
  }

  if (has(['go to', 'open', 'navigate', 'take me', 'dashboard', 'profile page', 'appointments page'])) {
    return {
      intent: 'navigation.route',
      confidence: 0.9,
      entities: {},
      pipeline
    };
  }

  if (has(['upcoming appointment', 'my appointment', "today's appointment", 'appointments'])) {
    return {
      intent: 'appointments.lookup',
      confidence: 0.86,
      entities: {
        scope: has(['upcoming']) ? 'upcoming' : has(["today", "today's"]) ? 'today' : 'all'
      },
      pipeline
    };
  }

  if (has(['list all patients', 'all patients', 'patients list'])) {
    return {
      intent: 'users.listPatients',
      confidence: 0.91,
      entities: {},
      pipeline
    };
  }

  if (has(['low stock', 'inventory low', 'check low stock', 'stock medicines', 'low medicines'])) {
    return {
      intent: 'inventory.lowStock',
      confidence: 0.89,
      entities: {},
      pipeline
    };
  }

  if (has(["today's prescriptions", 'prescriptions today', 'today prescriptions'])) {
    return {
      intent: 'prescriptions.today',
      confidence: 0.84,
      entities: {},
      pipeline
    };
  }

  if (has(['last health prediction', 'my last prediction', 'latest prediction'])) {
    return {
      intent: 'predictions.latest',
      confidence: 0.9,
      entities: {},
      pipeline
    };
  }

  if (has(['symptom', 'fever', 'cough', 'headache', 'chest pain', 'stomach pain', 'breath', 'what should i do', 'home remedy', 'home care'])) {
    const symptoms = extractSymptomsFromQuery(query);
    return {
      intent: 'health.advice',
      confidence: symptoms.length > 0 ? 0.88 : 0.72,
      entities: {
        symptoms
      },
      pipeline
    };
  }

  return {
    intent: 'unknown',
    confidence: 0.35,
    entities: {},
    pipeline
  };
};

const isLikelyBookingFollowUp = (rawQuery, pipeline) => {
  const normalized = pipeline?.normalized || String(rawQuery || '').toLowerCase();
  const tokenCount = Array.isArray(pipeline?.filteredTokens)
    ? pipeline.filteredTokens.length
    : (normalized ? normalized.split(/\s+/).filter(Boolean).length : 0);

  const hasBookingSignal = /\b(book|booking|schedule|appointment|consult)\b/i.test(normalized);
  const hasAffirmationSignal = /\b(yes|yeah|yep|ok|okay|sure|confirm|confirmed|proceed|go ahead|do it)\b/i.test(normalized);

  // Restrict context carry-over to short confirmation-like utterances.
  return tokenCount > 0 && tokenCount <= 8 && hasBookingSignal && hasAffirmationSignal;
};

const hydrateBookingEntitiesFromHistory = async (parsed, user, rawQuery) => {
  if (parsed.intent !== 'appointments.book') return parsed;

  const needsDoctorType = !parsed?.entities?.doctorType;
  const needsDate = !parsed?.entities?.date;

  if (!needsDoctorType && !needsDate) return parsed;
  if (!isLikelyBookingFollowUp(rawQuery, parsed.pipeline)) return parsed;

  const recentBookingContext = await NLPQueryHistory.findOne({
    userId: user.id,
    intent: 'appointments.book',
    success: true,
    'entities.doctorType': { $exists: true, $ne: null }
  })
    .sort({ createdAt: -1 })
    .select('entities')
    .lean();

  if (!recentBookingContext?.entities) return parsed;

  const mergedEntities = {
    ...parsed.entities,
    doctorType: parsed.entities?.doctorType || recentBookingContext.entities?.doctorType || null,
    date: parsed.entities?.date || recentBookingContext.entities?.date || null,
    symptoms: Array.isArray(parsed.entities?.symptoms) && parsed.entities.symptoms.length > 0
      ? parsed.entities.symptoms
      : recentBookingContext.entities?.symptoms || []
  };

  return {
    ...parsed,
    confidence: mergedEntities.doctorType ? Math.max(parsed.confidence || 0, 0.9) : parsed.confidence,
    entities: mergedEntities,
    pipeline: {
      ...parsed.pipeline,
      contextHydrated: true,
      contextSource: 'recent_booking_history'
    }
  };
};

const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const getAppointmentsForUser = async (user, scope) => {
  const filter = { status: { $ne: 'cancelled' } };
  const now = new Date();
  const { start, end } = getTodayRange();

  if (user.role === 'patient') {
    filter.patientId = user.id;
  } else if (user.role === 'doctor') {
    const doctor = await Doctor.findOne({ userId: user.id }).select('_id');
    if (!doctor) {
      return { rows: [], message: 'Doctor profile not found' };
    }
    filter.doctorId = doctor._id;
  }

  if (scope === 'upcoming') {
    filter.date = { $gte: now };
  }

  if (scope === 'today') {
    filter.date = { $gte: start, $lte: end };
  }

  const rows = await Appointment.find(filter)
    .populate('patientId', 'name email')
    .populate({
      path: 'doctorId',
      populate: { path: 'userId', select: 'name email' },
      select: 'userId specialization'
    })
    .sort({ date: 1, startTime: 1 })
    .limit(20);

  return { rows, message: 'Appointments fetched successfully' };
};

const executeIntent = async (parsed, user) => {
  const { intent, entities } = parsed;

  if (intent === 'navigation.route') {
    return {
      message: 'Navigation request detected',
      resultType: 'navigation',
      data: [],
      columns: []
    };
  }

  if (intent === 'appointments.lookup') {
    const result = await getAppointmentsForUser(user, entities.scope);
    return {
      message: result.message,
      resultType: 'appointments',
      data: result.rows,
      columns: ['date', 'startTime', 'status', 'patient', 'doctor']
    };
  }

  if (intent === 'appointments.book') {
    if (user.role !== 'patient') {
      throw Object.assign(new Error('Only patients can initiate appointment booking through NLP'), { statusCode: 403 });
    }

    const doctorType = entities?.doctorType;
    const parsedDate = parseRelativeDate(entities?.date);

    if (!doctorType) {
      return {
        message: 'Please mention the doctor type/specialization (for example: cardiologist).',
        resultType: 'appointment_booking',
        data: [],
        columns: ['doctor', 'specialization', 'consultationFee', 'date']
      };
    }

    const matchedDoctors = await Doctor.find({ specialization: doctorType })
      .populate('userId', 'name email')
      .select('userId specialization consultationFee experience availability')
      .limit(5);

    const data = matchedDoctors.map((doctor) => ({
      doctorId: doctor._id,
      name: doctor.userId?.name || 'Doctor',
      doctorName: doctor.userId?.name || 'Doctor',
      specialization: doctor.specialization,
      consultationFee: doctor.consultationFee,
      experience: doctor.experience,
      requestedDate: parsedDate || entities?.date || null,
      requestedDateText: entities?.date || null
    }));

    return {
      message: data.length > 0
        ? `Intent detected: appointment booking. Found ${data.length} ${doctorType} doctor(s).`
        : `Intent detected: appointment booking. No ${doctorType} doctors found right now.`,
      resultType: 'appointment_booking',
      data,
      columns: ['doctorName', 'specialization', 'consultationFee', 'experience', 'requestedDateText']
    };
  }

  if (intent === 'users.listPatients') {
    if (!['admin', 'doctor'].includes(user.role)) {
      throw Object.assign(new Error('Access denied for patient listing'), { statusCode: 403 });
    }

    let patients = [];

    if (user.role === 'admin') {
      patients = await User.find({ role: 'patient', isActive: true })
        .select('name email phone age gender createdAt')
        .sort({ createdAt: -1 })
        .limit(50);
    } else {
      const doctor = await Doctor.findOne({ userId: user.id }).select('_id');
      if (doctor) {
        const appointmentRows = await Appointment.find({ doctorId: doctor._id })
          .distinct('patientId');
        patients = await User.find({ _id: { $in: appointmentRows }, role: 'patient' })
          .select('name email phone age gender')
          .sort({ name: 1 });
      }
    }

    return {
      message: 'Patients fetched successfully',
      resultType: 'patients',
      data: patients,
      columns: ['name', 'email', 'phone', 'age', 'gender']
    };
  }

  if (intent === 'inventory.lowStock') {
    if (!['admin', 'pharmacist'].includes(user.role)) {
      throw Object.assign(new Error('Access denied for inventory data'), { statusCode: 403 });
    }

    const expiringThreshold = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const rows = await MedicineInventory.find({
      isActive: true,
      $or: [
        { $expr: { $lte: ['$stock', '$minStockLevel'] } },
        { expiryDate: { $lte: expiringThreshold } }
      ]
    })
      .select('name brand stock minStockLevel expiryDate category')
      .sort({ stock: 1 })
      .limit(50);

    return {
      message: 'Low stock medicines fetched successfully',
      resultType: 'inventory',
      data: rows,
      columns: ['name', 'brand', 'stock', 'minStockLevel', 'expiryDate']
    };
  }

  if (intent === 'prescriptions.today') {
    const { start, end } = getTodayRange();
    const filter = {
      'prescription.issuedAt': { $gte: start, $lte: end }
    };

    if (user.role === 'patient') {
      filter.patientId = user.id;
    } else if (user.role === 'doctor') {
      const doctor = await Doctor.findOne({ userId: user.id }).select('_id');
      if (!doctor) {
        return {
          message: 'Doctor profile not found',
          resultType: 'prescriptions',
          data: [],
          columns: ['issuedAt', 'patient', 'doctor', 'medicinesCount']
        };
      }
      filter.doctorId = doctor._id;
    }

    const rows = await Appointment.find(filter)
      .populate('patientId', 'name')
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name' }, select: 'userId' })
      .select('prescription date startTime patientId doctorId')
      .sort({ 'prescription.issuedAt': -1 })
      .limit(30);

    return {
      message: 'Today\'s prescriptions fetched successfully',
      resultType: 'prescriptions',
      data: rows,
      columns: ['issuedAt', 'patient', 'doctor', 'medicinesCount']
    };
  }

  if (intent === 'predictions.latest') {
    if (user.role !== 'patient') {
      throw Object.assign(new Error('Only patients can query personal health predictions'), { statusCode: 403 });
    }

    const row = await HealthPrediction.findOne({ patientId: user.id })
      .sort({ predictionDate: -1 })
      .select('predictionDate aiAnalysis symptoms');

    return {
      message: row ? 'Latest prediction fetched successfully' : 'No predictions found',
      resultType: 'prediction',
      data: row ? [row] : [],
      columns: ['predictionDate', 'riskLevel', 'riskScore', 'symptoms']
    };
  }

  if (intent === 'health.advice') {
    const userProfile = await User.findById(user.id).select('age gender').lean();
    const symptoms = Array.isArray(entities?.symptoms) && entities.symptoms.length > 0
      ? entities.symptoms
      : [];

    if (symptoms.length === 0) {
      return {
        message: 'Please mention at least one symptom (for example: fever, cough, headache) so I can provide guidance.',
        resultType: 'prediction',
        data: [],
        columns: ['predictionDate', 'riskLevel', 'riskScore', 'symptoms']
      };
    }

    const aiAnalysis = await aiHealthPredictor.predictHealthRisk({
      symptoms,
      age: Number(userProfile?.age) || 30,
      gender: userProfile?.gender || 'other',
      lifestyleFactors: {
        smoking: 'never',
        alcohol: 'occasional',
        exercise: 'moderate',
        diet: 'average',
        stress: 'moderate'
      },
      vitalSigns: {}
    });

    return {
      message: 'AI home-care guidance generated based on your symptoms',
      resultType: 'prediction',
      data: [
        {
          _id: `nlp-health-${Date.now()}`,
          predictionDate: new Date(),
          symptoms,
          aiAnalysis
        }
      ],
      columns: ['predictionDate', 'riskLevel', 'riskScore', 'symptoms', 'recommendations']
    };
  }

  return {
    message: 'Intent not supported',
    resultType: 'unknown',
    data: [],
    columns: []
  };
};

const persistHistory = async ({ user, query, parsed, success, message, latencyMs }) => {
  return NLPQueryHistory.create({
    userId: user.id,
    role: user.role,
    query,
    intent: parsed.intent,
    entities: parsed.entities,
    success,
    message,
    latencyMs
  });
};

const processNlpQuery = async (req, res, next) => {
  const startedAt = Date.now();

  try {
    const query = String(req.body?.query || '').trim();

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query is required',
        data: null
      });
    }

    let parsed = parseIntent(query);
    parsed = await hydrateBookingEntitiesFromHistory(parsed, req.user, query);

    if (parsed.intent === 'unknown') {
      const history = await persistHistory({
        user: req.user,
        query,
        parsed,
        success: false,
        message: 'Could not map query intent',
        latencyMs: Date.now() - startedAt
      });

      return res.status(200).json({
        success: true,
        message: 'Query processed with low confidence',
        data: {
          intent: parsed.intent,
          confidence: parsed.confidence,
          entities: parsed.entities,
          nlpPipeline: {
            preprocessing: {
              normalized: parsed.pipeline?.normalized || '',
              tokens: parsed.pipeline?.tokens || [],
              filteredTokens: parsed.pipeline?.filteredTokens || []
            },
            intentDetection: parsed.intent,
            entityExtraction: parsed.entities
          },
          resultType: 'unknown',
          result: [],
          columns: [],
          suggestions: getSuggestionsForRole(req.user.role),
          historyId: history._id
        }
      });
    }

    const execution = await executeIntent(parsed, req.user);
    const history = await persistHistory({
      user: req.user,
      query,
      parsed,
      success: true,
      message: execution.message,
      latencyMs: Date.now() - startedAt
    });

    res.status(200).json({
      success: true,
      message: execution.message,
      data: {
        query,
        intent: parsed.intent,
        confidence: parsed.confidence,
        entities: parsed.entities,
        nlpPipeline: {
          preprocessing: {
            normalized: parsed.pipeline?.normalized || '',
            tokens: parsed.pipeline?.tokens || [],
            filteredTokens: parsed.pipeline?.filteredTokens || []
          },
          intentDetection: parsed.intent,
          entityExtraction: parsed.entities
        },
        resultType: execution.resultType,
        result: execution.data,
        columns: execution.columns,
        suggestions: getSuggestionsForRole(req.user.role),
        historyId: history._id
      }
    });
  } catch (error) {
    const parsed = parseIntent(req.body?.query || '');
    await persistHistory({
      user: req.user,
      query: String(req.body?.query || ''),
      parsed,
      success: false,
      message: error.message || 'Query processing failed',
      latencyMs: Date.now() - startedAt
    }).catch(() => null);

    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to process NLP query',
      data: null
    });
  }
};

const getQueryHistory = async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) > 0 ? Math.min(Number(req.query.limit), 50) : 20;

    const rows = await NLPQueryHistory.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('query intent entities success message latencyMs createdAt');

    res.status(200).json({
      success: true,
      message: 'Query history fetched successfully',
      data: rows
    });
  } catch (error) {
    next(error);
  }
};

const getQuerySuggestions = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Suggestions fetched successfully',
      data: getSuggestionsForRole(req.user.role)
    });
  } catch (error) {
    next(error);
  }
};

const getQueryStats = async (req, res, next) => {
  try {
    const totalQueries = await NLPQueryHistory.countDocuments();
    const successfulQueries = await NLPQueryHistory.countDocuments({ success: true });
    const byIntent = await NLPQueryHistory.aggregate([
      { $group: { _id: '$intent', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.status(200).json({
      success: true,
      message: 'NLP query stats fetched successfully',
      data: {
        totalQueries,
        successfulQueries,
        failedQueries: Math.max(totalQueries - successfulQueries, 0),
        successRate: totalQueries ? Number(((successfulQueries / totalQueries) * 100).toFixed(2)) : 0,
        topIntents: byIntent
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  processNlpQuery,
  getQueryHistory,
  getQuerySuggestions,
  getQueryStats
};