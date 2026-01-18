/**
 * ReportStatusTimeline component
 * Visual timeline showing report workflow status
 */

import React from 'react';
import { Clock, CheckCircle, User, Eye, FileText } from 'lucide-react';
import { ReportStatus } from '../../services/api';

interface StatusStep {
  status: ReportStatus;
  icon: React.ReactNode;
  label: string;
  completed?: boolean;
  active?: boolean;
  timestamp?: string;
}

interface ReportStatusTimelineProps {
  currentStatus: ReportStatus;
  intransitAt?: string;
  pacsReceivedAt?: string;
  assignedAt?: string;
  viewedAt?: string;
  completedAt?: string;
  radiologistName?: string;
}

const ReportStatusTimeline: React.FC<ReportStatusTimelineProps> = ({
  currentStatus,
  intransitAt,
  pacsReceivedAt,
  assignedAt,
  viewedAt,
  completedAt,
  radiologistName,
}) => {
  const statusOrder: ReportStatus[] = [
    ReportStatus.IN_TRANSIT,
    ReportStatus.PENDING,
    ReportStatus.ASSIGNED,
    ReportStatus.IN_PROGRESS,
    ReportStatus.READY,
  ];

  const currentIndex = statusOrder.indexOf(currentStatus);

  const steps: StatusStep[] = [
    {
      status: ReportStatus.IN_TRANSIT,
      icon: <Clock size={20} />,
      label: 'In Transit',
      timestamp: intransitAt,
    },
    {
      status: ReportStatus.PENDING,
      icon: <FileText size={20} />,
      label: 'Pending',
      timestamp: pacsReceivedAt,
    },
    {
      status: ReportStatus.ASSIGNED,
      icon: <User size={20} />,
      label: radiologistName ? `Assigned to ${radiologistName}` : 'Assigned',
      timestamp: assignedAt,
    },
    {
      status: ReportStatus.IN_PROGRESS,
      icon: <Eye size={20} />,
      label: 'In Progress',
      timestamp: viewedAt,
    },
    {
      status: ReportStatus.READY,
      icon: <CheckCircle size={20} />,
      label: 'Ready',
      timestamp: completedAt,
    },
  ];

  return (
    <div className="flex items-center justify-between py-4 px-2">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isActive = index === currentIndex;
        const isUpcoming = index > currentIndex;

        return (
          <React.Fragment key={step.status}>
            {/* Step Circle */}
            <div className="flex flex-col items-center flex-1 relative">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  ${isCompleted ? 'bg-green-500 text-white' : ''}
                  ${isActive ? 'bg-blue-500 text-white ring-4 ring-blue-200' : ''}
                  ${isUpcoming ? 'bg-gray-200 text-gray-400' : ''}
                  transition-all duration-300
                `}
              >
                {step.icon}
              </div>

              {/* Label */}
              <div className="text-xs mt-2 text-center max-w-[100px]">
                <div
                  className={`
                    font-medium
                    ${isCompleted || isActive ? 'text-gray-900' : 'text-gray-400'}
                  `}
                >
                  {step.label}
                </div>
                {step.timestamp && (
                  <div className="text-gray-500 mt-1">
                    {new Date(step.timestamp).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={`
                  h-0.5 flex-1 mx-2 transition-all duration-300
                  ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}
                `}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default ReportStatusTimeline;
