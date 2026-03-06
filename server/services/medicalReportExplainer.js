class MedicalReportExplainer {
  constructor() {
    this.externalAi = {
      url: process.env.HEALTH_AI_API_URL || 'https://api.openai.com/v1/chat/completions',
      model: process.env.HEALTH_AI_MODEL || 'gpt-4o-mini',
      apiKey: process.env.HEALTH_AI_API_KEY || process.env.OPENAI_API_KEY || '',
      timeoutMs: Number(process.env.HEALTH_AI_TIMEOUT_MS || 12000)
    };

    this.rules = [
      {
        key: 'hemoglobin',
        regex: /hemoglobin\s*[:=-]?\s*(\d+(?:\.\d+)?)/i,
        normal: { min: 12, max: 17.5 },
        lowMessage: 'Low hemoglobin may indicate anemia. Please consult a doctor for iron, B12, or blood-loss evaluation.',
        highMessage: 'High hemoglobin can be linked to dehydration, smoking, or other conditions. A clinician review is recommended.'
      },
      {
        key: 'blood sugar',
        regex: /(?:blood\s*sugar|glucose|fbs)\s*[:=-]?\s*(\d+(?:\.\d+)?)/i,
        normal: { min: 70, max: 140 },
        lowMessage: 'Low blood sugar may cause dizziness or weakness. Consider quick glucose and medical advice if recurrent.',
        highMessage: 'High blood sugar can indicate diabetes risk. Follow up with HbA1c and physician guidance.'
      },
      {
        key: 'cholesterol',
        regex: /cholesterol\s*[:=-]?\s*(\d+(?:\.\d+)?)/i,
        normal: { min: 125, max: 200 },
        lowMessage: 'Low cholesterol is usually not critical but should be reviewed with your doctor if symptomatic.',
        highMessage: 'High cholesterol increases heart-disease risk. Discuss diet, exercise, and treatment options.'
      },
      {
        key: 'platelets',
        regex: /platelets?\s*[:=-]?\s*(\d+(?:\.\d+)?)/i,
        normal: { min: 150, max: 450 },
        lowMessage: 'Low platelets can increase bleeding risk. Seek medical evaluation.',
        highMessage: 'High platelets may be reactive or disease-related. Clinical review is recommended.'
      }
    ];

    this.symptomRemedyMap = [
      {
        key: 'fever',
        regex: /fever|temperature|chills/i,
        remedies: [
          'Drink warm water and clear fluids frequently to stay hydrated.',
          'Take adequate rest and keep room temperature comfortable.',
          'Use a lukewarm sponge on forehead/body if temperature rises and you feel uncomfortable.'
        ],
        warning: 'Seek urgent care if fever is very high, persists more than 2-3 days, or breathing/confusion develops.'
      },
      {
        key: 'cough',
        regex: /cough|cold|sore throat/i,
        remedies: [
          'Sip warm water or herbal fluids through the day.',
          'Use steam inhalation 1-2 times daily if congestion is present.',
          'Avoid smoke, dust, and very cold drinks while symptoms persist.'
        ],
        warning: 'Seek medical care if cough lasts over 1 week, has blood, or breathing worsens.'
      },
      {
        key: 'headache',
        regex: /headache|migraine|head pain/i,
        remedies: [
          'Hydrate well and rest in a quiet, dark room.',
          'Practice slow breathing for 5-10 minutes to reduce stress-related triggers.',
          'Limit screen exposure and ensure regular sleep timing.'
        ],
        warning: 'Get urgent help if headache is sudden severe, with weakness, vomiting, or vision/speech changes.'
      },
      {
        key: 'stomach',
        regex: /stomach pain|abdominal pain|belly pain|gastric/i,
        remedies: [
          'Eat light meals (khichdi, soup, banana, toast) and avoid oily/spicy food.',
          'Take small frequent meals instead of heavy portions.',
          'Stay hydrated with water or oral fluids.'
        ],
        warning: 'Seek care quickly if pain is severe, persistent, or associated with repeated vomiting.'
      }
    ];
  }

  async explain(reportText) {
    const aiExplanation = await this.getApiBasedExplanation(reportText);
    if (aiExplanation) {
      aiExplanation.infectionAssessment = this.estimateInfectionPercentage(reportText, aiExplanation.extracted || []);
      return aiExplanation;
    }

    const extracted = [];
    const explanations = [];

    for (const rule of this.rules) {
      const match = reportText.match(rule.regex);
      if (!match) continue;

      const value = Number(match[1]);
      let status = 'normal';
      let explanation = `${rule.key} appears within expected range.`;

      if (value < rule.normal.min) {
        status = 'low';
        explanation = rule.lowMessage;
      } else if (value > rule.normal.max) {
        status = 'high';
        explanation = rule.highMessage;
      }

      extracted.push({
        marker: rule.key,
        value,
        normalRange: `${rule.normal.min}-${rule.normal.max}`,
        status
      });

      explanations.push(explanation);
    }

    const symptomFallback = this.getSymptomBasedFallback(reportText);
    const overallRisk = symptomFallback?.overallRisk || this.getOverallRisk(extracted);
    const infectionAssessment = this.estimateInfectionPercentage(reportText, extracted);
    const fallbackSummary = symptomFallback
      ? `${symptomFallback.summary} ${symptomFallback.disclaimer}`
      : 'No known markers were detected. Please share a structured report or consult your clinician for interpretation.';

    return {
      extracted,
      overallRisk,
      infectionAssessment,
      summary: explanations.length
        ? explanations.join(' ')
        : fallbackSummary,
      disclaimer: 'This AI explanation is supportive and not a diagnosis.'
    };
  }

  isExternalAIConfigured() {
    return Boolean(String(this.externalAi.apiKey || '').trim());
  }

  buildExplainPrompt(reportText) {
    return [
      'You are a medical report explainer for patients.',
      'Rules:',
      '- Explain in simple patient-friendly English.',
      '- Prefer healthy, home-based guidance (hydration, diet, rest, breathing, hygiene).',
      '- Do not prescribe medicines, tablets, chemicals, or dosage.',
      '- Add safety escalation signs for urgent situations.',
      '- Return JSON only with schema:',
      '{"summary":"string","overallRisk":"low|medium|high","extracted":[{"marker":"string","value":"string","normalRange":"string","status":"low|normal|high"}],"disclaimer":"string"}',
      'User input:',
      reportText
    ].join('\n');
  }

  async getApiBasedExplanation(reportText) {
    if (!this.isExternalAIConfigured()) {
      return null;
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
            { role: 'system', content: 'Explain medical reports with safe non-pharmaceutical guidance.' },
            { role: 'user', content: this.buildExplainPrompt(reportText) }
          ]
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        return null;
      }

      const parsed = JSON.parse(content);
      const overallRisk = ['low', 'medium', 'high'].includes(String(parsed?.overallRisk || '').toLowerCase())
        ? String(parsed.overallRisk).toLowerCase()
        : 'low';

      return {
        extracted: Array.isArray(parsed?.extracted) ? parsed.extracted : [],
        overallRisk,
        summary: String(parsed?.summary || '').trim() || 'Could not generate explanation. Please consult your clinician.',
        disclaimer: String(parsed?.disclaimer || '').trim() || 'This AI explanation is supportive and not a diagnosis.'
      };
    } catch (error) {
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  getSymptomBasedFallback(reportText) {
    const text = String(reportText || '').trim();
    if (!text) return null;

    const matches = this.symptomRemedyMap.filter((item) => item.regex.test(text));
    if (matches.length === 0) return null;

    const remedies = matches.flatMap((item) => item.remedies).slice(0, 4);
    const warnings = matches.map((item) => item.warning);
    const severeSignal = /shortness of breath|chest pain|faint|confusion|blood|severe/i.test(text);

    const summary = [
      'Home Care Guidance',
      '',
      'Try these steps:',
      ...remedies.map((item) => `• ${item}`),
      '',
      'When to seek care:',
      ...warnings.map((item) => `• ${item}`)
    ].join('\n');

    return {
      summary,
      overallRisk: severeSignal ? 'high' : 'low',
      disclaimer: 'This guidance is supportive and not a diagnosis.'
    };
  }

  getOverallRisk(extracted) {
    if (extracted.some((item) => item.status === 'high' || item.status === 'low')) {
      const abnormalCount = extracted.filter((item) => item.status !== 'normal').length;
      return abnormalCount >= 2 ? 'medium' : 'low';
    }

    return 'low';
  }

  estimateInfectionPercentage(reportText, extracted) {
    const text = String(reportText || '').toLowerCase();
    let score = 12;

    const markerRows = Array.isArray(extracted) ? extracted : [];
    const addScoreFromMarker = (markerName, whenHigh, whenLow = 0) => {
      const row = markerRows.find((item) => String(item?.marker || '').toLowerCase().includes(markerName));
      if (!row) return;
      if (row.status === 'high') score += whenHigh;
      if (row.status === 'low') score += whenLow;
    };

    // Structured lab marker signals
    addScoreFromMarker('wbc', 20);
    addScoreFromMarker('white blood', 20);
    addScoreFromMarker('neutrophil', 18);
    addScoreFromMarker('crp', 20);
    addScoreFromMarker('esr', 12);
    addScoreFromMarker('procalcitonin', 24);
    addScoreFromMarker('platelet', 8);

    // Textual report cues
    if (/infection|infective/i.test(text)) score += 16;
    if (/bacterial|sepsis|septic/i.test(text)) score += 18;
    if (/viral/i.test(text)) score += 10;
    if (/pneumonia|uti|urinary tract infection|cellulitis/i.test(text)) score += 14;
    if (/normal|within normal limits|wnl|negative for infection/i.test(text)) score -= 14;

    // Fever and inflammatory symptoms can raise suspicion when report text includes them.
    if (/fever|chills|rigors|productive cough|pus/i.test(text)) score += 8;

    const bounded = Math.max(1, Math.min(99, Math.round(score)));
    const confidence = markerRows.length > 0 ? 0.78 : (text.length > 60 ? 0.56 : 0.42);
    const riskLevel = bounded >= 70 ? 'high' : bounded >= 40 ? 'medium' : 'low';

    return {
      percentage: bounded,
      confidence: Number(confidence.toFixed(2)),
      riskLevel,
      summary: `Estimated infection likelihood is ${bounded}% based on available report signals.`
    };
  }
}

module.exports = new MedicalReportExplainer();
