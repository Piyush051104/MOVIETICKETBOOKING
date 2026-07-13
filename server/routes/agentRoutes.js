import express from 'express';
import { handleAgentChat } from '../controllers/agentController.js';

const agentRouter = express.Router();

// The endpoint will be POST /api/agent/chat
agentRouter.post('/chat', handleAgentChat);

export default agentRouter;
