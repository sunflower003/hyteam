import React from 'react';
import { Link } from 'react-router-dom';
import buttonStyles from '../../styles/components/Button.module.css';

const CreatePostButton = ({ text = "Create Post", className = "" }) => {
    return (
        <Link 
            to="/create-post" 
            className={`${buttonStyles.primaryBtn} ${className}`}
        >
            📸 {text}
        </Link>
    );
};

export default CreatePostButton;
