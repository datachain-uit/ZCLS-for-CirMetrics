const express = require('express');
const cors = require('cors');
const circuitsRoute = require('./routes/circuitsRoute');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/api/circuits', circuitsRoute);

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
