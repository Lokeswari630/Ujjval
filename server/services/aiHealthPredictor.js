/**
 * AI Health Prediction Service
 * 
 * This service uses rule-based logic to analyze symptoms and predict health risks.
 * In a production environment, this would be replaced with machine learning models.
 */

class AIHealthPredictor {
  constructor() {
    this.externalAi = {
      url: process.env.HEALTH_AI_API_URL || 'https://api.openai.com/v1/chat/completions',
      model: process.env.HEALTH_AI_MODEL || 'gpt-4o-mini',
      apiKey: process.env.HEALTH_AI_API_KEY || process.env.OPENAI_API_KEY || '',
      timeoutMs: Number(process.env.HEALTH_AI_TIMEOUT_MS || 12000)
    };

    // Symptom-to-condition mapping database
    this.symptomDatabase = {
      // Cardiovascular symptoms
      chest_pain: {
        conditions: [
          { condition: 'Heart Attack', probability: 25, severity: 'critical' },
          { condition: 'Angina', probability: 35, severity: 'severe' },
          { condition: 'Anxiety', probability: 20, severity: 'moderate' },
          { condition: 'Muscle Strain', probability: 15, severity: 'mild' },
          { condition: 'GERD', probability: 5, severity: 'mild' }
        ],
        riskFactors: ['age', 'smoking', 'stress', 'bloodPressure'],
        specialization: 'Cardiology'
      },
      
      // Respiratory symptoms
      shortness_of_breath: {
        conditions: [
          { condition: 'Asthma', probability: 30, severity: 'moderate' },
          { condition: 'COVID-19', probability: 20, severity: 'severe' },
          { condition: 'Pneumonia', probability: 25, severity: 'severe' },
          { condition: 'Anxiety', probability: 15, severity: 'moderate' },
          { condition: 'Allergies', probability: 10, severity: 'mild' }
        ],
        riskFactors: ['age', 'smoking', 'exercise'],
        specialization: 'Pulmonology'
      },
      
      // Neurological symptoms
      headache: {
        conditions: [
          { condition: 'Migraine', probability: 35, severity: 'moderate' },
          { condition: 'Tension Headache', probability: 30, severity: 'mild' },
          { condition: 'Sinusitis', probability: 20, severity: 'mild' },
          { condition: 'High Blood Pressure', probability: 10, severity: 'moderate' },
          { condition: 'Brain Tumor', probability: 5, severity: 'critical' }
        ],
        riskFactors: ['stress', 'age', 'bloodPressure'],
        specialization: 'Neurology'
      },
      
      // Digestive symptoms
      abdominal_pain: {
        conditions: [
          { condition: 'Gastritis', probability: 25, severity: 'moderate' },
          { condition: 'Appendicitis', probability: 15, severity: 'severe' },
          { condition: 'IBS', probability: 20, severity: 'mild' },
          { condition: 'Food Poisoning', probability: 25, severity: 'moderate' },
          { condition: 'Gallstones', probability: 15, severity: 'moderate' }
        ],
        riskFactors: ['diet', 'age', 'stress'],
        specialization: 'Gastroenterology'
      },
      
      // General symptoms
      fever: {
        conditions: [
          { condition: 'Viral Infection', probability: 40, severity: 'mild' },
          { condition: 'Bacterial Infection', probability: 30, severity: 'moderate' },
          { condition: 'COVID-19', probability: 15, severity: 'severe' },
          { condition: 'Flu', probability: 10, severity: 'moderate' },
          { condition: 'Dengue', probability: 5, severity: 'severe' }
        ],
        riskFactors: ['age', 'temperature'],
        specialization: 'General Medicine'
      },
      
      cough: {
        conditions: [
          { condition: 'Common Cold', probability: 35, severity: 'mild' },
          { condition: 'Flu', probability: 25, severity: 'moderate' },
          { condition: 'COVID-19', probability: 15, severity: 'severe' },
          { condition: 'Allergies', probability: 15, severity: 'mild' },
          { condition: 'Bronchitis', probability: 10, severity: 'moderate' }
        ],
        riskFactors: ['smoking', 'age', 'season'],
        specialization: 'Pulmonology'
      }
    };

    // Risk factor weights
    this.riskWeights = {
      age: {
        child: 0.8,
        young_adult: 0.9,
        adult: 1.0,
        middle_aged: 1.2,
        senior: 1.5
      },
      smoking: {
        never: 0.8,
        occasional: 1.0,
        regular: 1.3,
        heavy: 1.8
      },
      alcohol: {
        never: 0.9,
        occasional: 1.0,
        regular: 1.2,
        heavy: 1.6
      },
      exercise: {
        none: 1.4,
        rare: 1.2,
        moderate: 1.0,
        frequent: 0.8
      },
      diet: {
        poor: 1.3,
        average: 1.0,
        good: 0.9,
        excellent: 0.8
      },
      stress: {
        low: 0.8,
        moderate: 1.0,
        high: 1.3,
        severe: 1.6
      }
    };
  }

  /**
   * Main prediction function
   */
  async predictHealthRisk(patientData) {
    try {
      const { symptoms, age, gender, lifestyleFactors, vitalSigns } = patientData;
      
      // Step 1: Analyze each symptom
      const symptomAnalyses = symptoms.map(symptom => 
        this.analyzeSymptom(symptom.toLowerCase().replace(/\s+/g, '_'))
      );

      // Step 2: Calculate combined risk score
      const riskAnalysis = this.calculateCombinedRisk(symptomAnalyses, patientData);
      const riskLevel = this.getRiskLevel(riskAnalysis.totalScore);
      
      // Step 3: Generate recommendations
      const recommendations = await this.generateRecommendations(riskAnalysis, patientData, riskLevel);
      
      // Step 4: Determine urgency and specialization
      const urgencyLevel = this.determineUrgency(riskAnalysis);
      const suggestedSpecialization = this.suggestSpecialization(symptomAnalyses);

      return {
        riskLevel,
        riskScore: Math.round(riskAnalysis.totalScore),
        possibleConditions: riskAnalysis.topConditions,
        recommendations,
        urgencyLevel,
        suggestedSpecialization
      };

    } catch (error) {
      console.error('Error in AI health prediction:', error);
      throw new Error('Health prediction failed');
    }
  }

  /**
   * Analyze individual symptom
   */
  analyzeSymptom(symptom) {
    const symptomData = this.symptomDatabase[symptom];
    
    if (!symptomData) {
      return {
        symptom,
        conditions: [],
        riskScore: 5, // Default low risk for unknown symptoms
        specialization: 'General Medicine'
      };
    }

    return {
      symptom,
      conditions: symptomData.conditions,
      riskScore: this.calculateSymptomRisk(symptomData.conditions),
      specialization: symptomData.specialization
    };
  }

  /**
   * Calculate risk score for a symptom based on conditions
   */
  calculateSymptomRisk(conditions) {
    if (!conditions || conditions.length === 0) return 5;

    let totalRisk = 0;
    let severityWeight = 0;

    conditions.forEach(condition => {
      const severityMultiplier = {
        mild: 0.5,
        moderate: 1.0,
        severe: 1.5,
        critical: 2.0
      };

      totalRisk += condition.probability * severityMultiplier[condition.severity];
      severityWeight += severityMultiplier[condition.severity];
    });

    return Math.min(totalRisk / Math.max(severityWeight, 1), 100);
  }

  /**
   * Calculate combined risk from all symptoms
   */
  calculateCombinedRisk(symptomAnalyses, patientData) {
    // Base risk from symptoms
    let totalScore = symptomAnalyses.reduce((sum, analysis) => sum + analysis.riskScore, 0);
    
    // Apply risk factor multipliers
    const ageMultiplier = this.getAgeMultiplier(patientData.age);
    const lifestyleMultiplier = this.getLifestyleMultiplier(patientData.lifestyleFactors);
    const vitalSignsMultiplier = this.getVitalSignsMultiplier(patientData.vitalSigns);

    totalScore *= ageMultiplier * lifestyleMultiplier * vitalSignsMultiplier;

    // Cap at 100
    totalScore = Math.min(totalScore, 100);

    // Get top conditions
    const allConditions = symptomAnalyses.flatMap(analysis => analysis.conditions || []);
    const topConditions = this.getTopConditions(allConditions);

    return {
      totalScore,
      topConditions,
      symptomCount: symptomAnalyses.length
    };
  }

  /**
   * Get age-based risk multiplier
   */
  getAgeMultiplier(age) {
    if (age < 18) return 0.8;
    if (age < 30) return 0.9;
    if (age < 50) return 1.0;
    if (age < 65) return 1.2;
    return 1.5;
  }

  /**
   * Get lifestyle-based risk multiplier
   */
  getLifestyleMultiplier(lifestyle) {
    if (!lifestyle) return 1.0;

    let multiplier = 1.0;
    
    // Smoking impact
    multiplier *= this.riskWeights.smoking[lifestyle.smoking] || 1.0;
    
    // Alcohol impact
    multiplier *= this.riskWeights.alcohol[lifestyle.alcohol] || 1.0;
    
    // Exercise impact
    multiplier *= this.riskWeights.exercise[lifestyle.exercise] || 1.0;
    
    // Diet impact
    multiplier *= this.riskWeights.diet[lifestyle.diet] || 1.0;
    
    // Stress impact
    multiplier *= this.riskWeights.stress[lifestyle.stress] || 1.0;

    return multiplier;
  }

  /**
   * Get vital signs-based risk multiplier
   */
  getVitalSignsMultiplier(vitalSigns) {
    if (!vitalSigns) return 1.0;

    let multiplier = 1.0;

    // Blood pressure impact
    if (vitalSigns.bloodPressure) {
      const { systolic, diastolic } = vitalSigns.bloodPressure;
      if (systolic > 140 || diastolic > 90) {
        multiplier *= 1.3;
      }
    }

    // Heart rate impact
    if (vitalSigns.heartRate) {
      if (vitalSigns.heartRate > 100 || vitalSigns.heartRate < 60) {
        multiplier *= 1.2;
      }
    }

    // Temperature impact
    if (vitalSigns.temperature) {
      if (vitalSigns.temperature > 38 || vitalSigns.temperature < 36) {
        multiplier *= 1.4;
      }
    }

    // Blood sugar impact
    if (vitalSigns.bloodSugar) {
      if (vitalSigns.bloodSugar > 150 || vitalSigns.bloodSugar < 70) {
        multiplier *= 1.3;
      }
    }

    return multiplier;
  }

  /**
   * Get top conditions from analysis
   */
  getTopConditions(allConditions) {
    // Group conditions by name and sum probabilities
    const conditionMap = new Map();
    
    allConditions.forEach(condition => {
      const existing = conditionMap.get(condition.condition);
      if (existing) {
        existing.probability = Math.max(existing.probability, condition.probability);
      } else {
        conditionMap.set(condition.condition, { ...condition });
      }
    });

    // Sort by probability and return top 5
    return Array.from(conditionMap.values())
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 5);
  }

  /**
   * Get risk level based on score
   */
  getRiskLevel(score) {
    if (score >= 80) return 'urgent';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * Generate recommendations based on analysis
   */
  async generateRecommendations(riskAnalysis, patientData, riskLevel) {
    const apiRecommendations = await this.getApiBasedNaturalRecommendations(riskAnalysis, patientData, riskLevel);
    if (apiRecommendations.length > 0) {
      return apiRecommendations;
    }

    const recommendations = [];
    const { topConditions } = riskAnalysis;

    // Basic recommendations for all risk levels
    recommendations.push({
      type: 'Monitor symptoms closely and seek medical attention if they worsen',
      priority: 'medium'
    });

    // Risk-specific recommendations
    if (riskLevel === 'urgent' || riskLevel === 'high') {
      recommendations.push({
        type: 'Seek immediate medical consultation',
        priority: 'high'
      });
      recommendations.push({
        type: 'Consider emergency department visit if symptoms are severe',
        priority: 'high'
      });
    }

    if (riskLevel === 'medium') {
      recommendations.push({
        type: 'Schedule doctor appointment within 24-48 hours',
        priority: 'medium'
      });
    }

    if (riskLevel === 'low') {
      recommendations.push({
        type: 'Monitor symptoms and consult doctor if they persist',
        priority: 'low'
      });
    }

    // Condition-specific recommendations
    topConditions.forEach(condition => {
      if (condition.severity === 'critical') {
        recommendations.push({
          type: `Immediate evaluation needed for possible ${condition.condition}`,
          priority: 'high'
        });
      }
    });

    // Lifestyle recommendations
    if (patientData.lifestyleFactors) {
      if (patientData.lifestyleFactors.smoking === 'regular' || patientData.lifestyleFactors.smoking === 'heavy') {
        recommendations.push({
          type: 'Consider smoking cessation programs',
          priority: 'medium'
        });
      }
      
      if (patientData.lifestyleFactors.exercise === 'none' || patientData.lifestyleFactors.exercise === 'rare') {
        recommendations.push({
          type: 'Increase physical activity gradually',
          priority: 'low'
        });
      }
    }

    const symptomSet = new Set((patientData.symptoms || []).map((item) => String(item || '').toLowerCase()));

    if (symptomSet.has('fever') || symptomSet.has('cough')) {
      recommendations.push({
        type: 'Food for recovery: warm soups, dal-rice/khichdi, citrus fruits, and coconut water.',
        priority: 'low'
      });
    } else if (symptomSet.has('abdominal_pain') || symptomSet.has('nausea')) {
      recommendations.push({
        type: 'Food for recovery: banana, plain curd, rice porridge, toast, and light homemade meals.',
        priority: 'low'
      });
    } else if (symptomSet.has('headache') || symptomSet.has('fatigue')) {
      recommendations.push({
        type: 'Food for recovery: adequate water, seasonal fruits, nuts/seeds, and balanced home-cooked meals.',
        priority: 'low'
      });
    } else {
      recommendations.push({
        type: 'Food for recovery: soft, home-cooked meals with vegetables, fruits, and enough fluids.',
        priority: 'low'
      });
    }

    if (String(patientData?.reportContext || '').trim()) {
      recommendations.push({
        type: 'Follow report-specific precautions: choose meals and routines based on your known conditions/allergies in report notes.',
        priority: 'medium'
      });
    }

    return recommendations;
  }

  isExternalAIConfigured() {
    return Boolean(String(this.externalAi.apiKey || '').trim());
  }

  buildNaturalCarePrompt(riskAnalysis, patientData, riskLevel) {
    const reportContext = String(patientData?.reportContext || '').trim();
    const reportUpload = patientData?.reportUpload || {};

    return [
      'You are a health-support assistant that gives only natural, home-based wellness suggestions.',
      'Strict rules:',
      '- Do not prescribe medicines, pills, chemicals, injections, or supplements.',
      '- Focus on hydration, sleep, food, breathing, light movement, hygiene, and rest-based actions.',
      '- Include food suggestions for recovery (2 to 4 practical items/meals).',
      '- Keep advice practical and short for non-doctors.',
      '- If risk is high/urgent or critical symptoms exist, include immediate doctor/emergency escalation.',
      '- Output JSON only with this schema:',
      '{"recommendations":[{"type":"string","priority":"low|medium|high"}]}.',
      `Risk Level: ${riskLevel}`,
      `Top Conditions: ${(riskAnalysis.topConditions || []).map((item) => item.condition).join(', ') || 'Unknown'}`,
      `Symptoms: ${(patientData.symptoms || []).join(', ')}`,
      `Age: ${patientData.age}, Gender: ${patientData.gender}`,
      `Lifestyle: ${JSON.stringify(patientData.lifestyleFactors || {})}`,
      `Vitals: ${JSON.stringify(patientData.vitalSigns || {})}`,
      `Report Notes: ${reportContext || 'Not provided'}`,
      `Report Upload: ${reportUpload.fileName ? `${reportUpload.fileName} (${reportUpload.fileType || 'unknown'})` : 'Not provided'}`
    ].join('\n');
  }

  sanitizeRecommendations(payloadRecommendations = []) {
    if (!Array.isArray(payloadRecommendations)) return [];

    const blockedTerms = [
      'tablet', 'capsule', 'medicine', 'medication', 'antibiotic', 'drug', 'chemical',
      'injection', 'steroid', 'painkiller', 'syrup', 'dose', 'pharma'
    ];

    return payloadRecommendations
      .map((item) => ({
        type: String(item?.type || '').trim(),
        priority: ['low', 'medium', 'high'].includes(String(item?.priority || '').toLowerCase())
          ? String(item.priority).toLowerCase()
          : 'medium'
      }))
      .filter((item) => item.type.length > 0)
      .filter((item) => {
        const normalized = item.type.toLowerCase();
        return !blockedTerms.some((term) => normalized.includes(term));
      })
      .slice(0, 8);
  }

  async getApiBasedNaturalRecommendations(riskAnalysis, patientData, riskLevel) {
    if (!this.isExternalAIConfigured()) {
      return [];
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.externalAi.timeoutMs);

    try {
      const response = await fetch(this.externalAi.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.externalAi.apiKey}`
        },
        body: JSON.stringify({
          model: this.externalAi.model,
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: 'You provide safe, conservative, natural home-care advice only.'
            },
            {
              role: 'user',
              content: this.buildNaturalCarePrompt(riskAnalysis, patientData, riskLevel)
            }
          ]
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        return [];
      }

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (error) {
        return [];
      }

      return this.sanitizeRecommendations(parsed?.recommendations);
    } catch (error) {
      return [];
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Determine urgency level
   */
  determineUrgency(riskAnalysis) {
    const { totalScore, topConditions } = riskAnalysis;

    // Check for critical conditions
    const hasCriticalCondition = topConditions.some(condition => 
      condition.severity === 'critical' && condition.probability > 10
    );

    if (hasCriticalCondition || totalScore >= 80) {
      return 'emergency';
    }

    if (totalScore >= 60) {
      return 'urgent';
    }

    if (totalScore >= 40) {
      return 'urgent';
    }

    return 'routine';
  }

  /**
   * Suggest medical specialization
   */
  suggestSpecialization(symptomAnalyses) {
    const specializationCount = {};
    
    symptomAnalyses.forEach(analysis => {
      if (analysis.specialization) {
        specializationCount[analysis.specialization] = 
          (specializationCount[analysis.specialization] || 0) + 1;
      }
    });

    // Return the most common specialization
    const specializations = Object.entries(specializationCount)
      .sort(([,a], [,b]) => b - a);

    return specializations.length > 0 ? specializations[0][0] : 'General Medicine';
  }
}

module.exports = new AIHealthPredictor();
