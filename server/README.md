server/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   ├── socket.js
│   │   └── cors.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── movieController.js
│   │   ├── storyController.js
│   │   ├── taskController.js
│   │   └── roomController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── validation.js
│   │   ├── errorHandler.js
│   │   └── logger.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Story.js
│   │   ├── Task.js
│   │   ├── Room.js
│   │   └── Movie.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── movies.js
│   │   ├── stories.js
│   │   ├── tasks.js
│   │   └── rooms.js
│   ├── services/
│   │   ├── movieService.js
│   │   ├── socketService.js
│   │   └── authService.js
│   ├── utils/
│   │   ├── response.js
│   │   ├── constants.js
│   │   └── helpers.js
│   └── app.js
├── .env
├── .env.example
└── package.json