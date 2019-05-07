const express = require('express')
const router = express.Router()

router.use('/board', require('./board'))

module.exports = router
