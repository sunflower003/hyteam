import React, { createContext, useState } from 'react';

export const AIContext = createContext();

const AIProvider = ({ children }) => {
    const [aiState, setAIState] = useState({});

    return (
        <AIContext.Provider value={{ aiState, setAIState }}>
            {children}
        </AIContext.Provider>
    );
};

export default AIProvider;
