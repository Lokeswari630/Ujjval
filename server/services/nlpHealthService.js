/**
 * NLP Health Service
 * 
 * This service processes natural language health queries and converts them
 * into structured API calls using simple pattern matching and intent detection.
 */

const nlp = require('compromise');

class NLPHealthService {
  constructor() {
    // Intent patterns and their corresponding actions
    this.intents = {
      book_appointment: {
        keywords: ['book', 'schedule', 'appointment', 'consult', 'meet', 'see doctor'],
        entities: ['doctor_type', 'date', 'time', 'symptoms'],
        action: 'createAppointment'
      },
      check_appointment: {
        keywords: ['check', 'status', 'appointment', 'booking', 'scheduled'],
        entities: ['date', 'doctor_name'],
        action: 'getAppointments'
      },
      cancel_appointment: {
        keywords: ['cancel', 'reschedule', 'postpone', 'change'],
        entities: ['appointment_id', 'date'],
        action: 'cancelAppointment'
      },
      find_doctor: {
        keywords: ['find', 'search', 'doctor', 'specialist', 'physician'],
        entities: ['specialization', 'location', 'availability'],
        action: 'findDoctors'
      },
      medicine_status: {
        keywords: ['medicine', 'prescription', 'pharmacy', 'order', 'medication'],
        entities: ['order_id', 'medicine_name'],
        action: 'getMedicineStatus'
      },
      health_prediction: {
        keywords: ['symptoms', 'feeling', 'pain', 'sick', 'health check', 'diagnosis'],
        entities: ['symptoms', 'body_part', 'severity'],
        action: 'predictHealth'
      },
      emergency: {
        keywords: ['emergency', 'urgent', 'severe pain', 'critical', 'life threatening'],
        entities: ['symptoms', 'location'],
        action: 'emergencyResponse'
      },
      hospital_info: {
        keywords: ['hospital', 'timing', 'hours', 'location', 'contact', 'address'],
        entities: ['info_type'],
        action: 'getHospitalInfo'
      }
    };

    // Entity extraction patterns
    this.entityPatterns = {
      doctor_type: {
        patterns: [
          /cardiologist|heart|chest pain/i,
          /neurologist|brain|headache|migraine/i,
          /orthopedic|bone|joint|fracture/i,
          /pediatrician|child|baby|kid/i,
          /dermatologist|skin|rash|acne/i,
          /gynecologist|women|pregnant/i,
          /psychiatrist|mental|depression|anxiety/i,
          /ent|ear|nose|throat/i,
          /ophthalmologist|eye|vision/i,
          /dentist|dental|tooth/i
        ],
        mappings: {
          'cardiologist|heart|chest pain': 'Cardiology',
          'neurologist|brain|headache|migraine': 'Neurology',
          'orthopedic|bone|joint|fracture': 'Orthopedics',
          'pediatrician|child|baby|kid': 'Pediatrics',
          'dermatologist|skin|rash|acne': 'Dermatology',
          'gynecologist|women|pregnant': 'Gynecology',
          'psychiatrist|mental|depression|anxiety': 'Psychiatry',
          'ent|ear|nose|throat': 'ENT',
          'ophthalmologist|eye|vision': 'Ophthalmology',
          'dentist|dental|tooth': 'Dentistry'
        }
      },
      
      date: {
        patterns: [
          /today/i,
          /tomorrow/i,
          /yesterday/i,
          /next week/i,
          /this week/i,
          /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i,
          /(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)/i
        ]
      },
      
      time: {
        patterns: [
          /(\d{1,2}):(\d{2})\s*(am|pm)?/i,
          /morning|afternoon|evening|night/i,
          /(\d{1,2})\s*(am|pm)/i
        ]
      },
      
      symptoms: {
        patterns: [
          /fever|temperature|hot|chills/i,
          /cough|cold|sore throat/i,
          /headache|migraine|head pain/i,
          /chest pain|heart pain|chest tightness/i,
          /stomach pain|abdominal pain|belly pain/i,
          /back pain|spine pain/i,
          /nausea|vomiting|throwing up/i,
          /fatigue|tired|exhausted/i,
          /dizziness|vertigo|lightheaded/i,
          /shortness of breath|breathing difficulty/i
        ],
        mappings: {
          'fever|temperature|hot|chills': 'fever',
          'cough|cold|sore throat': 'cough',
          'headache|migraine|head pain': 'headache',
          'chest pain|heart pain|chest tightness': 'chest_pain',
          'stomach pain|abdominal pain|belly pain': 'abdominal_pain',
          'back pain|spine pain': 'back_pain',
          'nausea|vomiting|throwing up': 'nausea',
          'fatigue|tired|exhausted': 'fatigue',
          'dizziness|vertigo|lightheaded': 'dizziness',
          'shortness of breath|breathing difficulty': 'shortness_of_breath'
        }
      },
      
      severity: {
        patterns: [
          /mild|light|slight/i,
          /moderate|medium/i,
          /severe|extreme|intense|terrible/i,
          /unbearable|worst pain ever/i
        ],
        mappings: {
          'mild|light|slight': 'mild',
          'moderate|medium': 'moderate',
          'severe|extreme|intense|terrible': 'severe',
          'unbearable|worst pain ever': 'critical'
        }
      }
    };

    // Response templates
    this.responses = {
      book_appointment: {
        confirmation: "I'll help you book an appointment with a {doctor_type} for {date} at {time}. Is this correct?",
        missing_info: "I need some more information to book your appointment. Could you specify {missing_info}?",
        success: "Your appointment has been successfully booked for {date} at {time} with Dr. {doctor_name}."
      },
      find_doctor: {
        searching: "Let me find available {specialization} doctors for you...",
        found: "I found {count} {specialization} doctors available. Here are the top options:",
        none: "Sorry, no {specialization} doctors are available at the moment."
      },
      medicine_status: {
        checking: "Let me check the status of your medicine order...",
        status: "Your order {order_id} is currently {status}. Estimated ready time: {time}."
      },
      emergency: {
        immediate: "This sounds like an emergency! Please call emergency services immediately or go to the nearest emergency room.",
        urgent: "Your symptoms require urgent medical attention. Please seek medical help immediately."
      },
      health_prediction: {
        analyzing: "I'm analyzing your symptoms...",
        result: "Based on your symptoms, you may have {conditions}. I recommend {recommendations}."
      },
      fallback: {
        general: "I'm not sure I understand. Could you please rephrase your query? You can ask me about booking appointments, finding doctors, checking medicine status, or health concerns."
      }
    };
  }

  /**
   * Main NLP processing function
   */
  async processQuery(query, userId = null) {
    try {
      // Preprocess the query
      const processedQuery = this.preprocessQuery(query);
      
      // Detect intent
      const intent = this.detectIntent(processedQuery);
      
      if (!intent) {
        return {
          success: false,
          response: this.responses.fallback.general,
          suggestions: this.getQuerySuggestions()
        };
      }

      // Extract entities
      const entities = this.extractEntities(processedQuery, intent);
      
      // Validate required entities
      const validation = this.validateEntities(intent.name, entities);
      if (!validation.valid) {
        return {
          success: false,
          response: (this.responses[intent.name]?.missing_info || 'More information needed').replace('{missing_info}', validation.missing.join(', ')),
          intent,
          entities,
          requiresMoreInfo: true
        };
      }

      // Execute the action
      const result = await this.executeAction(intent.action, entities, userId);
      
      // Generate response
      const response = this.generateResponse(intent, entities, result);

      return {
        success: true,
        intent,
        entities,
        result,
        response,
        confidence: this.calculateConfidence(processedQuery, intent, entities)
      };

    } catch (error) {
      console.error('Error processing NLP query:', error);
      return {
        success: false,
        response: "I'm having trouble understanding your request. Please try again or contact support.",
        error: error.message
      };
    }
  }

  /**
   * Preprocess the query
   */
  preprocessQuery(query) {
    // Convert to lowercase and remove extra spaces
    let processed = query.toLowerCase().trim();
    
    // Remove common filler words
    const fillerWords = ['i', 'want', 'need', 'would', 'like', 'to', 'please', 'can', 'could', 'help', 'me'];
    processed = processed.split(' ').filter(word => !fillerWords.includes(word)).join(' ');
    
    // Use compromise for basic NLP processing
    const doc = nlp(processed);
    
    return {
      original: query,
      cleaned: processed,
      nlp: doc,
      tokens: doc.terms().out('array'),
      verbs: doc.verbs().out('array'),
      nouns: doc.nouns().out('array'),
      adjectives: doc.adjectives().out('array')
    };
  }

  /**
   * Detect user intent
   */
  detectIntent(processedQuery) {
    const { cleaned, tokens } = processedQuery;
    
    let bestMatch = null;
    let highestScore = 0;
    
    for (const [intentName, intentData] of Object.entries(this.intents)) {
      let score = 0;
      
      // Score based on keyword matches
      intentData.keywords.forEach(keyword => {
        if (cleaned.includes(keyword)) {
          score += 1;
        }
      });
      
      // Bonus for exact phrase matches
      if (tokens.some(token => intentData.keywords.includes(token))) {
        score += 0.5;
      }
      
      // Emergency intent gets higher priority
      if (intentName === 'emergency' && score > 0) {
        score += 2;
      }
      
      if (score > highestScore) {
        highestScore = score;
        bestMatch = intentName;
      }
    }
    
    return highestScore > 0 ? { name: bestMatch, ...this.intents[bestMatch] } : null;
  }

  /**
   * Extract entities from the query
   */
  extractEntities(processedQuery, intent) {
    const { cleaned } = processedQuery;
    const entities = {};
    
    // Extract entities based on intent requirements
    intent.entities.forEach(entityType => {
      const patterns = this.entityPatterns[entityType];
      if (patterns) {
        entities[entityType] = this.extractEntityByType(cleaned, entityType, patterns);
      }
    });
    
    return entities;
  }

  /**
   * Extract specific entity type
   */
  extractEntityByType(text, entityType, patterns) {
    if (entityType === 'doctor_type') {
      for (const [pattern, mapping] of Object.entries(patterns.mappings)) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(text)) {
          return mapping;
        }
      }
    } else if (entityType === 'symptoms') {
      const symptoms = [];
      for (const [pattern, mapping] of Object.entries(patterns.mappings)) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(text)) {
          symptoms.push(mapping);
        }
      }
      return symptoms;
    } else if (entityType === 'date') {
      for (const pattern of patterns.patterns) {
        const match = text.match(pattern);
        if (match) {
          return this.parseDate(match[0]);
        }
      }
    } else if (entityType === 'time') {
      for (const pattern of patterns.patterns) {
        const match = text.match(pattern);
        if (match) {
          return this.parseTime(match[0]);
        }
      }
    } else if (entityType === 'severity') {
      for (const [pattern, mapping] of Object.entries(patterns.mappings)) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(text)) {
          return mapping;
        }
      }
    }
    
    return null;
  }

  /**
   * Parse date from text
   */
  parseDate(dateText) {
    const now = new Date();
    
    if (dateText.toLowerCase().includes('today')) {
      return now;
    } else if (dateText.toLowerCase().includes('tomorrow')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    } else if (dateText.toLowerCase().includes('next week')) {
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek;
    }
    
    // Try to parse specific date formats
    const dateMatch = dateText.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (dateMatch) {
      const [, day, month, year] = dateMatch;
      const fullYear = year.length === 2 ? 2000 + parseInt(year) : parseInt(year);
      return new Date(fullYear, parseInt(month) - 1, parseInt(day));
    }
    
    return null;
  }

  /**
   * Parse time from text
   */
  parseTime(timeText) {
    if (timeText.toLowerCase().includes('morning')) {
      return '09:00';
    } else if (timeText.toLowerCase().includes('afternoon')) {
      return '14:00';
    } else if (timeText.toLowerCase().includes('evening')) {
      return '18:00';
    }
    
    const timeMatch = timeText.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
    if (timeMatch) {
      let [, hours, minutes, period] = timeMatch;
      hours = parseInt(hours);
      minutes = parseInt(minutes);
      
      if (period && period.toLowerCase() === 'pm' && hours !== 12) {
        hours += 12;
      } else if (!period && hours < 8) {
        hours += 12; // Assume PM for times before 8 AM
      }
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    return null;
  }

  /**
   * Validate required entities for intent
   */
  validateEntities(intent, entities) {
    const required = this.getRequiredEntities(intent.name);
    const missing = required.filter(entity => !entities[entity]);
    
    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Get required entities for intent
   */
  getRequiredEntities(intentName) {
    const requirements = {
      book_appointment: ['doctor_type', 'date'],
      find_doctor: ['doctor_type'],
      medicine_status: [],
      health_prediction: ['symptoms'],
      emergency: ['symptoms']
    };
    
    return requirements[intentName] || [];
  }

  /**
   * Execute the action based on intent
   */
  async executeAction(action, entities, userId) {
    switch (action) {
      case 'createAppointment':
        return await this.createAppointment(entities, userId);
      case 'getAppointments':
        return await this.getAppointments(entities, userId);
      case 'findDoctors':
        return await this.findDoctors(entities);
      case 'getMedicineStatus':
        return await this.getMedicineStatus(entities, userId);
      case 'predictHealth':
        return await this.predictHealth(entities, userId);
      case 'emergencyResponse':
        return this.emergencyResponse(entities);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Create appointment from NLP data
   */
  async createAppointment(entities, userId) {
    // This would integrate with the appointment service
    return {
      action: 'create_appointment',
      params: {
        doctorType: entities.doctor_type,
        date: entities.date,
        time: entities.time || '09:00',
        symptoms: entities.symptoms || [],
        userId
      }
    };
  }

  /**
   * Get appointments
   */
  async getAppointments(entities, userId) {
    return {
      action: 'get_appointments',
      params: {
        userId,
        date: entities.date
      }
    };
  }

  /**
   * Find doctors
   */
  async findDoctors(entities) {
    return {
      action: 'find_doctors',
      params: {
        specialization: entities.doctor_type,
        availability: entities.date
      }
    };
  }

  /**
   * Get medicine status
   */
  async getMedicineStatus(entities, userId) {
    return {
      action: 'get_medicine_status',
      params: {
        userId,
        orderId: entities.order_id
      }
    };
  }

  /**
   * Predict health based on symptoms
   */
  async predictHealth(entities, userId) {
    const aiHealthPredictor = require('./aiHealthPredictor');
    
    const patientData = {
      symptoms: entities.symptoms || [],
      age: 30, // Would get from user profile
      gender: 'other', // Would get from user profile
      lifestyleFactors: {
        smoking: 'never',
        alcohol: 'occasional',
        exercise: 'moderate',
        diet: 'average',
        stress: 'moderate'
      }
    };
    
    return await aiHealthPredictor.predictHealthRisk(patientData);
  }

  /**
   * Handle emergency response
   */
  emergencyResponse(entities) {
    return {
      action: 'emergency',
      params: {
        symptoms: entities.symptoms,
        severity: entities.severity
      }
    };
  }

  /**
   * Generate response based on intent and result
   */
  generateResponse(intent, entities, result) {
    const template = this.responses[intent.name];
    
    if (!template) {
      return this.responses.fallback.general;
    }
    
    let response = template.confirmation || template.searching || template.checking;
    
    // Replace placeholders with actual values
    Object.keys(entities).forEach(key => {
      const placeholder = `{${key}}`;
      response = response.replace(new RegExp(placeholder, 'g'), entities[key]);
    });
    
    // Add result-specific information
    if (result.action === 'find_doctors' && result.doctors) {
      response += ` Found ${result.doctors.length} doctors.`;
    }
    
    return response;
  }

  /**
   * Calculate confidence score
   */
  calculateConfidence(processedQuery, intent, entities) {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on entity extraction
    const extractedEntities = Object.keys(entities).filter(key => entities[key]).length;
    const requiredEntities = this.getRequiredEntities(intent.name);
    confidence += (extractedEntities / requiredEntities.length) * 0.3;
    
    // Increase confidence based on keyword matches
    const keywordMatches = intent.keywords.filter(keyword => 
      processedQuery.cleaned.includes(keyword)
    ).length;
    confidence += (keywordMatches / intent.keywords.length) * 0.2;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Get query suggestions
   */
  getQuerySuggestions() {
    return [
      "Book an appointment with a cardiologist tomorrow",
      "Check my appointment status",
      "Find available pediatricians",
      "Check my medicine order status",
      "I have headache and fever",
      "Hospital timings"
    ];
  }

  /**
   * Get supported intents
   */
  getSupportedIntents() {
    return Object.keys(this.intents).map(intent => ({
      name: intent,
      keywords: this.intents[intent].keywords,
      description: this.getIntentDescription(intent)
    }));
  }

  /**
   * Get intent description
   */
  getIntentDescription(intentName) {
    const descriptions = {
      book_appointment: "Book appointments with doctors",
      check_appointment: "Check appointment status and details",
      find_doctor: "Find doctors by specialization",
      medicine_status: "Check prescription and medicine order status",
      health_prediction: "Get health risk analysis based on symptoms",
      emergency: "Handle emergency medical situations",
      hospital_info: "Get hospital information like timings and contact"
    };
    
    return descriptions[intentName] || "Unknown intent";
  }
}

module.exports = new NLPHealthService();
