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
    <div className="container-fluid">
      {/* Stats Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <StatsCard
            title="Total Users"
            value={stats.totalUsers}
            icon="fa-users"
            color="primary"
          />
        </div>
        <div className="col-md-3">
          <StatsCard
            title="Total Results"
            value={stats.totalResults}
            icon="fa-file-alt"
            color="success"
          />
        </div>
        <div className="col-md-3">
          <StatsCard
            title="Active Projects"
            value={stats.activeProjects}
            icon="fa-project-diagram"
            color="warning"
          />
        </div>
        <div className="col-md-3">
          <StatsCard
            title="Pending Reviews"
            value={stats.pendingReviews}
            icon="fa-clock"
            color="danger"
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="row">
        <div className="col-md-12">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title">Recent Activity</h5>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
