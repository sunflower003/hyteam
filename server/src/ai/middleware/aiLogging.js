// AI Logging Middleware: Logs AI interactions
const aiLogging = (req, res, next) => {
  console.log(`AI Interaction: ${req.method} ${req.url}`);
  next();
};

export default aiLogging;
