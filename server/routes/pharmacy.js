const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  createPharmacyOrder,
  getPharmacyQueue,
  updatePharmacyOrderStatus,
  getPharmacyOrderById,
  getMyPharmacyOrders,
  getPharmacyStats,
  addOrderNote,
  qualityCheckOrder
} = require('../controllers/pharmacyController');

const router = express.Router();

router.use(protect);

router.post('/orders', createPharmacyOrder);
router.get('/queue', authorize('pharmacist', 'admin'), getPharmacyQueue);
router.patch('/orders/:id/status', authorize('pharmacist', 'admin'), updatePharmacyOrderStatus);
router.get('/orders/:id', getPharmacyOrderById);
router.get('/my-orders', authorize('patient'), getMyPharmacyOrders);
router.get('/stats', authorize('admin', 'pharmacist'), getPharmacyStats);
router.post('/orders/:id/notes', authorize('pharmacist', 'admin'), addOrderNote);
router.post('/orders/:id/quality-check', authorize('pharmacist', 'admin'), qualityCheckOrder);

module.exports = router;
