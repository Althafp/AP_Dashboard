import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Monitor, 
  LineChart, 
  Bell, 
  BarChart3,
  LogOut,
  MapPin
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    // Will redirect to login form in ProtectedRoute
    window.location.reload();
  };

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Main Dashboard' },
    { path: '/map', icon: MapPin, label: 'Map' },
    { path: '/overview', icon: LayoutDashboard, label: 'Overview' },
    { path: '/monitors', icon: Monitor, label: 'Monitors' },
    { path: '/performance', icon: LineChart, label: 'Performance' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/alerts', icon: Bell, label: 'Alerts' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <img 
                  src="/ap-logo.svg" 
                  alt="Andhra Pradesh Logo" 
                  className="h-10 w-auto"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* CM Images */}
              <div className="flex items-center space-x-2">
                <img 
                  src="/cmson.png" 
                  alt="CM Son" 
                  className="h-12 w-auto object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <img 
                  src="/cm.png" 
                  alt="CM" 
                  className="h-12 w-auto object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                <LogOut className="h-5 w-5 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-gray-800 border-r-2 border-gray-700 shadow-lg min-h-[calc(100vh-4rem)]">
          <nav className="px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 bg-gray-50 border-l-4 border-gray-300">
          {children}
        </main>
      </div>
    </div>
  );
};

