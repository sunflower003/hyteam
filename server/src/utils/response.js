const createResponse = (success, data = null, message = '', error = null) => {
    return {
        success,
        data,
        message,
        timestamp: new Date().toISOString(),
        ...(error ? { error } : {})
    };
};

const createPaginatedResponse = (success, data, pagination, message = '') => {
    return {
        success,
        data,
        pagination, 
        message,
        timestamp: new Date().toISOString()
    };
};

module.exports = {
    createResponse,
    createPaginatedResponse
};