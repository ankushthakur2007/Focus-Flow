import { useEffect, useRef } from 'react';
import { Task } from '../../types/task';
import { format, subDays, parseISO } from 'date-fns';
import { groupTasksByDay, calculateDailyCompletionRates, DailyAnalytics } from '../../services/analytics';

interface ProductivityTrendChartProps {
  tasks: Task[];
  timeRange: string;
  dailyAnalytics?: DailyAnalytics[];
}

const ProductivityTrendChart: React.FC<ProductivityTrendChartProps> = ({ tasks, timeRange, dailyAnalytics = [] }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    if (tasks.length === 0 && dailyAnalytics.length === 0) return;

    // If we have analytics data, use that instead of calculating from tasks
    if (dailyAnalytics && dailyAnalytics.length > 0) {
      // Convert analytics data to the format needed for the chart
      const dailyRates: Record<string, number> = {};

      dailyAnalytics.forEach(day => {
        dailyRates[day.date] = day.completion_rate;
      });

      // Render the chart with analytics data
      renderLineChart(dailyRates);
    } else {
      // Fall back to calculating from tasks
      const tasksByDay = groupTasksByDay(tasks, timeRange as any);
      const dailyCompletionRates = calculateDailyCompletionRates(tasksByDay);
      renderLineChart(dailyCompletionRates);
    }
  }, [tasks, timeRange, dailyAnalytics]);

  const renderLineChart = (dailyRates: Record<string, number>) => {
    if (!chartRef.current) return;

    // Clear previous chart
    chartRef.current.innerHTML = '';

    // Get dates and rates
    const dates = Object.keys(dailyRates).sort();
    const rates = dates.map(date => dailyRates[date]);

    // Chart dimensions
    const width = 100;
    const height = 50;
    const padding = 10;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    // Create SVG element
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('class', 'line-chart');

    // Calculate x and y scales
    const xScale = (i: number) => padding + (i / (dates.length - 1 || 1)) * chartWidth;
    const yScale = (value: number) => height - padding - (value / 100) * chartHeight;

    // Create path for the line
    const linePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    // Generate path data
    let pathData = '';
    rates.forEach((rate, i) => {
      const x = xScale(i);
      const y = yScale(rate);

      if (i === 0) {
        pathData += `M ${x} ${y}`;
      } else {
        pathData += ` L ${x} ${y}`;
      }
    });

    linePath.setAttribute('d', pathData);
    linePath.setAttribute('fill', 'none');
    linePath.setAttribute('stroke', '#3B82F6');
    linePath.setAttribute('stroke-width', '2');
    linePath.setAttribute('stroke-linecap', 'round');
    linePath.setAttribute('stroke-linejoin', 'round');

    svg.appendChild(linePath);

    // Add area under the line
    const areaPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    // Generate area path data
    let areaPathData = pathData;
    areaPathData += ` L ${xScale(rates.length - 1)} ${height - padding}`;
    areaPathData += ` L ${xScale(0)} ${height - padding}`;
    areaPathData += ' Z';

    areaPath.setAttribute('d', areaPathData);
    areaPath.setAttribute('fill', 'url(#gradient)');
    areaPath.setAttribute('opacity', '0.3');

    // Create gradient
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', 'gradient');
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '0%');
    gradient.setAttribute('y2', '100%');

    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', '#3B82F6');

    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', '#3B82F6');
    stop2.setAttribute('stop-opacity', '0');

    gradient.appendChild(stop1);
    gradient.appendChild(stop2);

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.appendChild(gradient);

    svg.appendChild(defs);
    svg.appendChild(areaPath);
    svg.appendChild(linePath);

    // Add data points
    rates.forEach((rate, i) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', xScale(i).toString());
      circle.setAttribute('cy', yScale(rate).toString());
      circle.setAttribute('r', '1.5');
      circle.setAttribute('fill', '#3B82F6');
      circle.setAttribute('stroke', 'white');
      circle.setAttribute('stroke-width', '1');

      svg.appendChild(circle);
    });

    // Add x-axis labels (only show a few to avoid overcrowding)
    const labelCount = Math.min(7, dates.length);
    const labelStep = Math.max(1, Math.floor(dates.length / labelCount));

    for (let i = 0; i < dates.length; i += labelStep) {
      const date = dates[i];
      const formattedDate = format(parseISO(date), 'MMM d');

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', xScale(i).toString());
      text.setAttribute('y', (height - 2).toString());
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '3');
      text.setAttribute('class', 'fill-gray-500 dark:fill-gray-400');
      text.textContent = formattedDate;

      svg.appendChild(text);
    }

    // Append the SVG to the chart container
    chartRef.current.appendChild(svg);
  };

  return (
    <div className="w-full h-64" ref={chartRef}></div>
  );
};

export default ProductivityTrendChart;
