'use client';

import { ReactNode } from 'react';
import { 
  LucideIcon, 
  FileText, 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  User, 
  Shield,
  FileCheck,
  TrendingUp,
  Info
} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo';
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onClick?: () => void;
}

export function StatCard({ title, value, icon: Icon, color, subtitle, trend, onClick }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    indigo: 'bg-indigo-500',
  };

  const bgColorClasses = {
    blue: 'bg-blue-50',
    green: 'bg-green-50',
    yellow: 'bg-yellow-50',
    red: 'bg-red-50',
    purple: 'bg-purple-50',
    indigo: 'bg-indigo-50',
  };

  return (
    <div 
      className={`${bgColorClasses[color]} overflow-hidden rounded-lg p-6 shadow ${
        onClick ? 'cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center">
        <div className="shrink-0">
          <div className={`${colorClasses[color]} rounded-md p-3`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd className="flex items-baseline">
              <div className="text-2xl font-semibold text-gray-900">{value}</div>
              {trend && (
                <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
                </div>
              )}
            </dd>
            {subtitle && (
              <dd className="text-sm text-gray-600">{subtitle}</dd>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}

interface ActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo';
  buttonText: string;
}

export function ActionCard({ title, description, icon: Icon, onClick, color, buttonText }: ActionCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500 hover:bg-blue-600',
    green: 'bg-green-500 hover:bg-green-600',
    yellow: 'bg-yellow-500 hover:bg-yellow-600',
    red: 'bg-red-500 hover:bg-red-600',
    purple: 'bg-purple-500 hover:bg-purple-600',
    indigo: 'bg-indigo-500 hover:bg-indigo-600',
  };

  return (
    <div className="bg-white overflow-hidden rounded-lg shadow">
      <div className="p-6">
        <div className="flex items-center">
          <div className="shrink-0">
            <Icon className={`h-8 w-8 text-${color}-500`} />
          </div>
          <div className="ml-5 w-0 flex-1">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          </div>
        </div>
        <div className="mt-6">
          <button
            onClick={onClick}
            className={`w-full ${colorClasses[color]} text-white px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${color}-500`}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}

interface RecentActivityProps {
  activities: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    status: 'success' | 'warning' | 'error' | 'info';
  }>;
  title?: string;
}

export function RecentActivity({ activities, title = "Recent Activity" }: RecentActivityProps) {
  const statusColors = {
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  const getActivityIcon = (type: string, status: string) => {
    const iconClass = "h-4 w-4";
    
    switch (type.toLowerCase()) {
      case 'claim created':
      case 'claim submission':
        return <FileText className={iconClass} />;
      case 'document uploaded':
        return <Upload className={iconClass} />;
      case 'document verified':
      case 'document approved':
        return <FileCheck className={iconClass} />;
      case 'status change':
      case 'status updated':
        return (
          status === 'success' ? <CheckCircle className={iconClass} /> :
          status === 'error' ? <XCircle className={iconClass} /> :
          <Clock className={iconClass} />
        );
      case 'claim assigned':
        return <User className={iconClass} />;
      case 'policy issued':
      case 'policy updated':
        return <Shield className={iconClass} />;
      case 'claim modified':
      case 'claim update':
        return <TrendingUp className={iconClass} />;
      case 'document issue':
      case 'document rejected':
        return <AlertTriangle className={iconClass} />;
      default:
        return <Info className={iconClass} />;
    }
  };

  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            {title}
          </h3>
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">
              No recent activity to display. Your claim updates and policy changes will appear here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {title}
          </h3>
          <span className="text-xs text-gray-500">
            {activities.length} recent {activities.length === 1 ? 'activity' : 'activities'}
          </span>
        </div>
        <div className="flow-root">
          <ul className="-mb-8">
            {activities.map((activity, activityIdx) => (
              <li key={activity.id}>
                <div className="relative pb-8">
                  {activityIdx !== activities.length - 1 ? (
                    <span className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200" />
                  ) : null}
                  <div className="relative flex items-start space-x-3">
                    <div>
                      <div className={`relative px-1.5 py-1.5 bg-white rounded-full ring-8 ring-white border ${statusColors[activity.status]} flex items-center justify-center`}>
                        {getActivityIcon(activity.type, activity.status)}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">
                            {activity.type}
                          </span>
                          <div className="text-right text-xs text-gray-500">
                            {activity.timestamp}
                          </div>
                        </div>
                        <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                          {activity.description}
                        </p>
                      </div>
                      {/* Activity priority/status indicator */}
                      <div className="mt-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                          activity.status === 'success' ? 'bg-green-50 text-green-700 border-green-200' :
                          activity.status === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
                          activity.status === 'warning' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                          'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {activity.status === 'success' && 'Completed'}
                          {activity.status === 'error' && 'Attention Required'}
                          {activity.status === 'warning' && 'In Progress'}
                          {activity.status === 'info' && 'Updated'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        
        {activities.length >= 10 && (
          <div className="mt-6 text-center border-t border-gray-200 pt-4">
            <button className="text-sm text-blue-600 hover:text-blue-500 font-medium">
              View all activities
            </button>
          </div>
        )}
      </div>
    </div>
  );
}