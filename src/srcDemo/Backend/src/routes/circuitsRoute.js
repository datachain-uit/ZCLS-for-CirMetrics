const express = require('express');
const router = express.Router();
const circuitsController = require('../controllers/circuitsController');

router.post('/compile', circuitsController.compileAndSave);
router.post('/prove', circuitsController.proveAndSave);
router.delete('/:version_hash', circuitsController.deleteCircuit);
router.get('/all', circuitsController.getAllCircuits);

module.exports = router;
