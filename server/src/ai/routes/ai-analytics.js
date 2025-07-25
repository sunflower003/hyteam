// AI Analytics Routes: Routes for AI analytics operations
import express from 'express';
import { handleAIAnalyticsRequest } from '../controllers/aiAnalyticsController.js';

const router = express.Router();

router.post('/analytics', handleAIAnalyticsRequest);

export default router;
