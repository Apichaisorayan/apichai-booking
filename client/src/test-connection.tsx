import { useEffect, useState } from 'react';
import { healthApi, authApi, usersApi } from './lib/api';

export function TestConnection() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    setLoading(true);
    const results: any = {};

    try {
      // Test health endpoint
      const health = await healthApi.check();
      results.health = { success: true, data: health };
    } catch (error: any) {
      results.health = { success: false, error: error.message };
    }

    try {
      // Test users endpoint (doctors are users with role DOCTOR)
      const users = await usersApi.getAll();
      const doctors = (users as any[]).filter(u => u.role === 'DOCTOR');
      results.doctors = { success: true, count: doctors.length };
    } catch (error: any) {
      results.doctors = { success: false, error: error.message };
    }

    setStatus(results);
    setLoading(false);
  };

  if (loading) {
    return <div className="p-4">Testing connection...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold">API Connection Test</h2>
      
      <div className="space-y-2">
        <div className={`p-3 rounded ${status.health?.success ? 'bg-green-100' : 'bg-red-100'}`}>
          <strong>Health Check:</strong> {status.health?.success ? '✅ Connected' : '❌ Failed'}
          {status.health?.error && <div className="text-sm text-red-600">{status.health.error}</div>}
        </div>

        <div className={`p-3 rounded ${status.doctors?.success ? 'bg-green-100' : 'bg-red-100'}`}>
          <strong>Doctors API:</strong> {status.doctors?.success ? `✅ ${status.doctors.count} doctors` : '❌ Failed'}
          {status.doctors?.error && <div className="text-sm text-red-600">{status.doctors.error}</div>}
        </div>
      </div>

      <button 
        onClick={testConnection}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Test Again
      </button>
    </div>
  );
}
