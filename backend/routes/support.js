const express = require('express')
const router = express.Router()
const {
  getTickets,
  getTicketById,
  createTicket,
  updateTicket,
  addTicketNote,
  deleteTicket,
} = require('../controllers/supportController')
const { authenticate, authorize } = require('../middleware/auth')

// All support routes require authentication
router.use(authenticate)

// All admins can access support tickets
router.get('/tickets', getTickets)
router.get('/tickets/:id', getTicketById)
router.post('/tickets', createTicket)
router.put('/tickets/:id', updateTicket)
router.post('/tickets/:id/notes', addTicketNote)
router.delete('/tickets/:id', authorize('super_admin', 'support'), deleteTicket)

module.exports = router
