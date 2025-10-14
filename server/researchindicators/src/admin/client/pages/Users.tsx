import React, { useState, useEffect } from 'react';

interface UsersProps {
  initialData?: any;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

const Users: React.FC<UsersProps> = ({ initialData }) => {
  const [users, setUsers] = useState<User[]>(initialData?.users || []);

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-md-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">Users List</h5>
              <button className="btn btn-primary">
                <i className="fas fa-plus"></i> Add User
              </button>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>{user.id}</td>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td>
                          <span className="badge bg-info">{user.role}</span>
                        </td>
                        <td>
                          <button className="btn btn-sm btn-warning me-2">
                            <i className="fas fa-edit"></i>
                          </button>
                          <button className="btn btn-sm btn-danger">
                            <i className="fas fa-trash"></i>
                          </button>
                        </td>
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

export default Users;
