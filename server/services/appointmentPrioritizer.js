/**
 * Appointment Prioritization Service
 * 
 * This service uses AI health predictions and other factors to prioritize appointments
 * ensuring high-risk patients get seen first.
 */

const HealthPrediction = require('../models/HealthPrediction');
const Appointment = require('../models/Appointment');

class AppointmentPrioritizer {
  constructor() {
    // Priority score weights
    this.weights = {
      healthRisk: 0.4,        // 40% weight to AI health risk
      urgency: 0.25,          // 25% weight to appointment urgency
      waitingTime: 0.15,      // 15% weight to waiting time
      age: 0.1,              // 10% weight to age factor
      complexity: 0.1         // 10% weight to case complexity
    };

    // Risk level to score mapping
    this.riskScores = {
      low: 20,
      medium: 40,
      high: 70,
      urgent: 90
    };

    // Urgency level to score mapping
    this.urgencyScores = {
      routine: 20,
      urgent: 60,
      emergency: 95
    };

    // Age group multipliers
    this.ageMultipliers = {
      child: 1.2,           // Children get slightly higher priority
      young_adult: 0.9,
      adult: 1.0,
      middle_aged: 1.1,
      senior: 1.3            // Seniors get higher priority
    };
  }

  /**
   * Calculate priority score for an appointment
   */
  async calculatePriorityScore(appointmentId) {
    try {
      const appointment = await Appointment.findById(appointmentId)
        .populate('patientId', 'name age gender');

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      // Get latest health prediction for the patient
      const healthPrediction = await HealthPrediction.findOne({
        patientId: appointment.patientId._id
      }).sort({ predictionDate: -1 });

      // Calculate individual components
      const healthRiskScore = this.calculateHealthRiskScore(healthPrediction);
      const urgencyScore = this.calculateUrgencyScore(appointment);
      const waitingTimeScore = this.calculateWaitingTimeScore(appointment);
      const ageScore = this.calculateAgeScore(appointment.patientId.age);
      const complexityScore = this.calculateComplexityScore(appointment);

      // Calculate weighted total score
      const totalScore = 
        (healthRiskScore * this.weights.healthRisk) +
        (urgencyScore * this.weights.urgency) +
        (waitingTimeScore * this.weights.waitingTime) +
        (ageScore * this.weights.age) +
        (complexityScore * this.weights.complexity);

      // Determine priority level
      const priorityLevel = this.getPriorityLevel(totalScore);

      return {
        appointmentId,
        totalScore: Math.round(totalScore),
        priorityLevel,
        components: {
          healthRisk: Math.round(healthRiskScore),
          urgency: Math.round(urgencyScore),
          waitingTime: Math.round(waitingTimeScore),
          age: Math.round(ageScore),
          complexity: Math.round(complexityScore)
        },
        reasoning: this.generateReasoning({
          healthRiskScore,
          urgencyScore,
          waitingTimeScore,
          ageScore,
          complexityScore,
          healthPrediction,
          appointment
        })
      };

    } catch (error) {
      console.error('Error calculating priority score:', error);
      throw error;
    }
  }

  /**
   * Calculate health risk score based on AI prediction
   */
  calculateHealthRiskScore(healthPrediction) {
    if (!healthPrediction) {
      return 30; // Default medium risk if no prediction
    }

    const baseScore = this.riskScores[healthPrediction.aiAnalysis.riskLevel] || 30;
    
    // Add bonus for high-risk conditions
    let bonus = 0;
    healthPrediction.aiAnalysis.possibleConditions.forEach(condition => {
      if (condition.severity === 'critical') {
        bonus += 10;
      } else if (condition.severity === 'severe') {
        bonus += 5;
      }
    });

    return Math.min(baseScore + bonus, 100);
  }

  /**
   * Calculate urgency score based on appointment type and symptoms
   */
  calculateUrgencyScore(appointment) {
    let score = this.urgencyScores[appointment.type] || 30;

    // Check for emergency keywords in symptoms
    if (appointment.symptoms && appointment.symptoms.length > 0) {
      const emergencyKeywords = [
        'chest pain', 'difficulty breathing', 'severe pain', 
        'unconscious', 'bleeding', 'heart attack', 'stroke'
      ];

      const hasEmergencySymptom = appointment.symptoms.some(symptom =>
        emergencyKeywords.some(keyword => 
          symptom.toLowerCase().includes(keyword.toLowerCase())
        )
      );

      if (hasEmergencySymptom) {
        score = 95;
      }
    }

    return score;
  }

  /**
   * Calculate waiting time score (longer wait = higher priority)
   */
  calculateWaitingTimeScore(appointment) {
    const now = new Date();
    const appointmentDate = new Date(appointment.date);
    const [hours, minutes] = appointment.startTime.split(':');
    appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const hoursSinceBooking = (now - appointment.createdAt) / (1000 * 60 * 60);

    // Scale: 0-24 hours = 20 points, 24-48 hours = 40 points, 48+ hours = 60 points
    if (hoursSinceBooking <= 24) {
      return 20 + (hoursSinceBooking / 24) * 20;
    } else if (hoursSinceBooking <= 48) {
      return 40 + ((hoursSinceBooking - 24) / 24) * 20;
    } else {
      return Math.min(60 + (hoursSinceBooking - 48) / 24 * 10, 80);
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
   * Calculate complexity score based on symptoms and description
   */
  calculateComplexityScore(appointment) {
    let score = 30; // Base complexity

    // Add points for multiple symptoms
    if (appointment.symptoms) {
      score += Math.min(appointment.symptoms.length * 5, 20);
    }

    // Add points for detailed description
    if (appointment.description && appointment.description.length > 100) {
      score += 10;
    }

    // Add points for follow-up appointments (might be more complex)
    if (appointment.type === 'follow_up') {
      score += 15;
    }

    return Math.min(score, 100);
  }

  /**
   * Get priority level based on score
   */
  getPriorityLevel(score) {
    if (score >= 80) return 'urgent';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * Generate reasoning for priority assignment
   */
  generateReasoning(components) {
    const reasons = [];

    // Health risk reasoning
    if (components.healthRiskScore >= 70) {
      reasons.push('High health risk detected from AI analysis');
    } else if (components.healthRiskScore >= 40) {
      reasons.push('Moderate health risk identified');
    }

    // Urgency reasoning
    if (components.urgencyScore >= 90) {
      reasons.push('Emergency symptoms detected');
    } else if (components.urgencyScore >= 60) {
      reasons.push('Urgent medical attention required');
    }

    // Waiting time reasoning
    if (components.waitingTimeScore >= 60) {
      reasons.push('Extended waiting period');
    }

    // Age reasoning
    if (components.ageScore >= 65) {
      reasons.push('High-risk age group');
    }

    // Complexity reasoning
    if (components.complexityScore >= 60) {
      reasons.push('Complex medical case');
    }

    return reasons.length > 0 ? reasons : ['Standard priority assessment'];
  }

  /**
   * Prioritize appointments for a doctor
   */
  async prioritizeDoctorAppointments(doctorId, date) {
    try {
      // Get all appointments for the doctor on the specified date
      const appointments = await Appointment.find({
        doctorId,
        date: {
          $gte: new Date(date.setHours(0, 0, 0, 0)),
          $lt: new Date(date.setHours(23, 59, 59, 999))
        },
        status: { $in: ['scheduled', 'confirmed'] }
      }).populate('patientId', 'name age gender');

      // Calculate priority scores for all appointments
      const prioritizedAppointments = await Promise.all(
        appointments.map(async (appointment) => {
          const priorityData = await this.calculatePriorityScore(appointment._id);
          return {
            ...appointment.toObject(),
            priority: priorityData
          };
        })
      );

      // Sort by priority score (highest first)
      prioritizedAppointments.sort((a, b) => b.priority.totalScore - a.priority.totalScore);

      // Update appointments with new priority
      await Promise.all(
        prioritizedAppointments.map(async (appointment) => {
          await Appointment.findByIdAndUpdate(appointment._id, {
            priority: appointment.priority.priorityLevel
          });
        })
      );

      return prioritizedAppointments;

    } catch (error) {
      console.error('Error prioritizing appointments:', error);
      throw error;
    }
  }

  /**
   * Get prioritized queue for a doctor
   */
  async getDoctorQueue(doctorId, date = new Date()) {
    try {
      const prioritizedAppointments = await this.prioritizeDoctorAppointments(doctorId, date);
      
      return {
        doctorId,
        date,
        queue: prioritizedAppointments.map((appointment, index) => ({
          queuePosition: index + 1,
          appointmentId: appointment._id,
          patientName: appointment.patientId.name,
          startTime: appointment.startTime,
          priority: appointment.priority.priorityLevel,
          priorityScore: appointment.priority.totalScore,
          estimatedWaitTime: this.calculateEstimatedWaitTime(index, appointment.startTime),
          reasoning: appointment.priority.reasoning
        })),
        summary: this.generateQueueSummary(prioritizedAppointments)
      };

    } catch (error) {
      console.error('Error getting doctor queue:', error);
      throw error;
    }
  }

  /**
   * Calculate estimated wait time
   */
  calculateEstimatedWaitTime(queuePosition, startTime) {
    const averageConsultationTime = 20; // minutes
    return queuePosition * averageConsultationTime;
  }

  /**
   * Generate queue summary
   */
  generateQueueSummary(appointments) {
    const summary = {
      total: appointments.length,
      byPriority: {
        urgent: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      averageWaitTime: 0
    };

    appointments.forEach((appointment, index) => {
      summary.byPriority[appointment.priority.priorityLevel]++;
      summary.averageWaitTime += this.calculateEstimatedWaitTime(index, appointment.startTime);
    });

    summary.averageWaitTime = Math.round(summary.averageWaitTime / appointments.length);

    return summary;
  }

  /**
   * Auto-prioritize all appointments for today
   */
  async autoPrioritizeTodayAppointments() {
    try {
      const today = new Date();
      const doctors = await Doctor.find({ isVerified: true });

      const results = await Promise.all(
        doctors.map(async (doctor) => {
          try {
            const queue = await this.getDoctorQueue(doctor._id, today);
            return {
              doctorId: doctor._id,
              success: true,
              queue
            };
          } catch (error) {
            return {
              doctorId: doctor._id,
              success: false,
              error: error.message
            };
          }
        })
      );

      return results;

    } catch (error) {
      console.error('Error in auto-prioritization:', error);
      throw error;
    }
  }
}

module.exports = new AppointmentPrioritizer();
