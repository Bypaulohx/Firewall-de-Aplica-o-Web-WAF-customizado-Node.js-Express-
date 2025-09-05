const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'WAF Express - OK' });
});

module.exports = router;
