import { useEffect, useRef } from 'react';
import { Task } from '../../types/task';
import { groupTasksByCategory } from '../../services/analytics';

interface CategoryDistributionChartProps {
  tasks: Task[];
  timeRange: string;
}

const CategoryDistributionChart: React.FC<CategoryDistributionChartProps> = ({ tasks, timeRange }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || tasks.length === 0) return;

    // Group tasks by category
    const tasksByCategory = groupTasksByCategory(tasks);
    
    // Render the chart
    renderPieChart(tasksByCategory);
  }, [tasks, timeRange]);

  const renderPieChart = (tasksByCategory: Record<string, number>) => {
    if (!chartRef.current) return;

    // Clear previous chart
    chartRef.current.innerHTML = '';

    // Filter out categories with zero tasks
    const categories = Object.entries(tasksByCategory)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);
    
    // Calculate total tasks
    const totalTasks = categories.reduce((sum, [_, count]) => sum + count, 0);
    
    // Chart dimensions
    const size = 100;
    const radius = 40;
    const centerX = size / 2;
    const centerY = size / 2;
    
    // Create SVG element
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('class', 'pie-chart');
    
    // Category colors
    const categoryColors: Record<string, string> = {
      work: '#3B82F6', // Blue
      study: '#8B5CF6', // Purple
      chores: '#F59E0B', // Yellow
      health: '#10B981', // Green
      social: '#EC4899', // Pink
      other: '#6B7280', // Gray
    };
    
    // Create pie segments
    let startAngle = 0;
    
    categories.forEach(([category, count]) => {
      const percentage = count / totalTasks;
      const endAngle = startAngle + percentage * 2 * Math.PI;
      
      // Calculate arc points
      const startX = centerX + radius * Math.cos(startAngle);
      const startY = centerY + radius * Math.sin(startAngle);
      const endX = centerX + radius * Math.cos(endAngle);
      const endY = centerY + radius * Math.sin(endAngle);
      
      // Create path for the segment
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      
      // Determine if the arc should be drawn the long way around
      const largeArcFlag = percentage > 0.5 ? 1 : 0;
      
      // Create the path data
      const pathData = [
        `M ${centerX} ${centerY}`, // Move to center
        `L ${startX} ${startY}`, // Line to start point
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`, // Draw arc
        'Z' // Close path
      ].join(' ');
      
      path.setAttribute('d', pathData);
      path.setAttribute('fill', categoryColors[category] || '#6B7280');
      
      svg.appendChild(path);
      
      // Add label for segments that are large enough
      if (percentage > 0.05) {
        // Calculate position for label
        const labelAngle = startAngle + (endAngle - startAngle) / 2;
        const labelRadius = radius * 0.7; // Place label inside the segment
        const labelX = centerX + labelRadius * Math.cos(labelAngle);
        const labelY = centerY + labelRadius * Math.sin(labelAngle);
        
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', labelX.toString());
        label.setAttribute('y', labelY.toString());
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('dominant-baseline', 'middle');
        label.setAttribute('font-size', '4');
        label.setAttribute('font-weight', 'bold');
        label.setAttribute('fill', 'white');
        label.textContent = `${Math.round(percentage * 100)}%`;
        
        svg.appendChild(label);
      }
      
      startAngle = endAngle;
    });
    
    // Append the SVG to the chart container
    chartRef.current.appendChild(svg);
    
    // Create legend
    const legend = document.createElement('div');
    legend.className = 'grid grid-cols-2 gap-2 mt-4';
    
    categories.forEach(([category, count]) => {
      const legendItem = document.createElement('div');
      legendItem.className = 'flex items-center';
      
      const colorBox = document.createElement('div');
      colorBox.className = 'w-3 h-3 rounded-sm mr-2';
      colorBox.style.backgroundColor = categoryColors[category] || '#6B7280';
      
      const label = document.createElement('span');
      label.className = 'text-sm text-gray-600 dark:text-gray-400 capitalize';
      label.textContent = `${category} (${count})`;
      
      legendItem.appendChild(colorBox);
      legendItem.appendChild(label);
      legend.appendChild(legendItem);
    });
    
    chartRef.current.appendChild(legend);
  };

  return (
    <div className="w-full h-64" ref={chartRef}></div>
  );
};

export default CategoryDistributionChart;
