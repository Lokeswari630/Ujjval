/**
 * Pharmacy Prioritization Service
 * 
 * This service enhances pharmacy order prioritization with special logic for high-risk patients,
 * emergency medications, and critical conditions.
 */

const PharmacyOrder = require('../models/PharmacyOrder');
const HealthPrediction = require('../models/HealthPrediction');
const MedicineInventory = require('../models/MedicineInventory');

class PharmacyPrioritizer {
  constructor() {
    // Priority weights for pharmacy orders
    this.priorityWeights = {
      healthRisk: 0.35,        // 35% weight to patient health risk
      urgency: 0.25,          // 25% weight to medication urgency
      waitingTime: 0.15,      // 15% weight to waiting time
      age: 0.1,              // 10% weight to age factor
      medicineCriticality: 0.15  // 15% weight to medicine criticality
    };

    // Health risk multipliers
    this.riskMultipliers = {
      low: 0.8,
      medium: 1.0,
      high: 1.5,
      urgent: 2.0
    };

    // Age-based priority multipliers
    this.ageMultipliers = {
      child: 1.3,      // Children get higher priority
      young_adult: 0.9,
      adult: 1.0,
      middle_aged: 1.2,
      senior: 1.6        // Seniors get highest priority
    };

    // Medicine criticality levels
    this.medicineCriticality = {
      antibiotics: 1.5,      // Critical for infections
      emergency: 2.0,         // Emergency medications
      chronic: 1.3,          // Chronic condition medications
      cardiovascular: 1.4,    // Heart medications
      respiratory: 1.2,        // Breathing medications
      pediatric: 1.6,         // Children's medications
      pain_relief: 1.1,       // Pain medications
      controlled: 2.5            // Controlled substances
    };
  }

  /**
   * Calculate enhanced priority score for pharmacy order
   */
  async calculatePharmacyPriority(orderId) {
    try {
      const order = await PharmacyOrder.findById(orderId)
        .populate('patientId', 'name age gender')
        .populate('doctorId', 'userId specialization');

      if (!order) {
        throw new Error('Pharmacy order not found');
      }

      // Get patient's latest health prediction
      const healthPrediction = await HealthPrediction.findOne({
        patientId: order.patientId._id
      }).sort({ predictionDate: -1 });

      // Calculate individual components
      const healthRiskScore = await this.calculateHealthRiskScore(healthPrediction);
      const urgencyScore = this.calculateUrgencyScore(order);
      const waitingTimeScore = this.calculateWaitingTimeScore(order);
      const ageScore = this.calculateAgeScore(order.patientId.age);
      const medicineCriticalityScore = await this.calculateMedicineCriticalityScore(order.medicines);

      // Calculate weighted total score
      const totalScore = 
        (healthRiskScore * this.priorityWeights.healthRisk) +
        (urgencyScore * this.priorityWeights.urgency) +
        (waitingTimeScore * this.priorityWeights.waitingTime) +
        (ageScore * this.priorityWeights.age) +
        (medicineCriticalityScore * this.priorityWeights.medicineCriticality);

      // Apply special multipliers
      let finalScore = totalScore;
      
      // Emergency multiplier
      if (order.priority === 'urgent') {
        finalScore *= 1.8;
      }

      // High-risk patient multiplier
      if (healthPrediction && healthPrediction.aiAnalysis.riskLevel === 'urgent') {
        finalScore *= 1.5;
      }

      // Senior citizen multiplier
      if (order.patientId.age >= 65) {
        finalScore *= 1.2;
      }

      finalScore = Math.min(finalScore, 100);

      const priorityLevel = this.getPriorityLevel(finalScore);

      return {
        orderId,
        totalScore: Math.round(finalScore),
        priorityLevel,
        components: {
          healthRisk: Math.round(healthRiskScore),
          urgency: Math.round(urgencyScore),
          waitingTime: Math.round(waitingTimeScore),
          age: Math.round(ageScore),
          medicineCriticality: Math.round(medicineCriticalityScore)
        },
        reasoning: this.generatePharmacyReasoning({
          healthRiskScore,
          urgencyScore,
          waitingTimeScore,
          ageScore,
          medicineCriticalityScore,
          healthPrediction,
          order
        }),
        specialFlags: this.getSpecialFlags(order, healthPrediction)
      };

    } catch (error) {
      console.error('Error calculating pharmacy priority:', error);
      throw error;
    }
  }

  /**
   * Calculate health risk score from prediction
   */
  calculateHealthRiskScore(healthPrediction) {
    if (!healthPrediction) {
      return 30; // Default medium risk
    }

    const baseScore = {
      low: 20,
      medium: 40,
      high: 70,
      urgent: 90
    };

    let score = baseScore[healthPrediction.aiAnalysis.riskLevel] || 30;

    // Bonus for critical conditions
    const hasCriticalCondition = healthPrediction.aiAnalysis.possibleConditions.some(
      condition => condition.severity === 'critical'
    );

    if (hasCriticalCondition) {
      score += 15;
    }

    // Bonus for multiple severe conditions
    const severeConditions = healthPrediction.aiAnalysis.possibleConditions.filter(
      condition => condition.severity === 'severe'
    ).length;

    if (severeConditions > 1) {
      score += severeConditions * 5;
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate urgency score based on order factors
   */
  calculateUrgencyScore(order) {
    let score = 30; // Base score

    // Prescription urgency
    if (order.urgencyReason) {
      if (order.urgencyReason.toLowerCase().includes('emergency')) {
        score = 95;
      } else if (order.urgencyReason.toLowerCase().includes('urgent')) {
        score = 75;
      } else if (order.urgencyReason.toLowerCase().includes('critical')) {
        score = 85;
      }
    }

    // Delivery option urgency
    if (order.deliveryOption === 'delivery') {
      score += 10;
    }

    // Payment urgency (paid orders get priority)
    if (order.paymentStatus === 'paid') {
      score += 5;
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate waiting time score
   */
  calculateWaitingTimeScore(order) {
    const now = new Date();
    const hoursSinceOrder = (now - order.createdAt) / (1000 * 60 * 60);

    // Scale: 0-6 hours = 20 points, 6-12 hours = 40 points, 12-24 hours = 60 points, 24+ hours = 80 points
    if (hoursSinceOrder <= 6) {
      return 20 + (hoursSinceOrder / 6) * 20;
    } else if (hoursSinceOrder <= 12) {
      return 40 + ((hoursSinceOrder - 6) / 6) * 20;
    } else if (hoursSinceOrder <= 24) {
      return 60 + ((hoursSinceOrder - 12) / 12) * 20;
    } else {
      return Math.min(80 + (hoursSinceOrder - 24) / 24 * 10, 95);
    }
  }

  /**
   * Calculate age-based score
   */
  calculateAgeScore(age) {
    let ageGroup = 'adult';
    
    if (age < 18) ageGroup = 'child';
    else if (age < 30) ageGroup = 'young_adult';
    else if (age < 50) ageGroup = 'adult';
    else if (age < 65) ageGroup = 'middle_aged';
    else ageGroup = 'senior';

    const baseScore = 50;
    const multiplier = this.ageMultipliers[ageGroup] || 1.0;
    
    return baseScore * multiplier;
  }

  /**
   * Calculate medicine criticality score
   */
  async calculateMedicineCriticalityScore(medicines) {
    if (!medicines || medicines.length === 0) {
      return 30; // Default medium criticality
    }

    let totalCriticality = 0;
    let maxCriticality = 0;

    for (const medicine of medicines) {
      const medicineName = medicine.name.toLowerCase();
      let criticality = 1.0; // Default

      // Check for critical medicine categories
      if (medicineName.includes('antibiotic') || medicineName.includes('amoxicillin') || 
          medicineName.includes('azithromycin')) {
        criticality = this.medicineCriticality.antibiotics;
      } else if (medicineName.includes('emergency') || medicineName.includes('epinephrine')) {
        criticality = this.medicineCriticality.emergency;
      } else if (medicineName.includes('insulin') || medicineName.includes('metformin')) {
        criticality = this.medicineCriticality.chronic;
      } else if (medicineName.includes('aspirin') || medicineName.includes('atorvastatin')) {
        criticality = this.medicineCriticality.cardiovascular;
      } else if (medicineName.includes('ventolin') || medicineName.includes('salbutamol')) {
        criticality = this.medicineCriticality.respiratory;
      } else if (medicineName.includes('pediatric') || medicineName.includes('children')) {
        criticality = this.medicineCriticality.pediatric;
      } else if (medicineName.includes('morphine') || medicineName.includes('oxycodone')) {
        criticality = this.medicineCriticality.controlled;
      }

      totalCriticality += criticality;
      maxCriticality = Math.max(maxCriticality, criticality);
    }

    // Average criticality with bonus for highest criticality medicine
    const averageCriticality = totalCriticality / medicines.length;
    const bonusForCritical = maxCriticality >= 2.0 ? 15 : 0;

    return Math.min(averageCriticality * 50 + bonusForCritical, 100);
  }

  /**
   * Get priority level based on score
   */
  getPriorityLevel(score) {
    if (score >= 85) return 'urgent';
    if (score >= 70) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }

  /**
   * Generate reasoning for priority assignment
   */
  generatePharmacyReasoning(components, context) {
    const reasons = [];

    // Health risk reasoning
    if (components.healthRisk >= 70) {
      reasons.push('High-risk patient detected from health prediction');
    } else if (components.healthRisk >= 40) {
      reasons.push('Moderate health risk identified');
    }

    // Urgency reasoning
    if (components.urgency >= 80) {
      reasons.push('Emergency medication request');
    } else if (components.urgency >= 60) {
      reasons.push('Urgent medication needed');
    }

    // Waiting time reasoning
    if (components.waitingTime >= 70) {
      reasons.push('Extended waiting period for medication');
    }

    // Age reasoning
    if (components.age >= 65) {
      reasons.push('Senior citizen priority');
    } else if (components.age >= 60) {
      reasons.push('Child patient priority');
    }

    // Medicine criticality reasoning
    if (components.medicineCriticality >= 75) {
      reasons.push('Critical medication required');
    } else if (components.medicineCriticality >= 60) {
      reasons.push('High-priority medication');
    }

    return reasons.length > 0 ? reasons : ['Standard pharmacy priority assessment'];
  }

  /**
   * Get special flags for order
   */
  getSpecialFlags(order, healthPrediction) {
    const flags = [];

    // Emergency flag
    if (order.priority === 'urgent' || order.urgencyReason?.toLowerCase().includes('emergency')) {
      flags.push({
        type: 'EMERGENCY',
        color: 'red',
        action: 'Process immediately'
      });
    }

    // High-risk patient flag
    if (healthPrediction && ['high', 'urgent'].includes(healthPrediction.aiAnalysis.riskLevel)) {
      flags.push({
        type: 'HIGH_RISK_PATIENT',
        color: 'orange',
        action: 'Expedite processing'
      });
    }

    // Senior citizen flag
    if (order.patientId.age >= 65) {
      flags.push({
        type: 'SENIOR_CITIZEN',
        color: 'blue',
        action: 'Priority processing'
      });
    }

    // Child patient flag
    if (order.patientId.age < 12) {
      flags.push({
        type: 'PEDIATRIC_PATIENT',
        color: 'purple',
        action: 'Careful dosing verification'
      });
    }

    // Controlled substance flag
    const hasControlledMedicine = order.medicines.some(med => 
      med.name.toLowerCase().includes('morphine') || 
      med.name.toLowerCase().includes('oxycodone') ||
      med.name.toLowerCase().includes('tramadol')
    );

    if (hasControlledMedicine) {
      flags.push({
        type: 'CONTROLLED_SUBSTANCE',
        color: 'red',
        action: 'Additional verification required'
      });
    }

    // Fast delivery flag
    if (order.deliveryOption === 'delivery' && order.urgencyReason?.toLowerCase().includes('emergency')) {
      flags.push({
        type: 'FAST_DELIVERY',
        color: 'green',
        action: 'Arrange immediate delivery'
      });
    }

    return flags;
  }

  /**
   * Re-prioritize all pending orders
   */
  async reprioritizeAllOrders() {
    try {
      const pendingOrders = await PharmacyOrder.find({
        status: { $in: ['pending', 'confirmed', 'preparing'] }
      }).populate('patientId', 'name age gender')
        .populate('doctorId', 'userId specialization');

      const prioritizedOrders = await Promise.all(
        pendingOrders.map(async (order) => {
          const priorityData = await this.calculatePharmacyPriority(order._id);
          return {
            ...order.toObject(),
            priority: priorityData
          };
        })
      );

      // Sort by priority score (highest first)
      prioritizedOrders.sort((a, b) => b.priority.totalScore - a.priority.totalScore);

      // Update all orders with new priorities
      await Promise.all(
        prioritizedOrders.map(async (order) => {
          await PharmacyOrder.findByIdAndUpdate(order._id, {
            priority: order.priority.priorityLevel
          });
        })
      );

      return prioritizedOrders;

    } catch (error) {
      console.error('Error re-prioritizing orders:', error);
      throw error;
    }
  }

  /**
   * Get priority queue with enhanced information
   */
  async getEnhancedPriorityQueue() {
    try {
      const prioritizedOrders = await this.reprioritizeAllOrders();

      return {
        queue: prioritizedOrders.map((order, index) => ({
          queuePosition: index + 1,
          orderId: order.orderId,
          patientName: order.patientDetails.name,
          priority: order.priority.priorityLevel,
          priorityScore: order.priority.totalScore,
          estimatedPrepTime: order.preparationTime,
          specialFlags: order.priority.specialFlags,
          urgencyReason: order.urgencyReason,
          medicineCount: order.medicines.length,
          waitingTime: this.calculateWaitingTimeDisplay(order.createdAt)
        })),
        summary: this.generateQueueSummary(prioritizedOrders),
        alerts: this.generateQueueAlerts(prioritizedOrders)
      };

    } catch (error) {
      console.error('Error getting enhanced priority queue:', error);
      throw error;
    }
  }

  /**
   * Calculate waiting time display
   */
  calculateWaitingTimeDisplay(orderDate) {
    const now = new Date();
    const diffMs = now - orderDate;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 24) {
      const days = Math.floor(diffHours / 24);
      const hours = diffHours % 24;
      return `${days}d ${hours}h`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    } else {
      return `${diffMinutes}m`;
    }
  }

  /**
   * Generate enhanced queue summary
   */
  generateQueueSummary(orders) {
    const summary = {
      total: orders.length,
      byPriority: { urgent: 0, high: 0, medium: 0, low: 0 },
      bySpecialFlags: {},
      averagePrepTime: 0,
      highRiskPatients: 0,
      emergencyOrders: 0,
      seniorCitizens: 0
    };

    let totalPrepTime = 0;

    orders.forEach(order => {
      summary.byPriority[order.priority.priorityLevel]++;
      totalPrepTime += order.preparationTime;

      // Count special flags
      order.priority.specialFlags?.forEach(flag => {
        summary.bySpecialFlags[flag.type] = (summary.bySpecialFlags[flag.type] || 0) + 1;
      });

      // Count specific categories
      if (order.priority.specialFlags?.some(f => f.type === 'HIGH_RISK_PATIENT')) {
        summary.highRiskPatients++;
      }
      if (order.priority.specialFlags?.some(f => f.type === 'EMERGENCY')) {
        summary.emergencyOrders++;
      }
      if (order.priority.specialFlags?.some(f => f.type === 'SENIOR_CITIZEN')) {
        summary.seniorCitizens++;
      }
    });

    summary.averagePrepTime = orders.length > 0 ? Math.round(totalPrepTime / orders.length) : 0;

    return summary;
  }

  /**
   * Generate queue alerts
   */
  generateQueueAlerts(orders) {
    const alerts = [];

    // Emergency orders alert
    const emergencyOrders = orders.filter(order => 
      order.priority.specialFlags?.some(f => f.type === 'EMERGENCY')
    );

    if (emergencyOrders.length > 0) {
      alerts.push({
        type: 'EMERGENCY_ORDERS',
        level: 'critical',
        message: `${emergencyOrders.length} emergency orders require immediate processing`,
        count: emergencyOrders.length
      });
    }

    // High-risk patients alert
    const highRiskOrders = orders.filter(order => 
      order.priority.specialFlags?.some(f => f.type === 'HIGH_RISK_PATIENT')
    );

    if (highRiskOrders.length > 0) {
      alerts.push({
        type: 'HIGH_RISK_PATIENTS',
        level: 'warning',
        message: `${highRiskOrders.length} orders for high-risk patients`,
        count: highRiskOrders.length
      });
    }

    // Controlled substances alert
    const controlledOrders = orders.filter(order => 
      order.priority.specialFlags?.some(f => f.type === 'CONTROLLED_SUBSTANCE')
    );

    if (controlledOrders.length > 0) {
      alerts.push({
        type: 'CONTROLLED_SUBSTANCES',
        level: 'info',
        message: `${controlledOrders.length} orders contain controlled substances`,
        count: controlledOrders.length
      });
    }

    return alerts;
  }
}

module.exports = new PharmacyPrioritizer();
