import React from 'react';
import '../../styles/components/verified-badge.css';

const VerifiedBadge = ({ size = 'default' }) => {
  const getClassName = () => {
    switch (size) {
      case 'small':
        return 'verifiedBadgeSmall';
      case 'tiny':
        return 'verifiedBadgeTiny';
      default:
        return 'verifiedBadge';
    }
  };

  // SVG checkmark icon similar to Facebook/Twitter verified badge
  const CheckIcon = () => (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
    </svg>
  );

  return (
    <div className={getClassName()}>
      <CheckIcon />
    </div>
  );
};

export default VerifiedBadge;
