const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getProjects,
  createProject,
  getProject,
  createTask,
  updateTask,
  deleteTask,
  getProjectMembers,
  inviteMember,
} = require('../controllers/projectController');

// Protect all routes
router.use(protect);

// Project routes
router.get('/', getProjects);
router.post('/', createProject);
router.get('/:projectId', getProject);
router.get('/:projectId/members', getProjectMembers);

// Thêm route invite member
router.post('/:projectId/invite', protect, inviteMember);

// Task routes
router.post('/:projectId/tasks', createTask);
router.put('/tasks/:taskId', updateTask);
router.delete('/tasks/:taskId', deleteTask);

module.exports = router;