const dotenv = require('dotenv');
dotenv.config();

const app = require('./src/app');

// In production (Cloudflare Workers/Pages), we do NOT call app.listen
// The serverless environment will handle requests via the handler.
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Export the Express app for serverless environments
module.exports = app;