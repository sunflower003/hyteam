export const authenticateAIRequest = (req, res, next) => {
    if (!req.headers['x-ai-auth']) {
        return res.status(401).send('Unauthorized AI request');
    }
    next();
};
