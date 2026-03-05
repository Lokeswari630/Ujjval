class MedicalReportExplainer {
  constructor() {
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
  }

  explain(reportText) {
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

    const overallRisk = this.getOverallRisk(extracted);

    return {
      extracted,
      overallRisk,
      summary: explanations.length
        ? explanations.join(' ')
        : 'No known markers were detected. Please share a structured report or consult your clinician for interpretation.',
      disclaimer: 'This AI explanation is supportive and not a diagnosis.'
    };
  }

  getOverallRisk(extracted) {
    if (extracted.some((item) => item.status === 'high' || item.status === 'low')) {
      const abnormalCount = extracted.filter((item) => item.status !== 'normal').length;
      return abnormalCount >= 2 ? 'medium' : 'low';
    }

    return 'low';
  }
}

module.exports = new MedicalReportExplainer();
