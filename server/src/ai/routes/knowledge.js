// Knowledge Routes: Routes for knowledge base operations
import express from 'express';
import { handleKnowledgeRequest } from '../controllers/knowledgeController.js';

const router = express.Router();

router.post('/knowledge', handleKnowledgeRequest);

export default router;
