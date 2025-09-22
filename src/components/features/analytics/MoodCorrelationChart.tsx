import { useEffect, useRef } from 'react';
import { Task } from '../../../lib/types/task';
import { Mood } from '../../../lib/types/mood';
import { calculateProductivityByMood, MoodAnalytics } from '../../../lib/services/analytics';

interface MoodCorrelationChartProps {
  tasks: Task[];
  moods: Mood[];
  timeRange: string;
  moodAnalytics?: MoodAnalytics[];
}

const MoodCorrelationChart: React.FC<MoodCorrelationChartProps> = ({ tasks, moods, timeRange, moodAnalytics = [] }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    if ((tasks.length === 0 || moods.length === 0) && moodAnalytics.length === 0) return;

    // If we have analytics data, use that instead of calculating from tasks and moods
    if (moodAnalytics && moodAnalytics.length > 0) {
      // Convert analytics data to the format needed for the chart
      const productivityByMood: Record<string, { count: number; completionRate: number }> = {};

      moodAnalytics.forEach(mood => {
        if (!productivityByMood[mood.mood_name]) {
          productivityByMood[mood.mood_name] = { count: 0, completionRate: 0 };
        }

        productivityByMood[mood.mood_name].count++;
        // Update the running average
        const currentTotal = productivityByMood[mood.mood_name].completionRate *
                            (productivityByMood[mood.mood_name].count - 1);
        productivityByMood[mood.mood_name].completionRate =
          (currentTotal + mood.completion_rate) / productivityByMood[mood.mood_name].count;
      });

      // Render the chart with analytics data
      renderBarChart(productivityByMood);
    } else {
      // Fall back to calculating from tasks and moods
      const productivityByMood = calculateProductivityByMood(tasks, moods);
      renderBarChart(productivityByMood);
    }
  }, [tasks, moods, timeRange, moodAnalytics]);

  const renderBarChart = (productivityByMood: Record<string, { count: number; completionRate: number }>) => {
    if (!chartRef.current) return;

    // Clear previous chart
    chartRef.current.innerHTML = '';

    // Get moods and completion rates
    const moodEntries = Object.entries(productivityByMood)
      .sort((a, b) => b[1].completionRate - a[1].completionRate);

    // Chart dimensions
    const width = 100;
    const height = 60;
    const padding = { top: 10, right: 10, bottom: 20, left: 15 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Create SVG element
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('class', 'bar-chart');

    // Calculate scales
    const barWidth = chartWidth / moodEntries.length;
    const barPadding = barWidth * 0.2;
    const xScale = (i: number) => padding.left + i * barWidth + barPadding / 2;
    const yScale = (value: number) => height - padding.bottom - (value / 100) * chartHeight;

    // Add y-axis
    const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    yAxis.setAttribute('x1', padding.left.toString());
    yAxis.setAttribute('y1', (height - padding.bottom).toString());
    yAxis.setAttribute('x2', padding.left.toString());
    yAxis.setAttribute('y2', padding.top.toString());
    yAxis.setAttribute('stroke', '#CBD5E1');
    yAxis.setAttribute('stroke-width', '0.5');

    svg.appendChild(yAxis);

    // Add x-axis
    const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    xAxis.setAttribute('x1', padding.left.toString());
    xAxis.setAttribute('y1', (height - padding.bottom).toString());
    xAxis.setAttribute('x2', (width - padding.right).toString());
    xAxis.setAttribute('y2', (height - padding.bottom).toString());
    xAxis.setAttribute('stroke', '#CBD5E1');
    xAxis.setAttribute('stroke-width', '0.5');

    svg.appendChild(xAxis);

    // Add y-axis labels
    for (let i = 0; i <= 100; i += 25) {
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', (padding.left - 2).toString());
      label.setAttribute('y', yScale(i).toString());
      label.setAttribute('text-anchor', 'end');
      label.setAttribute('dominant-baseline', 'middle');
      label.setAttribute('font-size', '3');
      label.setAttribute('class', 'fill-gray-500 dark:fill-gray-400');
      label.textContent = `${i}%`;

      svg.appendChild(label);

      // Add grid line
      const gridLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      gridLine.setAttribute('x1', padding.left.toString());
      gridLine.setAttribute('y1', yScale(i).toString());
      gridLine.setAttribute('x2', (width - padding.right).toString());
      gridLine.setAttribute('y2', yScale(i).toString());
      gridLine.setAttribute('stroke', '#CBD5E1');
      gridLine.setAttribute('stroke-width', '0.2');
      gridLine.setAttribute('stroke-dasharray', '1,1');

      svg.appendChild(gridLine);
    }

    // Add bars
    moodEntries.forEach(([mood, data], i) => {
      const barHeight = (data.completionRate / 100) * chartHeight;

      const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bar.setAttribute('x', xScale(i).toString());
      bar.setAttribute('y', yScale(data.completionRate).toString());
      bar.setAttribute('width', (barWidth - barPadding).toString());
      bar.setAttribute('height', barHeight.toString());
      bar.setAttribute('rx', '1');
      bar.setAttribute('ry', '1');

      // Determine bar color based on mood
      let barColor = '#3B82F6'; // Default blue

      if (mood === 'Happy' || mood === 'Energetic') {
        barColor = '#10B981'; // Green
      } else if (mood === 'Sad' || mood === 'Tired') {
        barColor = '#EF4444'; // Red
      } else if (mood === 'Anxious' || mood === 'Stressed') {
        barColor = '#F59E0B'; // Yellow
      } else if (mood === 'Calm') {
        barColor = '#8B5CF6'; // Purple
      }

      bar.setAttribute('fill', barColor);

      svg.appendChild(bar);

      // Add mood label
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', (xScale(i) + (barWidth - barPadding) / 2).toString());
      label.setAttribute('y', (height - padding.bottom + 5).toString());
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('font-size', '3');
      label.setAttribute('class', 'fill-gray-500 dark:fill-gray-400');
      label.textContent = mood;

      svg.appendChild(label);

      // Add emoji
      const emoji = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      emoji.setAttribute('x', (xScale(i) + (barWidth - barPadding) / 2).toString());
      emoji.setAttribute('y', (height - padding.bottom + 10).toString());
      emoji.setAttribute('text-anchor', 'middle');
      emoji.setAttribute('font-size', '4');
      emoji.textContent = getMoodEmoji(mood);

      svg.appendChild(emoji);

      // Add value label
      const valueLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      valueLabel.setAttribute('x', (xScale(i) + (barWidth - barPadding) / 2).toString());
      valueLabel.setAttribute('y', (yScale(data.completionRate) - 2).toString());
      valueLabel.setAttribute('text-anchor', 'middle');
      valueLabel.setAttribute('font-size', '3');
      valueLabel.setAttribute('font-weight', 'bold');
      valueLabel.setAttribute('class', 'fill-gray-700 dark:fill-gray-300');
      valueLabel.textContent = `${Math.round(data.completionRate)}%`;

      svg.appendChild(valueLabel);
    });

    // Add chart title
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    title.setAttribute('x', (width / 2).toString());
    title.setAttribute('y', '5');
    title.setAttribute('text-anchor', 'middle');
    title.setAttribute('font-size', '4');
    title.setAttribute('font-weight', 'bold');
    title.setAttribute('class', 'fill-gray-700 dark:fill-gray-300');
    title.textContent = 'Task Completion Rate by Mood';

    svg.appendChild(title);

    // Append the SVG to the chart container
    chartRef.current.appendChild(svg);
  };

  // Helper function to get emoji for mood
  const getMoodEmoji = (mood: string): string => {
    switch (mood) {
      case 'Energetic': return '⚡';
      case 'Happy': return '😊';
      case 'Calm': return '😌';
      case 'Tired': return '😴';
      case 'Stressed': return '😰';
      case 'Sad': return '😢';
      case 'Angry': return '😠';
      case 'Anxious': return '😟';
      default: return '😐';
    }
  };

  return (
    <div className="w-full h-64" ref={chartRef}></div>
  );
};

export default MoodCorrelationChart;
