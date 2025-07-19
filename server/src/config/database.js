const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            userNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);

    }
    catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1); // Exit process 
    }
};

module.exports = connectDB;