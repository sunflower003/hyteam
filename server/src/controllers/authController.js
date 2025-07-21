const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { createResponse } = require('../utils/response');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE,
    });
};

const register = async (req, res) => {
    try {
        const  { username, email, password } = req.body;
        console.log('Register body:', req.body);
        //Kiem tra nguoi dung da ton tai chua
        const existingUser = await User.findOne({
            $or: [{ username }, { email }]
        });

        if (existingUser) {
            return res.status(400).json(
                createResponse(false, 'User already exists')
            );
        }

        //Tao moi nguoi dung
        const user = await User.create({
            username,
            email,
            password
        });

        //Tao token
        const token = generateToken(user._id);

        
        res.status(201).json(
            createResponse(true, {
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    avatar: user.avatar,
                },
                token,
            }, 'User registered successfully')
        );  
    } catch (error) {
        return res.status(500).json(
            createResponse(false, 'Server error', error.message)
        );
    }
};

const login = async (req, res) => {
    try {
        const {email, password} = req.body;

        //Kiem tra nguoi dung ton tai va xac thuc mat khau
        const user = await User.findOne({ email }).select('+password');

        if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json(
            createResponse(false, null,  'Invalid email or password')
        );
        }

        //Cap nhat lan cuoi dang nhap
        user.lastLogin = new Date();
        await user.save();

        //Tao token
        const token = generateToken(user._id);

        res.json(
            createResponse(true, {
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    avatar: user.avatar,
                },
                token,
            }, 'User logged in successfully')  
        );
    } catch (error) {
        return res.status(500).json(
            createResponse(false, 'Server error', error.message)
        );
    }
};

const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        res.json (
            createResponse(true, {
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    avatar: user.avatar,
                    lastLogin: user.lastLogin,
                }
            }, 'User profile retrieved successfully')
        );
    } catch (error) {
        return res.status(500).json(
            createResponse(false, 'Server error', error.message)
        );
    }
};

module.exports = {
    register,
    login,
    getProfile,
};
