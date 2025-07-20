const { createResponse } = require('../utils/response');

const errorHandler = (err, req, res, next ) => {
    let error = {...err};
    error.message = err.message;

    console.error(err.stack || err);

    // Mongoose bad ObjectId
    if( err.name == 'CastError' ) {
        const message = `Resource not found. Invalid: ${err.path}`;
        error = { message, statusCode: 404 };
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        const message = `Duplicate field value entered: ${err.keyValue.name}`;
        error = { message, statusCode: 400 };
    }

    //Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message);
        error = { message, statusCode: 400 };
    }

    //JWT error
    if (err.name === 'JsonWebTokenError') {
        const message = 'Invalid token';
        error = { message, statusCode: 401 };
    }
    if (err.name === 'TokenExpiredError') {
        const message = 'Token has expired';
        error = { message, statusCode: 401 };
    }
    res.status(error.statusCode || 500).json(createResponse(false, null, error.message));
};

module.exports = errorHandler;