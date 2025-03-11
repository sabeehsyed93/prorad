import React from 'react';
import './Logo.css';

const Logo = ({ height = '40px', className = '' }) => {
  return (
    <div className="logo-container rainbow-glow">
      <img 
        src="/logo.png" 
        alt="RadScribe Logo" 
        style={{ height: height }}
        className={`logo ${className}`}
      />
    </div>
  );
};

export default Logo;
