const dotenv = require('dotenv');
dotenv.config();

const { validateEnvironment } = require('./src/config/validateEnv');
validateEnvironment();

const app = require('./src/app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
});
