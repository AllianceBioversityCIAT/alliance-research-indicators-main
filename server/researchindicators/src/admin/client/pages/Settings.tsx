import React, { useState } from 'react';

interface SettingsProps {
  initialData?: any;
}

const Settings: React.FC<SettingsProps> = ({ initialData }) => {
  const [siteName, setSiteName] = useState(
    initialData?.settings?.siteName || 'Research Indicators'
  );
  const [maintenanceMode, setMaintenanceMode] = useState(
    initialData?.settings?.maintenanceMode || false
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aquí puedes hacer POST a tu API para guardar settings
    console.log('Saving settings:', { siteName, maintenanceMode });
  };

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-md-8">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title">General Settings</h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="siteName" className="form-label">
                    Site Name
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="siteName"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                  />
                </div>
                <div className="mb-3 form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="maintenanceMode"
                    checked={maintenanceMode}
                    onChange={(e) => setMaintenanceMode(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="maintenanceMode">
                    Maintenance Mode
                  </label>
                </div>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
