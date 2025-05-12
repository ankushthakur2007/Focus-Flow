import { useEffect, useRef } from 'react';
import { Task } from '../../types/task';
import { DailyAnalytics } from '../../services/analytics';

interface TaskCompletionChartProps {
  tasks: Task[];
  timeRange: string;
  dailyAnalytics?: DailyAnalytics[];
}

const TaskCompletionChart: React.FC<TaskCompletionChartProps> = ({ tasks, timeRange, dailyAnalytics = [] }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    if (tasks.length === 0 && dailyAnalytics.length === 0) return;

    // Calculate completion statistics - use analytics table data if available
    let totalTasks = tasks.length;
    let completedTasks = tasks.filter(task => task.status === 'completed').length;
    let inProgressTasks = tasks.filter(task => task.status === 'in_progress').length;
    let pendingTasks = tasks.filter(task => task.status === 'pending').length;

    // If we have analytics data, use that instead
    if (dailyAnalytics && dailyAnalytics.length > 0) {
      // Sum up the values from all daily analytics
      totalTasks = dailyAnalytics.reduce((sum, day) => sum + day.total_tasks, 0);
      completedTasks = dailyAnalytics.reduce((sum, day) => sum + day.completed_tasks, 0);
      inProgressTasks = dailyAnalytics.reduce((sum, day) => sum + day.in_progress_tasks, 0);
      pendingTasks = dailyAnalytics.reduce((sum, day) => sum + day.pending_tasks, 0);
    }

    // Calculate percentages
    const completedPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const inProgressPercentage = totalTasks > 0 ? Math.round((inProgressTasks / totalTasks) * 100) : 0;
    const pendingPercentage = totalTasks > 0 ? Math.round((pendingTasks / totalTasks) * 100) : 0;

    // Render the chart
    renderDonutChart(completedPercentage, inProgressPercentage, pendingPercentage);
  }, [tasks, timeRange]);

  const renderDonutChart = (completed: number, inProgress: number, pending: number) => {
    if (!chartRef.current) return;

    // Clear previous chart
    chartRef.current.innerHTML = '';

    // Create SVG element
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('class', 'donut-chart');

    // Calculate the circumference of the circle
    const radius = 40;
    const circumference = 2 * Math.PI * radius;

    // Create the circle segments
    const createSegment = (percentage: number, color: string, startAngle: number) => {
      const segmentLength = (percentage / 100) * circumference;
      const endAngle = startAngle + (percentage / 100) * 2 * Math.PI;

      // Calculate start and end points
      const startX = 50 + radius * Math.cos(startAngle - Math.PI / 2);
      const startY = 50 + radius * Math.sin(startAngle - Math.PI / 2);
      const endX = 50 + radius * Math.cos(endAngle - Math.PI / 2);
      const endY = 50 + radius * Math.sin(endAngle - Math.PI / 2);

      // Create path element
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

      // Determine if the arc should be drawn the long way around
      const largeArcFlag = percentage > 50 ? 1 : 0;

      // Create the path data
      const pathData = [
        `M ${startX} ${startY}`, // Move to start point
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`, // Draw arc
        `L 50 50`, // Line to center
        `Z` // Close path
      ].join(' ');

      path.setAttribute('d', pathData);
      path.setAttribute('fill', color);

      return path;
    };

    // Calculate start angles for each segment
    let startAngle = 0;

    // Add completed segment
    if (completed > 0) {
      const completedSegment = createSegment(completed, '#10B981', startAngle);
      svg.appendChild(completedSegment);
      startAngle += (completed / 100) * 2 * Math.PI;
    }

    // Add in-progress segment
    if (inProgress > 0) {
      const inProgressSegment = createSegment(inProgress, '#3B82F6', startAngle);
      svg.appendChild(inProgressSegment);
      startAngle += (inProgress / 100) * 2 * Math.PI;
    }

    // Add pending segment
    if (pending > 0) {
      const pendingSegment = createSegment(pending, '#EF4444', startAngle);
      svg.appendChild(pendingSegment);
    }

    // Add center circle for donut effect
    const centerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    centerCircle.setAttribute('cx', '50');
    centerCircle.setAttribute('cy', '50');
    centerCircle.setAttribute('r', '25');
    centerCircle.setAttribute('fill', 'white');
    centerCircle.setAttribute('class', 'dark:fill-gray-800');
    svg.appendChild(centerCircle);

    // Add text in the center
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', '50');
    text.setAttribute('y', '50');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('font-size', '12');
    text.setAttribute('font-weight', 'bold');
    text.setAttribute('class', 'fill-gray-800 dark:fill-white');
    text.textContent = `${completed}%`;
    svg.appendChild(text);

    // Add label below
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', '50');
    label.setAttribute('y', '62');
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('font-size', '8');
    label.setAttribute('class', 'fill-gray-500 dark:fill-gray-400');
    label.textContent = 'Completed';
    svg.appendChild(label);

    // Append the SVG to the chart container
    chartRef.current.appendChild(svg);
  };

  return (
    <div className="flex flex-col items-center">
      <div ref={chartRef} className="w-full max-w-xs h-64"></div>

      {/* Legend */}
      <div className="flex justify-center mt-4 space-x-6">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Completed</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">In Progress</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Pending</span>
        </div>
      </div>
    </div>
  );
};

export default TaskCompletionChart;
