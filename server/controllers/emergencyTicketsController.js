const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const EmergencyTicket = require('../models/EmergencyTicket');

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const createEmergencyTicket = async (req, res, next) => {
  try {
    const {
      hospital,
      incidentType,
      description,
      symptoms
    } = req.body;

    const trimmedHospital = String(hospital || '').trim();
    const trimmedDescription = String(description || '').trim();

    if (!trimmedHospital) {
      return res.status(400).json({
        success: false,
        message: 'Hospital is required'
      });
    }

    if (!incidentType) {
      return res.status(400).json({
        success: false,
        message: 'Incident type is required'
      });
    }

    if (!trimmedDescription) {
      return res.status(400).json({
        success: false,
        message: 'Incident description is required'
      });
    }

    const hospitalRegex = new RegExp(`^${escapeRegex(trimmedHospital)}$`, 'i');

    const doctorsInHospital = await Doctor.find({ hospital: hospitalRegex })
      .populate('userId', 'name');

    if (doctorsInHospital.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No doctors found in selected hospital'
      });
    }

    const doctorIdsInHospital = doctorsInHospital.map((doctor) => doctor._id);

    const relatedDoctorIds = await Appointment.distinct('doctorId', {
      patientId: req.user.id,
      doctorId: { $in: doctorIdsInHospital },
      status: { $in: ['payment_submitted', 'scheduled', 'confirmed', 'in_progress', 'completed'] }
    });

    const relatedDoctorIdSet = new Set(relatedDoctorIds.map((id) => id.toString()));

    const notifiedDoctors = doctorsInHospital.map((doctor) => ({
      doctorId: doctor._id,
      isPrimary: relatedDoctorIdSet.has(doctor._id.toString())
    }));

    const cleanedSymptoms = Array.isArray(symptoms)
      ? symptoms.map((symptom) => String(symptom).trim()).filter(Boolean)
      : [];

    const ticket = await EmergencyTicket.create({
      patientId: req.user.id,
      hospital: trimmedHospital,
      incidentType,
      description: trimmedDescription,
      symptoms: cleanedSymptoms,
      status: 'open',
      notifiedDoctors
    });

    const populatedTicket = await EmergencyTicket.findById(ticket._id)
      .populate('patientId', 'name phone age gender')
      .populate({
        path: 'notifiedDoctors.doctorId',
        select: 'specialization hospital userId',
        populate: {
          path: 'userId',
          select: 'name phone'
        }
      });

    res.status(201).json({
      success: true,
      message: 'Emergency incident ticket raised for hospital doctors.',
      data: populatedTicket
    });
  } catch (error) {
    next(error);
  }
};

const getDoctorEmergencyFeed = async (req, res, next) => {
  try {
    const doctorProfile = await Doctor.findOne({ userId: req.user.id });

    if (!doctorProfile || !doctorProfile.hospital) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }

    const hospitalRegex = new RegExp(`^${escapeRegex(doctorProfile.hospital)}$`, 'i');

    const tickets = await EmergencyTicket.find({
      hospital: hospitalRegex,
      status: { $in: ['open', 'acknowledged'] }
    })
      .populate('patientId', 'name phone age gender')
      .populate({
        path: 'notifiedDoctors.doctorId',
        select: 'specialization hospital userId',
        populate: {
          path: 'userId',
          select: 'name phone'
        }
      })
      .sort({ createdAt: -1 })
      .limit(50);

    const formatted = tickets
      .map((ticket) => {
        const myNotification = ticket.notifiedDoctors.find(
          (notice) => notice?.doctorId?._id?.toString() === doctorProfile._id.toString()
        );

        const primaryDoctors = ticket.notifiedDoctors
          .filter((notice) => notice.isPrimary)
          .map((notice) => ({
            doctorId: notice?.doctorId?._id,
            doctorName: notice?.doctorId?.userId?.name || 'Doctor',
            specialization: notice?.doctorId?.specialization || ''
          }));

        return {
          _id: ticket._id,
          hospital: ticket.hospital,
          incidentType: ticket.incidentType,
          description: ticket.description,
          symptoms: ticket.symptoms || [],
          status: ticket.status,
          createdAt: ticket.createdAt,
          patient: ticket.patientId,
          isHighlighted: Boolean(myNotification?.isPrimary),
          primaryDoctors,
          totalNotifiedDoctors: ticket.notifiedDoctors.length
        };
      })
      .sort((left, right) => {
        if (left.isHighlighted !== right.isHighlighted) {
          return left.isHighlighted ? -1 : 1;
        }

        return new Date(right.createdAt) - new Date(left.createdAt);
      });

    res.status(200).json({
      success: true,
      data: formatted
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createEmergencyTicket,
  getDoctorEmergencyFeed
};
