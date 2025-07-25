import { useState } from 'react';

const useAI = () => {
    const [response, setResponse] = useState(null);

    const fetchAIResponse = async (query) => {
        // Logic to interact with AI API
        setResponse(`Response for: ${query}`);
    };

    return { response, fetchAIResponse };
};

export default useAI;
