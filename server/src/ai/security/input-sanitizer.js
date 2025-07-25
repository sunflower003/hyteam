export const sanitizeInput = (input) => {
    return input.replace(/<[^>]*>?/gm, '');
};
