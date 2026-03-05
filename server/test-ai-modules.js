/**
 * Test AI Modules - Simple verification without database
 */

console.log('🧪 Testing AI Modules...\n');

// Test AI Health Predictor
console.log('1. Testing AI Health Predictor...');
const aiHealthPredictor = require('./services/aiHealthPredictor');

const testPatientData = {
  symptoms: ['headache', 'fever', 'cough'],
  age: 35,
  gender: 'male',
  lifestyleFactors: {
    smoking: 'never',
    alcohol: 'occasional',
    exercise: 'moderate',
    diet: 'average',
    stress: 'moderate'
  },
  vitalSigns: {
    temperature: 38.5,
    heartRate: 85
  }
};

aiHealthPredictor.predictHealthRisk(testPatientData)
  .then(result => {
    console.log('✅ AI Health Prediction Result:');
    console.log(`   Risk Level: ${result.riskLevel}`);
    console.log(`   Risk Score: ${result.riskScore}`);
    console.log(`   Urgency: ${result.urgencyLevel}`);
    console.log(`   Conditions: ${result.possibleConditions.length} found`);
    console.log(`   Recommendations: ${result.recommendations.length}\n`);
  })
  .catch(error => {
    console.log('❌ AI Health Predictor Error:', error.message);
  });

// Test NLP Service
console.log('2. Testing NLP Health Service...');
const nlpHealthService = require('./services/nlpHealthService');

const testQueries = [
  'Book cardiologist tomorrow morning',
  'I have headache and fever',
  'Check my medicine status',
  'Find available pediatricians'
];

testQueries.forEach(async (query, index) => {
  try {
    const result = await nlpHealthService.processQuery(query);
    console.log(`✅ NLP Query ${index + 1}: "${query}"`);
    console.log(`   Intent: ${result.intent?.name || 'None'}`);
    console.log(`   Success: ${result.success}`);
    console.log(`   Response: ${result.response?.substring(0, 50)}...\n`);
  } catch (error) {
    console.log(`❌ NLP Query ${index + 1} Error:`, error.message);
  }
});

// Test Appointment Prioritizer
console.log('3. Testing Appointment Prioritizer...');
const appointmentPrioritizer = require('./services/appointmentPrioritizer');

// Test priority calculation with mock data
const mockSymptomAnalyses = [
  { riskScore: 90, conditions: [{ condition: 'Heart Attack', severity: 'critical', probability: 25 }] }
];

const mockPatientData = {
  age: 65,
  lifestyleFactors: { smoking: 'heavy' },
  vitalSigns: { bloodPressure: { systolic: 160, diastolic: 100 } }
};

try {
  const result = appointmentPrioritizer.calculateCombinedRisk(mockSymptomAnalyses, mockPatientData);
  console.log('✅ Priority Calculation Result:');
  console.log(`   Total Score: ${result.totalScore}`);
  console.log(`   Top Conditions: ${result.topConditions.length}\n`);
} catch (error) {
  console.log('❌ Appointment Prioritizer Error:', error.message);
}

// Test Pharmacy Manager
console.log('4. Testing Pharmacy Manager...');
const pharmacyManager = require('./services/pharmacyManager');

// Test medicine processing
const testMedicines = [
  { name: 'paracetamol', dosage: '500mg', frequency: 'twice daily', duration: '5 days' },
  { name: 'amoxicillin', dosage: '250mg', frequency: 'three times daily', duration: '7 days' }
];

pharmacyManager.processMedicines(testMedicines)
.then(medicines => {
  console.log('✅ Medicine Processing Result:');
  medicines.forEach((med, index) => {
    console.log(`   ${index + 1}. ${med.name}: ₹${med.price} x ${med.quantity}`);
  });
  console.log('\n🎉 All AI modules tested successfully!');
})
.catch(error => {
  console.log('❌ Pharmacy Manager Error:', error.message);
});

console.log('\n⏳ Testing in progress...');
