const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const PharmacyOrder = require('../models/PharmacyOrder');
const pharmacyManager = require('../services/pharmacyManager-enhanced');
const medicalReportExplainer = require('../services/medicalReportExplainer');

const normalizeAddressValue = (value) => String(value || '').trim().toLowerCase();

const buildNearbyPharmacists = (patientAddress, pharmacists) => {
  const patientCity = normalizeAddressValue(patientAddress?.city);
  const patientState = normalizeAddressValue(patientAddress?.state);
  const patientZip = normalizeAddressValue(patientAddress?.zipCode);

  return (Array.isArray(pharmacists) ? pharmacists : [])
    .map((pharmacist) => {
      const city = normalizeAddressValue(pharmacist?.address?.city);
      const state = normalizeAddressValue(pharmacist?.address?.state);
      const zip = normalizeAddressValue(pharmacist?.address?.zipCode);

      let score = 0;
      if (patientState && state && patientState === state) score += 4;
      if (patientCity && city && patientCity === city) score += 5;
      if (patientZip && zip && patientZip === zip) score += 3;

      const matchLabel = score >= 9
        ? 'very_nearby'
        : score >= 4
          ? 'nearby'
          : 'other_location';

      return {
        _id: pharmacist._id,
        name: pharmacist.name,
        email: pharmacist.email,
        phone: pharmacist.phone,
        address: pharmacist.address || {},
        matchScore: score,
        matchLabel
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore || String(a.name || '').localeCompare(String(b.name || '')));
};

const decodeDataUriText = (dataUri) => {
  const raw = String(dataUri || '').trim();
  if (!raw.startsWith('data:')) return '';

  const commaIndex = raw.indexOf(',');
  if (commaIndex === -1) return '';

  const metadata = raw.slice(5, commaIndex).toLowerCase();
  const payload = raw.slice(commaIndex + 1);
  const isText = metadata.includes('text/plain');
  if (!isText) return '';

  try {
    if (metadata.includes(';base64')) {
      return Buffer.from(payload, 'base64').toString('utf8').trim();
    }

    return decodeURIComponent(payload).trim();
  } catch (error) {
    return '';
  }
};

const getLabReportTextForAnalysis = (labReport) => {
  const reportText = String(labReport?.reportText || '').trim();
  if (reportText) return reportText;

  const decodedText = decodeDataUriText(labReport?.fileData);
  if (decodedText) return decodedText;

  const notes = String(labReport?.notes || '').trim();
  const title = String(labReport?.title || '').trim();
  const fileName = String(labReport?.fileName || '').trim();

  return [title, notes, fileName].filter(Boolean).join(' ').trim();
};

const analyzeLabReportUpload = async (req, res, next) => {
  try {
    const incomingLabReport = req.body?.labReport && typeof req.body.labReport === 'object'
      ? req.body.labReport
      : {};

    const hasFile = Boolean(String(incomingLabReport.fileData || '').trim() || String(incomingLabReport.fileUrl || '').trim());
    const analysisText = getLabReportTextForAnalysis(incomingLabReport);

    if (!hasFile && !analysisText) {
      return res.status(400).json({
        success: false,
        message: 'Upload a lab report file or provide reportText for analysis'
      });
    }

    if (!analysisText || analysisText.length < 5) {
      return res.status(200).json({
        success: true,
        message: 'Lab report uploaded, but infection estimate needs readable report text for better accuracy.',
        data: {
          infectionAssessment: {
            percentage: null,
            confidence: 0.2,
            riskLevel: 'low',
            summary: 'No readable report text detected from upload. Add report text or notes for infection percentage estimation.'
          }
        }
      });
    }

    const explanation = await medicalReportExplainer.explain(analysisText);

    res.status(200).json({
      success: true,
      message: 'Lab report analysis completed successfully',
      data: {
        infectionAssessment: explanation?.infectionAssessment || null,
        overallRisk: explanation?.overallRisk || 'low',
        extracted: explanation?.extracted || [],
        summary: explanation?.summary || ''
      }
    });
  } catch (error) {
    next(error);
  }
};

const getAppointments = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    let query = {};

    if (req.user.role === 'patient') {
      query.patientId = req.user.id;
    } else if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ userId: req.user.id });
      if (doctor) {
        query.doctorId = doctor._id;
      }
    }

    if (req.query.status) {
      query.status = req.query.status;
    }

    if (req.query.priority) {
      query.priority = req.query.priority;
    }

    if (req.query.dateFrom) {
      query.date = { ...query.date, $gte: new Date(req.query.dateFrom) };
    }

    if (req.query.dateTo) {
      query.date = { ...query.date, $lte: new Date(req.query.dateTo) };
    }

    const appointments = await Appointment.find(query)
      .populate('patientId', 'name email phone age gender address')
      .populate('doctorId', 'userId specialization consultationFee')
      .populate({
        path: 'doctorId',
        populate: {
          path: 'userId',
          select: 'name email phone'
        }
      })
      .sort({ date: 1, startTime: 1 })
      .skip(startIndex)
      .limit(limit);

    const total = await Appointment.countDocuments(query);

    res.status(200).json({
      success: true,
      data: appointments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

const getAppointmentById = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patientId', 'name email phone age gender address')
      .populate('doctorId', 'userId specialization consultationFee')
      .populate({
        path: 'doctorId',
        populate: {
          path: 'userId',
          select: 'name email phone'
        }
      });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    if (req.user.role === 'patient' && appointment.patientId._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ userId: req.user.id });
      if (!doctor || appointment.doctorId._id.toString() !== doctor._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: appointment
    });
  } catch (error) {
    next(error);
  }
};

const bookAppointment = async (req, res, next) => {
  try {
    const {
      doctorId,
      date,
      startTime,
      endTime,
      type,
      symptoms,
      description,
      paymentUtr,
      paymentReceiptUrl,
      paymentReceiptImage,
      paymentReceiptName
    } = req.body;
    const isEmergency = type === 'emergency';

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    if (!isEmergency && !doctor?.paymentDetails?.upiId) {
      return res.status(400).json({
        success: false,
        message: 'Doctor has not configured UPI payment details yet'
      });
    }

    if (!isEmergency && (!paymentUtr || !String(paymentUtr).trim())) {
      return res.status(400).json({
        success: false,
        message: 'UTR number is required for payment verification'
      });
    }

    if (!isEmergency && !paymentReceiptUrl && !paymentReceiptImage) {
      return res.status(400).json({
        success: false,
        message: 'Payment receipt is required'
      });
    }

    const appointmentDate = new Date(date);
    if (!doctor.isAvailable(appointmentDate, startTime)) {
      return res.status(400).json({
        success: false,
        message: 'Doctor is not available at the requested time'
      });
    }

    const existingInSlot = await Appointment.countDocuments({
      doctorId,
      date: appointmentDate,
      startTime,
      status: { $in: ['payment_submitted', 'scheduled', 'confirmed', 'in_progress'] }
    });

    if (existingInSlot >= (doctor.maxAppointmentsPerSlot || 1)) {
      return res.status(400).json({
        success: false,
        message: 'Selected time slot has reached its booking limit'
      });
    }

    const appointment = await Appointment.create({
      patientId: req.user.id,
      doctorId,
      date: appointmentDate,
      startTime,
      endTime,
      type,
      symptoms,
      description,
      consultationFee: doctor.consultationFee,
      priority: 'medium',
      status: isEmergency ? 'scheduled' : 'payment_submitted',
      paymentStatus: isEmergency ? 'pending' : 'submitted',
      paymentId: isEmergency ? undefined : String(paymentUtr).trim(),
      paymentProof: isEmergency ? undefined : {
        utrNumber: String(paymentUtr).trim(),
        receiptUrl: paymentReceiptUrl ? String(paymentReceiptUrl).trim() : '',
        receiptImage: paymentReceiptImage || '',
        receiptName: paymentReceiptName ? String(paymentReceiptName).trim() : '',
        submittedAt: new Date()
      }
    });

    if (isEmergency) {
      const timeSlot = doctor.timeSlots.find((slot) =>
        slot.date.toDateString() === appointmentDate.toDateString() &&
        slot.startTime === startTime &&
        !slot.isBooked
      );

      if (timeSlot) {
        timeSlot.isBooked = true;
        timeSlot.bookedBy = req.user.id;
      }

      doctor.totalAppointments += 1;
      await doctor.save();
    }

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('patientId', 'name email phone')
      .populate('doctorId', 'userId specialization consultationFee')
      .populate({
        path: 'doctorId',
        populate: {
          path: 'userId',
          select: 'name email phone'
        }
      });

    try {
      const appointmentPrioritizer = require('../services/appointmentPrioritizer');
      await appointmentPrioritizer.calculatePriorityScore(appointment._id);
    } catch (error) {
      console.error('Error in appointment prioritization:', error);
    }

    res.status(201).json({
      success: true,
      message: isEmergency
        ? 'Emergency appointment created successfully.'
        : 'Payment proof submitted. Awaiting doctor confirmation.',
      data: populatedAppointment
    });
  } catch (error) {
    next(error);
  }
};

const initiateAppointmentPayment = async (req, res, next) => {
  try {
    const { paymentMethod = 'mock' } = req.body;

    const appointment = await Appointment.findById(req.params.id)
      .populate('doctorId', 'consultationFee')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name' }
      });

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (appointment.patientId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.status(200).json({
      success: true,
      message: 'Payment initiated',
      data: {
        appointmentId: appointment._id,
        amount: appointment.consultationFee,
        currency: 'INR',
        paymentMethod,
        orderId: `ORD-${Date.now()}`
      }
    });
  } catch (error) {
    next(error);
  }
};

const confirmAppointmentPayment = async (req, res, next) => {
  try {
    const { paymentId } = req.body;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'paymentId is required'
      });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (appointment.patientId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    appointment.paymentStatus = 'paid';
    appointment.paymentId = paymentId;
    if (appointment.status === 'scheduled') {
      appointment.status = 'confirmed';
    }

    await appointment.save();

    res.status(200).json({
      success: true,
      message: 'Payment confirmed and appointment is now confirmed',
      data: appointment
    });
  } catch (error) {
    next(error);
  }
};

const updateAppointmentStatus = async (req, res, next) => {
  try {
    const { status, cancellationReason } = req.body;

    if (!['payment_submitted', 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    if (req.user.role === 'patient') {
      if (appointment.patientId.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      if (status !== 'cancelled') {
        return res.status(403).json({
          success: false,
          message: 'Patients can only cancel appointments'
        });
      }

      if (!appointment.canBeCancelled()) {
        return res.status(400).json({
          success: false,
          message: 'Appointment cannot be cancelled (less than 2 hours before or already in progress)'
        });
      }
    } else if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ userId: req.user.id });
      if (!doctor || appointment.doctorId.toString() !== doctor._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      if (status === 'confirmed') {
        if (appointment.status !== 'payment_submitted') {
          return res.status(400).json({
            success: false,
            message: 'Only payment-submitted appointments can be confirmed by doctor'
          });
        }

        const bookedCount = await Appointment.countDocuments({
          doctorId: appointment.doctorId,
          date: appointment.date,
          startTime: appointment.startTime,
          status: { $in: ['confirmed', 'in_progress', 'completed'] }
        });

        if (bookedCount >= (doctor.maxAppointmentsPerSlot || 1)) {
          return res.status(400).json({
            success: false,
            message: 'Slot is already full for this time'
          });
        }

        const timeSlot = doctor.timeSlots.find((slot) =>
          slot.date.toDateString() === appointment.date.toDateString() &&
          slot.startTime === appointment.startTime &&
          !slot.isBooked
        );

        if (timeSlot) {
          timeSlot.isBooked = true;
          timeSlot.bookedBy = appointment.patientId;
          await doctor.save();
        }

        appointment.paymentStatus = 'verified';
        if (appointment.paymentProof) {
          appointment.paymentProof.reviewedAt = new Date();
        }

        doctor.totalAppointments += 1;
        await doctor.save();
      }

      if (status === 'cancelled' && appointment.paymentStatus === 'submitted') {
        appointment.paymentStatus = 'rejected';
        if (appointment.paymentProof) {
          appointment.paymentProof.reviewedAt = new Date();
        }
      }
    }

    appointment.status = status;

    if (status === 'cancelled') {
      appointment.cancellationReason = cancellationReason;
      appointment.cancelledBy = req.user.id;

      const doctor = await Doctor.findById(appointment.doctorId);
      const timeSlot = doctor.timeSlots.find((slot) =>
        slot.date.toDateString() === appointment.date.toDateString() &&
        slot.startTime === appointment.startTime &&
        slot.isBooked
      );

      if (timeSlot) {
        timeSlot.isBooked = false;
        timeSlot.bookedBy = null;
        await doctor.save();
      }
    }

    if (status === 'completed') {
      appointment.videoCallEndTime = new Date();

      const doctor = await Doctor.findById(appointment.doctorId);
      doctor.completedAppointments += 1;
      await doctor.save();
    }

    await appointment.save();

    const updatedAppointment = await Appointment.findById(appointment._id)
      .populate('patientId', 'name email phone')
      .populate('doctorId', 'userId specialization')
      .populate({
        path: 'doctorId',
        populate: {
          path: 'userId',
          select: 'name email phone'
        }
      });

    res.status(200).json({
      success: true,
      message: `Appointment status updated to ${status}`,
      data: updatedAppointment
    });
  } catch (error) {
    next(error);
  }
};

const addPrescription = async (req, res, next) => {
  try {
    const { medicines, instructions, followUpDate } = req.body;

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    const doctor = await Doctor.findOne({ userId: req.user.id });
    if (!doctor || appointment.doctorId.toString() !== doctor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    appointment.prescription = {
      medicines,
      instructions,
      followUpDate: followUpDate ? new Date(followUpDate) : undefined,
      issuedAt: new Date()
    };

    await appointment.save();

    if (appointment.prescription && appointment.prescription.medicines.length > 0) {
      try {
        await pharmacyManager.createOrderFromPrescription(appointment._id);
      } catch (error) {
        console.error('Error creating pharmacy order:', error);
      }
    }

    const updatedAppointment = await Appointment.findById(appointment._id)
      .populate('patientId', 'name email phone')
      .populate('doctorId', 'userId specialization');

    res.status(200).json({
      success: true,
      message: 'Prescription added successfully',
      data: updatedAppointment
    });
  } catch (error) {
    next(error);
  }
};

const sendPrescriptionToPharmacyEmergency = async (req, res, next) => {
  try {
    const preferredPharmacistId = String(req.body?.preferredPharmacistId || '').trim();

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    if (req.user.role === 'patient') {
      if (appointment.patientId.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    } else if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ userId: req.user.id }).select('_id');
      if (!doctor || appointment.doctorId.toString() !== doctor._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'Only doctor or patient can send prescription to pharmacy'
      });
    }

    const medicines = appointment?.prescription?.medicines || [];
    const prescriptionFiles = appointment?.prescriptionFiles || [];
    const hasStructuredMedicines = Array.isArray(medicines) && medicines.length > 0;
    const hasPrescriptionImage = Array.isArray(prescriptionFiles) && prescriptionFiles.length > 0;

    if (!hasStructuredMedicines && !hasPrescriptionImage) {
      return res.status(400).json({
        success: false,
        message: 'Doctor must add medicine list or upload prescription image before emergency pre-pack request'
      });
    }

    let resolvedPharmacistId;
    let resolvedPharmacistName = '';
    if (preferredPharmacistId) {
      const pharmacist = await User.findOne({
        _id: preferredPharmacistId,
        role: 'pharmacist',
        isActive: true
      }).select('_id name');

      if (!pharmacist) {
        return res.status(400).json({
          success: false,
          message: 'Selected pharmacist is not available'
        });
      }

      resolvedPharmacistId = pharmacist._id;
      resolvedPharmacistName = String(pharmacist.name || '').trim();
    }

    if (!resolvedPharmacistId) {
      return res.status(400).json({
        success: false,
        message: 'Please select a pharmacy before sending the prescription'
      });
    }

    const order = await pharmacyManager.createOrderFromPrescription(appointment._id, {
      emergencyPrePack: true,
      allowImageOnlyPrescription: true,
      preferredPharmacistId: resolvedPharmacistId,
      requestedBy: req.user.id,
      requestedByRole: req.user.role
    });

    res.status(200).json({
      success: true,
      message: resolvedPharmacistName
        ? `Emergency pre-pack request sent to ${resolvedPharmacistName}. Medicines will be prepared on priority before arrival.`
        : 'Emergency pre-pack request sent to pharmacy. Medicines will be prepared on priority before arrival.',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

const getNearbyPharmacistsForAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patientId', 'name address')
      .populate({ path: 'doctorId', select: 'userId' });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    if (req.user.role === 'patient') {
      if (appointment.patientId?._id?.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    } else if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ userId: req.user.id }).select('_id');
      if (!doctor || appointment.doctorId?._id?.toString() !== doctor._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'Only patient or doctor can view nearby pharmacists for this appointment'
      });
    }

    const pharmacists = await User.find({
      role: 'pharmacist',
      isActive: true
    })
      .select('name email phone address')
      .lean();

    const nearby = buildNearbyPharmacists(appointment?.patientId?.address || {}, pharmacists);

    res.status(200).json({
      success: true,
      message: nearby.length > 0 ? 'Nearby pharmacists fetched successfully' : 'No pharmacists available right now',
      data: {
        appointmentId: appointment._id,
        patientAddress: appointment?.patientId?.address || {},
        pharmacists: nearby
      }
    });
  } catch (error) {
    next(error);
  }
};

const getPharmacyOrderStatusForAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    if (req.user.role === 'patient') {
      if (appointment.patientId.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    } else if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ userId: req.user.id }).select('_id');
      if (!doctor || appointment.doctorId.toString() !== doctor._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'Only doctor or patient can view pharmacy order status for this appointment'
      });
    }

    const order = await PharmacyOrder.findOne({
      prescriptionId: appointment._id,
      status: { $ne: 'cancelled' }
    })
      .populate('assignedPharmacist', 'name')
      .sort({ createdAt: -1 });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'No pharmacy order found yet for this appointment'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Pharmacy order status fetched successfully',
      data: {
        orderId: order.orderId,
        status: order.status,
        statusMessage: ['completed', 'ready'].includes(order.status)
          ? 'The medicines are packed..came and take the order.'
          : null,
        priority: order.priority,
        emergencyPrePack: Boolean(order.emergencyPrePack),
        assignedPharmacist: order.assignedPharmacist?.name || 'Not assigned yet',
        estimatedReadyTime: order.estimatedReadyTime,
        actualReadyTime: order.actualReadyTime,
        updatedAt: order.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

const addDiagnosis = async (req, res, next) => {
  try {
    const { diagnosis } = req.body;

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    const doctor = await Doctor.findOne({ userId: req.user.id });
    if (!doctor || appointment.doctorId.toString() !== doctor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    appointment.diagnosis = diagnosis;
    await appointment.save();

    res.status(200).json({
      success: true,
      message: 'Diagnosis added successfully',
      data: appointment
    });
  } catch (error) {
    next(error);
  }
};

const updateConsultationDetails = async (req, res, next) => {
  try {
    const {
      diagnosis,
      consultationNotes,
      prescription,
      labReport,
      prescriptionFile
    } = req.body;

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    const doctor = await Doctor.findOne({ userId: req.user.id });
    if (!doctor || appointment.doctorId.toString() !== doctor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const hasDiagnosis = typeof diagnosis === 'string' && diagnosis.trim();
    const hasNotes = typeof consultationNotes === 'string' && consultationNotes.trim();
    const hasPrescription = prescription && typeof prescription === 'object';
    const hasLabReport = labReport && typeof labReport === 'object' && (labReport.fileData || labReport.fileUrl);
    const hasPrescriptionFile = prescriptionFile && typeof prescriptionFile === 'object' && (prescriptionFile.fileData || prescriptionFile.fileUrl);

    const prescriptionFileMimeType = String(prescriptionFile?.mimeType || '').trim().toLowerCase();
    const prescriptionFileData = String(prescriptionFile?.fileData || '').trim().toLowerCase();
    const prescriptionFileName = String(prescriptionFile?.fileName || '').trim().toLowerCase();
    const prescriptionFileUrl = String(prescriptionFile?.fileUrl || '').trim().toLowerCase();
    const hasImageMimeType = prescriptionFileMimeType.startsWith('image/');
    const hasImageDataUri = prescriptionFileData.startsWith('data:image/');
    const hasImageFileName = /\.(png|jpg|jpeg|webp|gif|bmp|tif|tiff|heic|heif|svg)$/.test(prescriptionFileName);
    const hasImageFileUrl = /\.(png|jpg|jpeg|webp|gif|bmp|tif|tiff|heic|heif|svg)(\?.*)?$/.test(prescriptionFileUrl);
    const isPrescriptionImage = hasImageMimeType || hasImageDataUri || hasImageFileName || hasImageFileUrl;

    if (!hasDiagnosis && !hasNotes && !hasPrescription && !hasLabReport && !hasPrescriptionFile) {
      return res.status(400).json({
        success: false,
        message: 'Add a prescription, prescription file, or lab report before saving'
      });
    }

    if (hasPrescriptionFile && !isPrescriptionImage) {
      return res.status(400).json({
        success: false,
        message: 'Prescription upload must be an image file'
      });
    }

    if (hasDiagnosis) {
      appointment.diagnosis = diagnosis.trim();
    }

    if (hasNotes) {
      appointment.notes = consultationNotes.trim();
    }

    if (hasPrescription) {
      const medicines = Array.isArray(prescription.medicines)
        ? prescription.medicines
          .filter((medicine) => medicine?.name)
          .map((medicine) => ({
            name: String(medicine.name || '').trim(),
            dosage: String(medicine.dosage || 'As prescribed').trim(),
            frequency: String(medicine.frequency || 'As prescribed').trim(),
            duration: String(medicine.duration || 'As prescribed').trim(),
            instructions: String(medicine.instructions || '').trim()
          }))
        : [];

      appointment.prescription = {
        medicines,
        instructions: String(prescription.instructions || '').trim(),
        followUpDate: prescription.followUpDate ? new Date(prescription.followUpDate) : undefined,
        issuedAt: new Date()
      };
    }

    if (hasLabReport) {
      const reportText = getLabReportTextForAnalysis(labReport);
      let infectionAnalysis;

      if (reportText && reportText.length >= 5) {
        try {
          const explanation = await medicalReportExplainer.explain(reportText);
          if (explanation?.infectionAssessment) {
            infectionAnalysis = {
              percentage: explanation.infectionAssessment.percentage,
              confidence: explanation.infectionAssessment.confidence,
              riskLevel: explanation.infectionAssessment.riskLevel,
              summary: explanation.infectionAssessment.summary,
              analyzedAt: new Date()
            };
          }
        } catch (error) {
          // Continue saving uploaded report even if AI analysis fails.
        }
      }

      appointment.labReports.push({
        title: String(labReport.title || '').trim(),
        fileName: String(labReport.fileName || '').trim(),
        fileData: String(labReport.fileData || '').trim(),
        fileUrl: String(labReport.fileUrl || '').trim(),
        mimeType: String(labReport.mimeType || '').trim(),
        notes: String(labReport.notes || '').trim(),
        infectionAnalysis,
        uploadedAt: new Date(),
        uploadedBy: req.user.id
      });
    }

    if (hasPrescriptionFile) {
      appointment.prescriptionFiles.push({
        title: String(prescriptionFile.title || '').trim(),
        fileName: String(prescriptionFile.fileName || '').trim(),
        fileData: String(prescriptionFile.fileData || '').trim(),
        fileUrl: String(prescriptionFile.fileUrl || '').trim(),
        mimeType: String(prescriptionFile.mimeType || '').trim(),
        notes: String(prescriptionFile.notes || '').trim(),
        uploadedAt: new Date(),
        uploadedBy: req.user.id
      });
    }

    if (['scheduled', 'confirmed'].includes(appointment.status)) {
      appointment.status = 'in_progress';
    }

    await appointment.save();

    if (appointment.prescription?.medicines?.length > 0) {
      try {
        await pharmacyManager.createOrderFromPrescription(appointment._id);
      } catch (error) {
        console.error('Error creating pharmacy order:', error);
      }
    }

    const updatedAppointment = await Appointment.findById(appointment._id)
      .populate('patientId', 'name email phone age gender address')
      .populate('doctorId', 'userId specialization consultationFee')
      .populate({
        path: 'doctorId',
        populate: {
          path: 'userId',
          select: 'name email phone'
        }
      })
      .populate('labReports.uploadedBy', 'name role')
      .populate('prescriptionFiles.uploadedBy', 'name role');

    res.status(200).json({
      success: true,
      message: 'Prescription details updated successfully',
      data: updatedAppointment
    });
  } catch (error) {
    next(error);
  }
};

const startVideoConsultation = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patientId', 'name email')
      .populate({
        path: 'doctorId',
        populate: {
          path: 'userId',
          select: 'name email'
        }
      });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    const doctor = await Doctor.findOne({ userId: req.user.id });
    if (!doctor || appointment.doctorId?._id?.toString() !== doctor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (['cancelled', 'completed', 'no_show'].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot start consultation for ${appointment.status} appointment`
      });
    }

    if (!appointment.videoCallLink) {
      appointment.videoCallLink = `https://meet.jit.si/srgec-consult-${appointment._id}-${Date.now()}`;
    }

    appointment.videoCallStartTime = new Date();

    if (['scheduled', 'confirmed'].includes(appointment.status)) {
      appointment.status = 'in_progress';
    }

    await appointment.save();

    res.status(200).json({
      success: true,
      message: 'Video consultation started',
      data: {
        appointmentId: appointment._id,
        status: appointment.status,
        videoCallLink: appointment.videoCallLink,
        videoCallStartTime: appointment.videoCallStartTime,
        patientName: appointment.patientId?.name || 'Patient'
      }
    });
  } catch (error) {
    next(error);
  }
};

const rateAppointment = async (req, res, next) => {
  try {
    const { score, review } = req.body;

    if (!score || score < 1 || score > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating score must be between 1 and 5'
      });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    if (appointment.patientId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (appointment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Only completed appointments can be rated'
      });
    }

    appointment.rating = {
      score,
      review,
      ratedAt: new Date()
    };

    await appointment.save();

    const doctor = await Doctor.findById(appointment.doctorId);
    const allRatings = await Appointment.find({
      doctorId: doctor._id,
      'rating.score': { $exists: true }
    }).select('rating.score');

    const totalScore = allRatings.reduce((sum, apt) => sum + apt.rating.score, 0);
    doctor.rating.average = totalScore / allRatings.length;
    doctor.rating.count = allRatings.length;
    await doctor.save();

    res.status(200).json({
      success: true,
      message: 'Appointment rated successfully',
      data: appointment
    });
  } catch (error) {
    next(error);
  }
};

const getAppointmentStats = async (req, res, next) => {
  try {
    const totalAppointments = await Appointment.countDocuments();
    const completedAppointments = await Appointment.countDocuments({ status: 'completed' });
    const cancelledAppointments = await Appointment.countDocuments({ status: 'cancelled' });
    const upcomingAppointments = await Appointment.countDocuments({
      status: { $in: ['scheduled', 'confirmed'] },
      date: { $gte: new Date() }
    });

    const byStatus = await Appointment.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const byPriority = await Appointment.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    const revenue = await Appointment.aggregate([
      {
        $match: { status: 'completed', paymentStatus: 'paid' }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$consultationFee' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: totalAppointments,
        completed: completedAppointments,
        cancelled: cancelledAppointments,
        upcoming: upcomingAppointments,
        byStatus,
        byPriority,
        revenue: revenue.length > 0 ? revenue[0].total : 0
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAppointments,
  getAppointmentById,
  bookAppointment,
  initiateAppointmentPayment,
  confirmAppointmentPayment,
  updateAppointmentStatus,
  startVideoConsultation,
  addPrescription,
  sendPrescriptionToPharmacyEmergency,
  getPharmacyOrderStatusForAppointment,
  getNearbyPharmacistsForAppointment,
  analyzeLabReportUpload,
  addDiagnosis,
  updateConsultationDetails,
  rateAppointment,
  getAppointmentStats
};
