const Room = require('../models/Room');
const { createResponse } = require('../utils/response');

//Tao phong moi 
const createRoom = async (req, res) => {
    try {
        const {roomId, name, description} = req.body;
        const userId = req.user.id;

        //Kiem tra phong da ton tai chua
        const existingRoom = await Room.findOne({ roomId });
        if (existingRoom) {
            return res.status(400).json(
                createResponse(false, null, 'Room ID already exists')
            );
        }

        const room = await Room.create({
            roomId,
            name,
            description,
            host: userId,
            members: [{
                user: userId,
                role: 'host'
            }]
        });

        await room.populate('host', 'username email avatar');

        res.status(201).json(
            createResponse(true, room, 'Room created successfully')
        );
    } catch (error) {
        console.error('Create room error:', error);
        res.status(500).json(
            createResponse(false, null, 'Failed to create room', error.message)
        );
    }
};

//Lay thong tin phong 
const getRoomInfo = async (req, res) => {
    try {
        const { roomId } = req.params;

        const room = await Room.findOne({ roomId })
            .populate('host', 'username email avatar')
            .populate('members.user', 'username email avatar');
        // Kiem tra phong co ton tai khong
        if (!room) {
            return res.status(404).json(
                createResponse(false, null, 'Room not found')
            );
        }

        res.json(
            createResponse(true, room, 'Room info fetched successfully')
        );
    } catch (error) {
        console.error('Get room info error:', error);
        res.status(500).json(
            createResponse(false, null, 'Failed to fetch room info', error.message)
        );
    }
};

// Cap nhat phim hien tai 
const updateCurrentMovie = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { tmdbId, title, poster, streamUrl } = req.body;
        const userId = req.user.id;

        const room = await Room.findOne({ roomId });
        if(!room) {
            return res.status(404).json(
                createResponse(false, null, 'Room not found')
            );
        }

        //Chi host moi duoc doi phim hien tai
        if (room.host.toString() !== userId) {
            return res.status(403).json(
                createResponse(false, null, 'Only room host can update current movie')
            );
        }

        room.currentMovie = {
            tmdbId,
            title,
            poster,
            streamUrl,
            startedAt: new Date()
        };

        await room.save();

        res.json(
            createResponse(true, room.currentMovie, 'Movie update successfully')
        );

    } catch (error) {
        console.error('Update current movie error:', error);
        res.status(500).json(
            createResponse(false, null, 'Failed to update current movie', error.message)
        );
    }
};

module.exports = {
    createRoom,
    getRoomInfo,
    updateCurrentMovie
};