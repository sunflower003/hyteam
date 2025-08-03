const Project = require('../models/Project');
const User = require('../models/User');
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
    .populate('owner', 'username avatar email')
    .populate('members.user', 'username avatar email')
    .populate('tasks.assignee', 'username avatar email')
    .populate('tasks.createdBy', 'username avatar email')
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
    const { 
      title, 
      description, 
      priority, 
      status, 
      assignee, 
      dueDate,
      tags,
      estimatedHours 
    } = req.body;
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

    // Xử lý tags - chuyển từ string thành array
    let processedTags = [];
    if (tags) {
      if (Array.isArray(tags)) {
        processedTags = tags.filter(tag => tag && tag.trim());
      } else if (typeof tags === 'string') {
        processedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      }
    }

    const newTask = {
      title,
      description: description || '',
      priority: priority || 'medium',
      status: status || 'todo',
      assignee: assignee || null,
      dueDate: dueDate || null,
      tags: processedTags,
      estimatedHours: estimatedHours ? Number(estimatedHours) : null,
      createdBy: userId
    };

    console.log('Creating task with data:', newTask); // Debug log

    project.tasks.push(newTask);
    await project.save();

    const createdTask = project.tasks[project.tasks.length - 1];
    
    // Populate assignee và createdBy
    await project.populate([
      { path: 'tasks.assignee', select: 'username avatar email' },
      { path: 'tasks.createdBy', select: 'username avatar email' }
    ]);

    const populatedTask = project.tasks.id(createdTask._id);

    res.status(201).json(createResponse(true, populatedTask, 'Task created successfully'));
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
    
    // Xử lý tags nếu có
    if (updateData.tags) {
      if (Array.isArray(updateData.tags)) {
        updateData.tags = updateData.tags.filter(tag => tag && tag.trim());
      } else if (typeof updateData.tags === 'string') {
        updateData.tags = updateData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      }
    }

    // Xử lý estimatedHours
    if (updateData.estimatedHours) {
      updateData.estimatedHours = Number(updateData.estimatedHours);
    }

    Object.assign(task, updateData);
    task.updatedAt = new Date();

    await project.save();
    
    // Populate dữ liệu
    await project.populate([
      { path: 'tasks.assignee', select: 'username avatar email' },
      { path: 'tasks.createdBy', select: 'username avatar email' }
    ]);

    const updatedTask = project.tasks.id(taskId);

    res.json(createResponse(true, updatedTask, 'Task updated successfully'));
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

// Thêm API để lấy danh sách users cho assign
const getProjectMembers = async (req, res) => {
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
    .populate('owner', 'username avatar email')
    .populate('members.user', 'username avatar email');

    if (!project) {
      return res.status(404).json(createResponse(false, null, 'Project not found'));
    }

    // Tạo danh sách tất cả members (bao gồm owner)
    const allMembers = [
      {
        _id: project.owner._id,
        username: project.owner.username,
        avatar: project.owner.avatar,
        email: project.owner.email,
        role: 'owner'
      },
      ...project.members.map(member => ({
        _id: member.user._id,
        username: member.user.username,
        avatar: member.user.avatar,
        email: member.user.email,
        role: member.role
      }))
    ];

    // Loại bỏ duplicate nếu owner cũng là member
    const uniqueMembers = allMembers.filter((member, index, self) => 
      index === self.findIndex(m => m._id.toString() === member._id.toString())
    );

    res.json(createResponse(true, uniqueMembers, 'Project members fetched successfully'));
  } catch (error) {
    console.error('Get project members error:', error);
    res.status(500).json(createResponse(false, null, 'Server error'));
  }
};

// Thêm controller function

const inviteMember = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { email, role } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!email || !role) {
      return res.status(400).json({
        success: false,
        message: 'Email và vai trò là bắt buộc'
      });
    }

    // Check if project exists and user has permission
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy project'
      });
    }

    // Check if current user is owner or admin
    const currentMember = project.members.find(m => 
      m.user.toString() === userId && 
      (m.role === 'owner' || m.role === 'admin')
    );

    if (!currentMember) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền mời thành viên'
      });
    }

    // Find user by email
    const invitedUser = await User.findOne({ email });
    if (!invitedUser) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng với email này'
      });
    }

    // Check if user is already a member
    const existingMember = project.members.find(m => 
      m.user.toString() === invitedUser._id.toString()
    );

    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: 'Người dùng đã là thành viên của project'
      });
    }

    // Add user to project
    project.members.push({
      user: invitedUser._id,
      role: role,
      joinedAt: new Date()
    });

    await project.save();

    res.json({
      success: true,
      message: 'Đã mời thành viên thành công',
      data: {
        user: {
          _id: invitedUser._id,
          username: invitedUser.username,
          email: invitedUser.email
        },
        role
      }
    });

  } catch (error) {
    console.error('Invite member error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi mời thành viên'
    });
  }
};

module.exports = {
  getProjects,
  createProject,
  getProject,
  createTask,
  updateTask,
  deleteTask,
  getProjectMembers,
  inviteMember
};