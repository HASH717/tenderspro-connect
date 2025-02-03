import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface WilayaData {
  name: string;
  users: number;
}

interface AlgeriaMapProps {
  data: WilayaData[];
}

export const AlgeriaMap = ({ data }: AlgeriaMapProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = 600;
    const height = 400;

    // Set up the SVG container
    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', '0 0 600 400')
      .attr('preserveAspectRatio', 'xMidYMid meet');

    // Add a background rectangle for better visibility
    svg
      .append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', '#f8fafc');

    // Add the map path from the image
    svg
      .append('path')
      .attr('d', `M 50 50 L ${width-50} 50 L ${width-50} ${height-50} L 50 ${height-50} Z`)
      .attr('stroke', '#e2e8f0')
      .attr('stroke-width', 2)
      .attr('fill', 'none');

    // Add animation
    svg
      .selectAll('path')
      .attr('opacity', 0)
      .transition()
      .duration(1000)
      .attr('opacity', 1);

  }, [data]);

  return (
    <div className="w-full h-full bg-white rounded-lg p-4">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
};