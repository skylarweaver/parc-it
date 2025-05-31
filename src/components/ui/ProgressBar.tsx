import React from 'react';

/**
 * Simple animated linear progress bar for loading states.
 * Usage: <ProgressBar />
 */
const ProgressBar: React.FC = () => (
  <div className="w-full h-2 bg-gray-200 rounded overflow-hidden mb-4">
    <div className="h-full bg-blue-600 animate-progress-bar" style={{ width: '100%' }} />
    <style jsx>{`
      @keyframes progressBar {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
      .animate-progress-bar {
        animation: progressBar 1.2s linear infinite;
        width: 50%;
        min-width: 30%;
        max-width: 100%;
      }
    `}</style>
  </div>
);

export default ProgressBar; 