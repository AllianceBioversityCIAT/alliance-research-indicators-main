import React from 'react';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: string;
  color?: 'primary' | 'success' | 'warning' | 'danger'; // Optional now
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon }) => {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <div className="stat-card-icon">
          <i className={`fas ${icon}`}></i>
        </div>
      </div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{title}</div>
    </div>
  );
};

export default StatsCard;
