import React, { useState } from 'react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "w-full h-full" }) => {
  const [error, setError] = useState(false);

  // If the local image fails to load, render this high-fidelity SVG approximation
  if (error) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <svg viewBox="0 0 200 200" className="w-full h-full">
          {/* Main Circle Background - Green */}
          <circle cx="100" cy="100" r="98" fill="#15803d" />
          <circle cx="100" cy="100" r="92" fill="none" stroke="white" strokeWidth="2" />
          
          {/* Inner White Circle Area for Shield */}
          <path d="M 35 100 A 65 65 0 0 1 165 100 L 100 165 Z" fill="white" opacity="0.1" /> 
          <circle cx="100" cy="100" r="65" fill="white" />

          {/* Text: OUR LADY OF FATIMA UNIVERSITY */}
          <path id="textCurve" d="M 22 100 A 78 78 0 0 1 178 100" fill="none" />
          <text fontSize="13" fontWeight="bold" fill="white" textAnchor="middle" letterSpacing="1">
            <textPath xlinkHref="#textCurve" startOffset="50%">
              OUR LADY OF FATIMA UNIVERSITY
            </textPath>
          </text>
          
          {/* Year: 1967 */}
          <text x="100" y="60" fontSize="14" fontWeight="900" fill="#15803d" textAnchor="middle">1967</text>

          {/* Shield Container */}
          <path d="M 60 65 H 140 V 100 C 140 135 100 155 100 155 C 100 155 60 135 60 100 Z" fill="#15803d" stroke="#15803d" strokeWidth="1" />
          
          {/* Shield Dividers (White Cross) */}
          <line x1="100" y1="65" x2="100" y2="155" stroke="white" strokeWidth="3" />
          <line x1="60" y1="110" x2="140" y2="110" stroke="white" strokeWidth="3" />
          
          {/* Top Left: Cross Pattée */}
          <path d="M 80 75 L 85 85 L 95 85 L 90 95 L 95 105 L 85 105 L 80 115 L 75 105 L 65 105 L 70 95 L 65 85 L 75 85 Z" fill="none" stroke="white" strokeWidth="2" />
          <path d="M 80 80 L 90 95 H 70 Z" fill="white" transform="translate(0, 5) scale(0.6) translate(50, 40)" opacity="0.8"/>

          {/* Top Right: Book & Wreath */}
          <path d="M 115 80 H 135 V 90 H 115 Z" fill="none" stroke="white" strokeWidth="2" />
          <path d="M 115 85 L 125 90 L 135 85" stroke="white" strokeWidth="1" fill="none"/>
          <path d="M 112 95 Q 125 110 138 95" stroke="white" strokeWidth="2" fill="none" />
          <path d="M 112 95 L 110 90 M 138 95 L 140 90" stroke="white" strokeWidth="1" />

          {/* Bottom Left: Vertical Stripes */}
          <rect x="65" y="112" width="4" height="25" fill="white" />
          <rect x="73" y="112" width="4" height="30" fill="white" />
          <rect x="81" y="112" width="4" height="35" fill="white" />
          <rect x="89" y="112" width="4" height="38" fill="white" />

          {/* Bottom Right: Lion Rampant (Stylized) */}
          <path d="M 120 120 C 130 120 135 130 125 140 L 115 150 L 110 140" fill="none" stroke="white" strokeWidth="2" />
          <circle cx="120" cy="118" r="3" fill="white" />

          {/* Bottom Ribbon */}
          <path id="ribbonPath" d="M 40 160 Q 100 190 160 160" fill="none" />
          <path d="M 35 155 Q 100 195 165 155 L 165 170 Q 100 210 35 170 Z" fill="#15803d" stroke="white" strokeWidth="1" />
          <text fontSize="7" fontWeight="bold" fill="white" textAnchor="middle">
             <textPath xlinkHref="#ribbonPath" startOffset="50%">
               VERITAS ET MISERICORDIA
             </textPath>
          </text>
        </svg>
      </div>
    );
  }

  return (
    <img 
      src="/logo.png" 
      alt="OLFU Seal" 
      className={`${className} object-contain`}
      onError={() => setError(true)}
    />
  );
};

export default Logo;