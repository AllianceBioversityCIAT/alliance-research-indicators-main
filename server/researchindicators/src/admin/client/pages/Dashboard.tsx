import React, { useEffect, useState } from 'react';
import StatsCard from '../components/StatsCard';

interface DashboardProps {
  initialData?: any;
}

interface Stats {
  totalUsers: number;
  totalResults: number;
  activeProjects: number;
  pendingReviews: number;
}

interface Activity {
  action: string;
  user: string;
  timestamp: string;
}

const Dashboard: React.FC<DashboardProps> = ({ initialData }) => {
  const [stats] = useState<Stats>(
    initialData?.stats || {
      totalUsers: 0,
      totalResults: 0,
      activeProjects: 0,
      pendingReviews: 0,
    },
  );

  const [recentActivity] = useState<Activity[]>(
    initialData?.recentActivity || [],
  );

  // Si necesitas cargar datos del API en el cliente
  useEffect(() => {
    if (!initialData) {
      // Aquí puedes hacer fetch a tu API si no vienen desde SSR
      // fetchDashboardData();
    }
  }, [initialData]);

  return (
    <>
      {/* Stats Cards */}
      <div className="stats-grid">
        <StatsCard
          title="Total Users"
          value={stats.totalUsers}
          icon="fa-users"
        />
        <StatsCard
          title="Total Results"
          value={stats.totalResults}
          icon="fa-file-alt"
        />
        <StatsCard
          title="Active Projects"
          value={stats.activeProjects}
          icon="fa-project-diagram"
        />
        <StatsCard
          title="Pending Reviews"
          value={stats.pendingReviews}
          icon="fa-clock"
        />
      </div>

      {/* Recent Activity */}
      <div className="activity-card">
        <div className="activity-card-header">
          <h3 className="activity-card-title">
            <i className="fas fa-history"></i>
            Recent Activity
          </h3>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>User</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.map((activity, index) => (
                <tr key={index}>
                  <td>{activity.action}</td>
                  <td>{activity.user}</td>
                  <td>{new Date(activity.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
