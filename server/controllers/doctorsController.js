const Doctor = require('../models/Doctor');
const User = require('../models/User');

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getDoctors = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const query = {};

    if (req.query.isVerified === 'true') {
      query.isVerified = true;
    }

    if (req.query.isVerified === 'false') {
      query.isVerified = false;
    }

    if (req.query.specialization) {
      query.specialization = req.query.specialization;
    }

    if (req.query.search) {
      const users = await User.find({
        name: { $regex: req.query.search, $options: 'i' },
        role: 'doctor'
      }).select('_id');

      query.userId = { $in: users.map((user) => user._id) };
    }

    const doctors = await Doctor.find(query)
      .populate('userId', 'name email phone profileImage address')
      .sort({ rating: -1, createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    const total = await Doctor.countDocuments(query);

    res.status(200).json({
      success: true,
      data: doctors,
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

const getDoctorBookingOptions = async (req, res, next) => {
  try {
    const stateParam = String(req.query.state || '').trim();
    const districtParam = String(req.query.district || '').trim();
    const hospitalParam = String(req.query.hospital || '').trim();
    const specializationParam = String(req.query.specialization || '').trim();

    const nearbyState = !stateParam && !hospitalParam
      ? String(req.user?.address?.state || '').trim()
      : '';

    const effectiveState = stateParam || nearbyState;

    const allDoctorUsers = await User.find({ role: 'doctor' })
      .select('_id address city state');

    const stateRegex = effectiveState ? new RegExp(`^${escapeRegex(effectiveState)}$`, 'i') : null;

    let stateScopedDoctorUsers = stateRegex
      ? allDoctorUsers.filter((user) => {
        const nestedState = String(user?.address?.state || '').trim();
        const legacyState = String(user?.state || '').trim();
        return stateRegex.test(nestedState) || stateRegex.test(legacyState);
      })
      : allDoctorUsers;

    if (stateRegex && stateScopedDoctorUsers.length === 0) {
      stateScopedDoctorUsers = allDoctorUsers;
    }

    const districtRegex = districtParam ? new RegExp(`^${escapeRegex(districtParam)}$`, 'i') : null;

    const hasDistrictData = stateScopedDoctorUsers.some((user) => {
      const nestedCity = String(user?.address?.city || '').trim();
      const legacyCity = String(user?.city || '').trim();
      return Boolean(nestedCity || legacyCity);
    });

    let scopedDoctorUsers = districtRegex && hasDistrictData
      ? stateScopedDoctorUsers.filter((user) => {
        const nestedCity = String(user?.address?.city || '').trim();
        const legacyCity = String(user?.city || '').trim();
        return districtRegex.test(nestedCity) || districtRegex.test(legacyCity);
      })
      : stateScopedDoctorUsers;

    if (districtRegex && scopedDoctorUsers.length === 0) {
      scopedDoctorUsers = stateScopedDoctorUsers;
    }

    const scopedUserIds = scopedDoctorUsers.map((item) => item._id);

    const optionsQuery = scopedUserIds.length > 0
      ? { userId: { $in: scopedUserIds } }
      : { userId: null };

    if (hospitalParam) {
      optionsQuery.hospital = { $regex: `^${escapeRegex(hospitalParam)}$`, $options: 'i' };
    }

    const optionsDoctors = await Doctor.find(optionsQuery)
      .populate('userId', 'name email phone profileImage address')
      .sort({ experience: -1, createdAt: -1 });

    const doctorsQuery = {
      ...optionsQuery
    };

    if (specializationParam) {
      doctorsQuery.specialization = { $regex: `^${escapeRegex(specializationParam)}$`, $options: 'i' };
    }

    const doctors = await Doctor.find(doctorsQuery)
      .populate('userId', 'name email phone profileImage address')
      .sort({ experience: -1, createdAt: -1 });

    const states = Array.from(new Set(
      allDoctorUsers
        .map((user) => user?.address?.state || user?.state)
        .filter(Boolean)
        .map((state) => String(state).trim())
    )).sort((a, b) => a.localeCompare(b));

    const districts = Array.from(new Set(
      stateScopedDoctorUsers
        .map((user) => user?.address?.city || user?.city)
        .filter(Boolean)
        .map((city) => String(city).trim())
    )).sort((a, b) => a.localeCompare(b));

    const hospitals = Array.from(new Set(
      optionsDoctors
        .map((doctor) => doctor?.hospital)
        .filter(Boolean)
        .map((hospital) => String(hospital).trim())
    )).sort((a, b) => a.localeCompare(b));

    const specializations = Array.from(new Set(
      optionsDoctors
        .map((doctor) => doctor?.specialization)
        .filter(Boolean)
    )).sort((a, b) => a.localeCompare(b));

    res.status(200).json({
      success: true,
      data: {
        states,
        districts,
        hospitals,
        specializations,
        nearbyState: nearbyState || null,
        doctors
      }
    });
  } catch (error) {
    next(error);
  }
};

const getMyDoctorProfile = async (req, res, next) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.user.id })
      .populate('userId', 'name email phone profileImage address');

    if (!doctor) {
      return res.status(200).json({
        success: true,
        message: 'Doctor profile not created yet',
        data: null
      });
    }

    res.status(200).json({
      success: true,
      data: doctor
    });
  } catch (error) {
    next(error);
  }
};

const getDoctorById = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .populate('userId', 'name email phone profileImage address');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.status(200).json({
      success: true,
      data: doctor
    });
  } catch (error) {
    next(error);
  }
};

const createDoctorProfile = async (req, res, next) => {
  try {
    const existingDoctor = await Doctor.findOne({ userId: req.user.id });
    if (existingDoctor) {
      return res.status(400).json({
        success: false,
        message: 'Doctor profile already exists'
      });
    }

    const existingLicense = await Doctor.findOne({
      licenseNumber: req.body.licenseNumber
    });
    if (existingLicense) {
      return res.status(400).json({
        success: false,
        message: 'License number already exists'
      });
    }

    const { state, district, ...doctorPayload } = req.body;

    const doctorData = {
      ...doctorPayload,
      userId: req.user.id
    };

    const doctor = await Doctor.create(doctorData);

    const userUpdate = { isVerified: false };
    if (state) {
      userUpdate['address.state'] = String(state).trim();
    }
    if (district) {
      userUpdate['address.city'] = String(district).trim();
    }

    await User.findByIdAndUpdate(req.user.id, userUpdate);

    res.status(201).json({
      success: true,
      message: 'Doctor profile created successfully',
      data: doctor
    });
  } catch (error) {
    next(error);
  }
};

const updateDoctorProfile = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    if (req.user.role !== 'admin' && doctor.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (req.body.licenseNumber && req.body.licenseNumber !== doctor.licenseNumber) {
      const existingLicense = await Doctor.findOne({
        licenseNumber: req.body.licenseNumber
      });
      if (existingLicense) {
        return res.status(400).json({
          success: false,
          message: 'License number already exists'
        });
      }
    }

    const { state, district, ...doctorPayload } = req.body;

    const updatedDoctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      doctorPayload,
      { new: true, runValidators: true }
    ).populate('userId', 'name email phone profileImage address');

    const userAddressUpdate = {};
    if (state !== undefined) {
      userAddressUpdate['address.state'] = String(state).trim();
    }
    if (district !== undefined) {
      userAddressUpdate['address.city'] = String(district).trim();
    }

    if (Object.keys(userAddressUpdate).length > 0) {
      await User.findByIdAndUpdate(doctor.userId, userAddressUpdate);
      updatedDoctor.userId = await User.findById(doctor.userId).select('name email phone profileImage address');
    }

    res.status(200).json({
      success: true,
      message: 'Doctor profile updated successfully',
      data: updatedDoctor
    });
  } catch (error) {
    next(error);
  }
};

const updateDoctorAvailability = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    if (doctor.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { availability } = req.body;

    if (!Array.isArray(availability)) {
      return res.status(400).json({
        success: false,
        message: 'Availability must be an array'
      });
    }

    doctor.availability = availability;
    await doctor.save();

    res.status(200).json({
      success: true,
      message: 'Availability updated successfully',
      data: doctor.availability
    });
  } catch (error) {
    next(error);
  }
};

const addDoctorTimeSlots = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    if (doctor.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { date, timeSlots } = req.body;

    if (!date || !Array.isArray(timeSlots)) {
      return res.status(400).json({
        success: false,
        message: 'Date and timeSlots array are required'
      });
    }

    const slotDate = new Date(date);

    doctor.timeSlots = doctor.timeSlots.filter(
      (slot) => slot.date.toDateString() !== slotDate.toDateString()
    );

    timeSlots.forEach((slot) => {
      doctor.timeSlots.push({
        date: slotDate,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isBooked: false
      });
    });

    await doctor.save();

    res.status(200).json({
      success: true,
      message: 'Time slots added successfully',
      data: doctor.timeSlots.filter(
        (slot) => slot.date.toDateString() === slotDate.toDateString()
      )
    });
  } catch (error) {
    next(error);
  }
};

const getDoctorTimeSlots = async (req, res, next) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required'
      });
    }

    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    const queryDate = new Date(date);
    const availableSlots = doctor.getAvailableSlots(queryDate);

    res.status(200).json({
      success: true,
      data: availableSlots
    });
  } catch (error) {
    next(error);
  }
};

const verifyDoctor = async (req, res, next) => {
  try {
    const { isVerified } = req.body;

    if (typeof isVerified !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isVerified must be a boolean value'
      });
    }

    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { isVerified },
      { new: true, runValidators: true }
    ).populate('userId', 'name email');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    await User.findByIdAndUpdate(doctor.userId, { isVerified });

    res.status(200).json({
      success: true,
      message: `Doctor ${isVerified ? 'verified' : 'unverified'} successfully`,
      data: doctor
    });
  } catch (error) {
    next(error);
  }
};

const getDoctorStats = async (req, res, next) => {
  try {
    const totalDoctors = await Doctor.countDocuments();
    const verifiedDoctors = await Doctor.countDocuments({ isVerified: true });
    const pendingVerification = totalDoctors - verifiedDoctors;

    const bySpecialization = await Doctor.aggregate([
      {
        $group: {
          _id: '$specialization',
          count: { $sum: 1 },
          verified: { $sum: { $cond: ['$isVerified', 1, 0] } }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: totalDoctors,
        verified: verifiedDoctors,
        pending: pendingVerification,
        bySpecialization
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDoctors,
  getDoctorBookingOptions,
  getMyDoctorProfile,
  getDoctorById,
  createDoctorProfile,
  updateDoctorProfile,
  updateDoctorAvailability,
  addDoctorTimeSlots,
  getDoctorTimeSlots,
  verifyDoctor,
  getDoctorStats
};
