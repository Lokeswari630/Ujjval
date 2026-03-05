/**
 * Enhanced Pharmacy Manager Service
 * 
 * This service integrates with the pharmacy prioritizer for enhanced order processing
 * with special logic for high-risk patients.
 */

const PharmacyOrder = require('../models/PharmacyOrder');
const Appointment = require('../models/Appointment');
const HealthPrediction = require('../models/HealthPrediction');
const pharmacyPrioritizer = require('./pharmacyPrioritizer');

class EnhancedPharmacyManager {
  constructor() {
    // Priority weights for pharmacy orders
    this.priorityWeights = {
      healthRisk: 0.4,        // 40% weight to patient health risk
      urgency: 0.3,           // 30% weight to order urgency
      complexity: 0.2,         // 20% weight to order complexity
      waitingTime: 0.1        // 10% weight to waiting time
    };

    // Preparation time estimates (in minutes)
    this.preparationTimes = {
      simple: 15,      // 1-2 medicines
      moderate: 30,    // 3-5 medicines
      complex: 45,     // 6-10 medicines
      very_complex: 60  // 10+ medicines
    };
  }

  /**
   * Create pharmacy order from prescription with enhanced prioritization
   */
  async createOrderFromPrescription(appointmentId, priorityOverride = null) {
    try {
      // Get appointment with prescription
      const appointment = await Appointment.findById(appointmentId)
        .populate('patientId', 'name email phone address age gender')
        .populate('doctorId', 'userId specialization');

      if (!appointment || !appointment.prescription) {
        throw new Error('Appointment or prescription not found');
      }

      // Check if order already exists
      const existingOrder = await PharmacyOrder.findOne({
        prescriptionId: appointmentId,
        status: { $ne: 'cancelled' }
      });

      if (existingOrder) {
        throw new Error('Pharmacy order already exists for this prescription');
      }

      // Get patient's health prediction for enhanced priority calculation
      const healthPrediction = await HealthPrediction.findOne({
        patientId: appointment.patientId._id
      }).sort({ predictionDate: -1 });

      // Calculate enhanced order priority
      const priority = priorityOverride || await this.calculateEnhancedOrderPriority(
        appointment,
        healthPrediction
      );

      // Process medicines and calculate prices
      const processedMedicines = await this.processMedicines(appointment.prescription.medicines);
      
      // Calculate total amount
      const totalAmount = processedMedicines.reduce((sum, med) => sum + (med.price * med.quantity), 0);

      // Create pharmacy order
      const order = await PharmacyOrder.create({
        prescriptionId: appointmentId,
        patientId: appointment.patientId._id,
        doctorId: appointment.doctorId._id,
        medicines: processedMedicines,
        totalAmount,
        finalAmount: totalAmount,
        priority: priority.level,
        urgencyReason: priority.reason,
        preparationTime: this.calculatePreparationTime(processedMedicines.length),
        patientDetails: {
          name: appointment.patientId.name,
          phone: appointment.patientId.phone,
          address: appointment.patientId.address
        }
      });

      // Calculate and save enhanced priority data
      const enhancedPriority = await pharmacyPrioritizer.calculatePharmacyPriority(order._id);
      
      // Update order with enhanced priority
      await PharmacyOrder.findByIdAndUpdate(order._id, {
        priority: enhancedPriority.priorityLevel
      });

      // Auto-assign priority queue position
      await this.assignEnhancedQueuePosition(order._id);

      // Send notification to patient
      await this.sendNotification(order._id, 'sms', 
        `Your prescription order ${order.orderId} has been received. Priority: ${enhancedPriority.priorityLevel}. Current status: ${order.status}`
      );

      return await this.getOrderWithDetails(order._id);

    } catch (error) {
      console.error('Error creating enhanced pharmacy order:', error);
      throw error;
    }
  }

  /**
   * Calculate enhanced order priority
   */
  async calculateEnhancedOrderPriority(appointment, healthPrediction) {
    let score = 0;
    let reason = '';
    let level = 'medium';

    // Health risk factor (40% weight)
    if (healthPrediction) {
      const riskScores = {
        low: 20,
        medium: 40,
        high: 70,
        urgent: 90
      };
      score += (riskScores[healthPrediction.aiAnalysis.riskLevel] || 30) * 0.4;
      
      if (healthPrediction.aiAnalysis.riskLevel === 'urgent') {
        reason += 'High health risk detected. ';
        level = 'urgent';
      } else if (healthPrediction.aiAnalysis.riskLevel === 'high') {
        reason += 'Moderate-high health risk. ';
        level = 'high';
      }
    }

    // Urgency factor (30% weight)
    const urgencyScores = {
      routine: 20,
      urgent: 60,
      emergency: 95
    };
    score += urgencyScores[appointment.type] * 0.3;
    
    if (appointment.type === 'emergency') {
      reason += 'Emergency prescription. ';
      level = 'urgent';
    }

    // Complexity factor (20% weight)
    const medicineCount = appointment.prescription.medicines.length;
    const complexityScore = Math.min(medicineCount * 10, 100);
    score += complexityScore * 0.2;
    
    if (medicineCount > 5) {
      reason += 'Complex prescription with multiple medicines. ';
    }

    // Waiting time factor (10% weight)
    const hoursSincePrescription = (Date.now() - appointment.updatedAt) / (1000 * 60 * 60);
    const waitingScore = Math.min(hoursSincePrescription * 2, 100);
    score += waitingScore * 0.1;
    
    if (hoursSincePrescription > 24) {
      reason += 'Extended waiting period. ';
    }

    // Age-based priority boost
    if (appointment.patientId.age >= 65) {
      score *= 1.2;
      reason += 'Senior citizen priority. ';
    } else if (appointment.patientId.age < 12) {
      score *= 1.1;
      reason += 'Pediatric priority. ';
    }

    // Determine final priority level
    if (score >= 80) {
      level = 'urgent';
    } else if (score >= 60) {
      level = 'high';
    } else if (score >= 40) {
      level = 'medium';
    } else {
      level = 'low';
    }

    return {
      level,
      score: Math.round(score),
      reason: reason || 'Standard priority assessment'
    };
  }

  /**
   * Process medicines and add pricing with availability check
   */
  async processMedicines(medicines) {
    // Enhanced medicine database with criticality levels
    const medicineDatabase = {
      'paracetamol': { price: 15, available: true, category: 'pain_relief', criticality: 1.0, alternatives: ['crocin', 'calpol'] },
      'ibuprofen': { price: 25, available: true, category: 'pain_relief', criticality: 1.1, alternatives: ['brufen', 'advil'] },
      'amoxicillin': { price: 80, available: true, category: 'antibiotics', criticality: 1.5, alternatives: ['moxikind', 'augmentin'] },
      'azithromycin': { price: 120, available: true, category: 'antibiotics', criticality: 1.5, alternatives: ['azee', 'zithromax'] },
      'omeprazole': { price: 45, available: true, category: 'gastrointestinal', criticality: 1.2, alternatives: ['omee', 'razo'] },
      'metformin': { price: 60, available: true, category: 'endocrine', criticality: 1.3, alternatives: ['glyciphage', 'carbophage'] },
      'atorvastatin': { price: 90, available: true, category: 'cardiovascular', criticality: 1.4, alternatives: ['lipikind', 'storvas'] },
      'salbutamol': { price: 55, available: true, category: 'respiratory', criticality: 1.2, alternatives: ['asthalin', 'duolin'] },
      'insulin': { price: 200, available: true, category: 'endocrine', criticality: 1.3, alternatives: ['huminsulin', 'novorapid'] },
      'ventolin': { price: 150, available: true, category: 'respiratory', criticality: 1.2, alternatives: ['asthalin'] }
    };

    return medicines.map(medicine => {
      const medicineName = medicine.name.toLowerCase();
      const medicineInfo = medicineDatabase[medicineName] || { 
        price: 50, 
        available: true, 
        category: 'general',
        criticality: 1.0,
        alternatives: [] 
      };

      return {
        ...medicine,
        price: medicineInfo.price,
        available: medicineInfo.available,
        category: medicineInfo.category,
        criticality: medicineInfo.criticality,
        alternatives: medicineInfo.alternatives.map(alt => ({
          name: alt,
          price: medicineInfo.price * (0.8 + Math.random() * 0.4), // 80-120% of original price
          reason: 'Alternative brand available'
        })),
        quantity: this.calculateQuantity(medicine.duration, medicine.frequency)
      };
    });
  }

  /**
   * Calculate medicine quantity based on duration and frequency
   */
  calculateQuantity(duration, frequency) {
    // Parse duration (e.g., "7 days", "2 weeks")
    const durationMatch = duration.match(/(\d+)\s*(day|week|month)/i);
    if (!durationMatch) return 30; // Default quantity

    const [, amount, unit] = durationMatch;
    let days = parseInt(amount);
    
    if (unit.toLowerCase().includes('week')) {
      days *= 7;
    } else if (unit.toLowerCase().includes('month')) {
      days *= 30;
    }

    // Parse frequency (e.g., "twice daily", "once daily")
    let frequencyMultiplier = 1;
    if (frequency.includes('twice') || frequency.includes('2')) {
      frequencyMultiplier = 2;
    } else if (frequency.includes('thrice') || frequency.includes('3')) {
      frequencyMultiplier = 3;
    } else if (frequency.includes('four') || frequency.includes('4')) {
      frequencyMultiplier = 4;
    }

    return days * frequencyMultiplier;
  }

  /**
   * Calculate preparation time based on number of medicines and criticality
   */
  calculatePreparationTime(medicineCount) {
    let baseTime = this.preparationTimes.simple;
    
    if (medicineCount <= 2) baseTime = this.preparationTimes.simple;
    else if (medicineCount <= 5) baseTime = this.preparationTimes.moderate;
    else if (medicineCount <= 10) baseTime = this.preparationTimes.complex;
    else baseTime = this.preparationTimes.very_complex;

    return baseTime;
  }

  /**
   * Assign enhanced queue position based on priority
   */
  async assignEnhancedQueuePosition(orderId) {
    try {
      const order = await PharmacyOrder.findById(orderId);
      if (!order) return;

      // Get all pending orders with their priority scores
      const pendingOrders = await PharmacyOrder.find({
        status: { $in: ['pending', 'confirmed', 'preparing'] }
      }).sort({ createdAt: 1 });

      // Calculate priority scores for all orders (simplified)
      const prioritizedOrders = await Promise.all(
        pendingOrders.map(async (order) => {
          const priorityScore = await pharmacyPrioritizer.calculatePharmacyPriority(order._id);
          return {
            orderId: order._id,
            priorityScore: priorityScore.totalScore,
            priorityLevel: priorityScore.priorityLevel
          };
        })
      );

      // Sort by priority score (highest first)
      prioritizedOrders.sort((a, b) => b.priorityScore - a.priorityScore);

      // Find position of current order
      const queuePosition = prioritizedOrders.findIndex(o => o.orderId.toString() === orderId) + 1;
      
      // Calculate estimated ready time based on queue position
      let totalPrepTime = 0;
      for (let i = 0; i < queuePosition - 1; i++) {
        const orderData = prioritizedOrders[i];
        const orderDoc = await PharmacyOrder.findById(orderData.orderId);
        totalPrepTime += orderDoc.preparationTime;
      }

      order.estimatedReadyTime = new Date(Date.now() + totalPrepTime * 60 * 1000);
      await order.save();

      return queuePosition;

    } catch (error) {
      console.error('Error assigning enhanced queue position:', error);
    }
  }

  /**
   * Get enhanced pharmacy queue with prioritization
   */
  async getEnhancedPharmacyQueue(status = 'all') {
    try {
      const queue = await pharmacyPrioritizer.getEnhancedPriorityQueue();
      
      // Filter by status if specified
      let filteredQueue = queue.queue;
      if (status !== 'all') {
        filteredQueue = queue.queue.filter(order => order.status === status);
      }

      return {
        queue: filteredQueue,
        summary: queue.summary,
        alerts: queue.alerts,
        filters: { status }
      };

    } catch (error) {
      console.error('Error getting enhanced pharmacy queue:', error);
      throw error;
    }
  }

  /**
   * Update order status with enhanced priority recalculation
   */
  async updateOrderStatus(orderId, newStatus, updatedBy, reason = '') {
    try {
      const order = await PharmacyOrder.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const oldStatus = order.status;
      await order.updateStatus(newStatus, updatedBy, reason);

      // Recalculate priority if status changes significantly
      if (['confirmed', 'preparing'].includes(newStatus) && !['confirmed', 'preparing'].includes(oldStatus)) {
        const priorityData = await pharmacyPrioritizer.calculatePharmacyPriority(orderId);
        order.priority = priorityData.priorityLevel;
        await order.save();
      }

      // Send notifications based on status change
      await this.sendStatusUpdateNotification(order, oldStatus, newStatus);

      // Reassign queue positions if needed
      if (['confirmed', 'preparing', 'ready'].includes(newStatus)) {
        await this.reassignEnhancedQueuePositions();
      }

      return await this.getOrderWithDetails(orderId);

    } catch (error) {
      console.error('Error updating enhanced order status:', error);
      throw error;
    }
  }

  /**
   * Reassign enhanced queue positions after status changes
   */
  async reassignEnhancedQueuePositions() {
    try {
      const pendingOrders = await PharmacyOrder.find({
        status: { $in: ['pending', 'confirmed', 'preparing'] }
      }).sort({ createdAt: 1 });

      const prioritizedOrders = await Promise.all(
        pendingOrders.map(async (order) => {
          const priorityData = await pharmacyPrioritizer.calculatePharmacyPriority(order._id);
          return {
            orderId: order._id,
            priorityScore: priorityData.totalScore
          };
        })
      );

      // Sort by priority score
      prioritizedOrders.sort((a, b) => b.priorityScore - a.priorityScore);

      // Update estimated ready times
      let totalPrepTime = 0;
      for (const orderData of prioritizedOrders) {
        const order = await PharmacyOrder.findById(orderData.orderId);
        order.estimatedReadyTime = new Date(Date.now() + totalPrepTime * 60 * 1000);
        await order.save();
        totalPrepTime += order.preparationTime;
      }

    } catch (error) {
      console.error('Error reassigning enhanced queue positions:', error);
    }
  }

  /**
   * Send status update notification with priority awareness
   */
  async sendStatusUpdateNotification(order, oldStatus, newStatus) {
    const statusMessages = {
      confirmed: `Your high-priority order ${order.orderId} has been confirmed. Estimated ready time: ${order.estimatedReadyTime}`,
      preparing: `Your order ${order.orderId} is being prepared with priority attention`,
      ready: `Your priority order ${order.orderId} is ready for ${order.deliveryOption === 'delivery' ? 'delivery' : 'pickup'}`,
      dispatched: `Your order ${order.orderId} has been dispatched`,
      delivered: `Your order ${order.orderId} has been delivered`,
      cancelled: `Your order ${order.orderId} has been cancelled`
    };

    const message = statusMessages[newStatus];
    if (message) {
      await this.sendNotification(order._id, 'sms', message);
    }
  }

  /**
   * Send notification (mock implementation)
   */
  async sendNotification(orderId, type, message) {
    try {
      const order = await PharmacyOrder.findById(orderId);
      if (!order) return;

      order.notifications.push({
        type,
        message,
        sentAt: new Date(),
        status: 'sent'
      });

      await order.save();

      console.log(`Priority notification sent to ${order.patientDetails.phone}: ${message}`);
      
    } catch (error) {
      console.error('Error sending priority notification:', error);
    }
  }

  /**
   * Get order with full details
   */
  async getOrderWithDetails(orderId) {
    return await PharmacyOrder.findById(orderId)
      .populate('patientId', 'name email phone address')
      .populate('doctorId', 'userId specialization')
      .populate('assignedPharmacist', 'name')
      .populate('notes.addedBy', 'name')
      .populate('qualityCheck.checkedBy', 'name');
  }

  /**
   * Get patient's order history with priority insights
   */
  async getPatientOrderHistory(patientId, limit = 10) {
    const orders = await PharmacyOrder.find({ patientId })
      .populate('doctorId', 'userId specialization')
      .sort({ createdAt: -1 })
      .limit(limit);

    // Add priority insights
    return await Promise.all(
      orders.map(async (order) => {
        const priorityData = await pharmacyPrioritizer.calculatePharmacyPriority(order._id);
        return {
          ...order.toObject(),
          priorityInsights: {
            score: priorityData.totalScore,
            level: priorityData.priorityLevel,
            reasoning: priorityData.reasoning,
            specialFlags: priorityData.specialFlags
          }
        };
      })
    );
  }

  /**
   * Get enhanced pharmacy statistics with priority analytics
   */
  async getEnhancedPharmacyStats(dateRange = 'today') {
    try {
      const dateFilter = this.getDateFilter(dateRange);
      
      const stats = await PharmacyOrder.aggregate([
        { $match: { createdAt: dateFilter } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$finalAmount' },
            averageOrderValue: { $avg: '$finalAmount' },
            byStatus: {
              $push: '$status'
            },
            byPriority: {
              $push: '$priority'
            },
            highRiskOrders: {
              $sum: {
                $cond: [
                  { $eq: ['$priority', 'urgent'] },
                  1,
                  0
                ]
              }
            },
            averagePrepTime: { $avg: '$preparationTime' }
          }
        }
      ]);

      const result = stats[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        byStatus: [],
        byPriority: [],
        highRiskOrders: 0,
        averagePrepTime: 0
      };

      // Count by status and priority
      result.byStatusCount = this.countArrayValues(result.byStatus);
      result.byPriorityCount = this.countArrayValues(result.byPriority);

      // Add priority metrics
      result.priorityMetrics = {
        urgentPercentage: result.totalOrders > 0 ? 
          ((result.byPriorityCount.urgent || 0) / result.totalOrders * 100).toFixed(1) : 0,
        highRiskPercentage: result.totalOrders > 0 ? 
          (result.highRiskOrders / result.totalOrders * 100).toFixed(1) : 0
      };

      return result;

    } catch (error) {
      console.error('Error getting enhanced pharmacy stats:', error);
      throw error;
    }
  }

  /**
   * Get date filter for queries
   */
  getDateFilter(range) {
    const now = new Date();
    switch (range) {
      case 'today':
        return {
          $gte: new Date(now.setHours(0, 0, 0, 0)),
          $lte: new Date(now.setHours(23, 59, 59, 999))
        };
      case 'week':
        return {
          $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        };
      case 'month':
        return {
          $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        };
      default:
        return { $lte: now };
    }
  }

  /**
   * Count occurrences in array
   */
  countArrayValues(arr) {
    return arr.reduce((acc, val) => {
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {});
  }
}

module.exports = new EnhancedPharmacyManager();
