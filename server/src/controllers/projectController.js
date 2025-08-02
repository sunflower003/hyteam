const Project = require('../models/Project');
const { createResponse } = require('../utils/response');

// Get all projects for user
const getProjects = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const projects = await Project.find({
      $or: [
        { owner: userId },
        { 'members.user': userId }
      ],
      status: { $ne: 'archived' }
    })
    .populate('owner', 'username avatar')
    .populate('members.user', 'username avatar')
    .populate('tasks.assignee', 'username avatar')
    .sort({ updatedAt: -1 });

    res.json(createResponse(true, projects, 'Projects fetched successfully'));
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json(createResponse(false, null, 'Server error'));
  }
};

// Create new project
const createProject = async (req, res) => {
  try {
    const { name, description, members = [] } = req.body;
    const userId = req.user.id;

    const project = new Project({
      name,
      description,
      owner: userId,
      members: [
        { user: userId, role: 'owner' },
        ...members.map(memberId => ({ user: memberId, role: 'member' }))
      ]
    });

    await project.save();
    await project.populate([
      { path: 'owner', select: 'username avatar' },
      { path: 'members.user', select: 'username avatar' }
    ]);

    res.status(201).json(createResponse(true, project, 'Project created successfully'));
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json(createResponse(false, null, 'Server error'));
  }
};

// Get project by ID
const getProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const project = await Project.findOne({
      _id: projectId,
      $or: [
        { owner: userId },
        { 'members.user': userId }
      ]
    })
    .populate('owner', 'username avatar')
    .populate('members.user', 'username avatar')
    .populate('tasks.assignee', 'username avatar');

    if (!project) {
      return res.status(404).json(createResponse(false, null, 'Project not found'));
    }

    res.json(createResponse(true, project, 'Project fetched successfully'));
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json(createResponse(false, null, 'Server error'));
  }
};

// Create new task
const createTask = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description, priority, status, assignee, dueDate } = req.body;
    const userId = req.user.id;

    const project = await Project.findOne({
      _id: projectId,
      $or: [
        { owner: userId },
        { 'members.user': userId }
      ]
    });

    if (!project) {
      return res.status(404).json(createResponse(false, null, 'Project not found'));
    }

    const newTask = {
      title,
      description,
      priority: priority || 'medium',
      status: status || 'todo',
      assignee: assignee || null,
      dueDate: dueDate || null
    };

    project.tasks.push(newTask);
    await project.save();

    const createdTask = project.tasks[project.tasks.length - 1];
    await project.populate('tasks.assignee', 'username avatar');

    res.status(201).json(createResponse(true, createdTask, 'Task created successfully'));
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json(createResponse(false, null, 'Server error'));
  }
};

// Update task
const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const updateData = req.body;
    const userId = req.user.id;

    const project = await Project.findOne({
      'tasks._id': taskId,
      $or: [
        { owner: userId },
        { 'members.user': userId }
      ]
    });

    if (!project) {
      return res.status(404).json(createResponse(false, null, 'Task not found'));
    }

    const task = project.tasks.id(taskId);
    Object.assign(task, updateData);
    task.updatedAt = new Date();

    await project.save();
    await project.populate('tasks.assignee', 'username avatar');

    res.json(createResponse(true, task, 'Task updated successfully'));
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json(createResponse(false, null, 'Server error'));
  }
};

// Delete task
const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;

    const project = await Project.findOne({
      'tasks._id': taskId,
      $or: [
        { owner: userId },
        { 'members.user': userId }
      ]
    });

    if (!project) {
      return res.status(404).json(createResponse(false, null, 'Task not found'));
    }

    project.tasks.pull(taskId);
    await project.save();

    res.json(createResponse(true, null, 'Task deleted successfully'));
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json(createResponse(false, null, 'Server error'));
  }
};

module.exports = {
  getProjects,
  createProject,
  getProject,
  createTask,
  updateTask,
  deleteTask
};