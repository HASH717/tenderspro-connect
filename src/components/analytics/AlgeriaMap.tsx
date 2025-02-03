import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Feature, FeatureCollection, Geometry } from 'geojson';
import algeriaGeoJson from './algeria.json';

interface WilayaData {
  wilaya: string;
  user_count: number;
}

interface AlgeriaMapProps {
  data: WilayaData[];
}

export const AlgeriaMap = ({ data }: AlgeriaMapProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = d3.select(svgRef.current);
    const width = 600;
    const height = 400;
    
    // Clear previous content
    svg.selectAll("*").remove();

    // Set up the SVG container
    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', '0 0 600 400')
      .attr('preserveAspectRatio', 'xMidYMid meet');

    // Create color scale
    const maxUsers = d3.max(data, d => d.user_count) || 0;
    const colorScale = d3.scaleSequential()
      .domain([0, maxUsers])
      .interpolator(d3.interpolateBlues);

    // Create projection
    const projection = d3.geoMercator()
      .fitSize([width, height], algeriaGeoJson as unknown as FeatureCollection<Geometry>);

    // Create path generator
    const path = d3.geoPath().projection(projection);

    // Create tooltip
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'absolute hidden bg-white p-2 rounded shadow-lg text-sm')
      .style('pointer-events', 'none');

    // Draw map
    svg.selectAll('path')
      .data((algeriaGeoJson as FeatureCollection).features)
      .enter()
      .append('path')
      .attr('d', (feature) => path(feature as Feature<Geometry>))
      .attr('fill', (d: any) => {
        const wilayaData = data.find(item => 
          item.wilaya.toLowerCase() === d.properties.name.toLowerCase()
        );
        return wilayaData ? colorScale(wilayaData.user_count) : '#eee';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
      .attr('opacity', 0)
      .transition()
      .duration(1000)
      .attr('opacity', 1);

    // Add hover effects
    svg.selectAll('path')
      .on('mouseover', function(event: MouseEvent, d: any) {
        const wilayaData = data.find(item => 
          item.wilaya.toLowerCase() === d.properties.name.toLowerCase()
        );
        
        d3.select(this)
          .transition()
          .duration(200)
          .attr('stroke-width', 2);

        tooltip
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px')
          .html(`
            <strong>${d.properties.name}</strong><br/>
            Users: ${wilayaData?.user_count || 0}
          `)
          .classed('hidden', false);
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('stroke-width', 0.5);

        tooltip.classed('hidden', true);
      });

    // Add legend
    const legendWidth = 200;
    const legendHeight = 10;
    const legendX = width - legendWidth - 20;
    const legendY = height - 30;

    const legendScale = d3.scaleLinear()
      .domain([0, maxUsers])
      .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendScale)
      .ticks(5)
      .tickSize(13);

    const legend = svg.append('g')
      .attr('transform', `translate(${legendX},${legendY})`);

    const gradientId = 'legend-gradient';
    
    const gradient = legend.append('defs')
      .append('linearGradient')
      .attr('id', gradientId)
      .attr('x1', '0%')
      .attr('x2', '100%')
      .attr('y1', '0%')
      .attr('y2', '0%');

    gradient.selectAll('stop')
      .data(d3.range(0, 1.1, 0.1))
      .enter()
      .append('stop')
      .attr('offset', d => d * 100 + '%')
      .attr('stop-color', d => colorScale(d * maxUsers));

    legend.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', `url(#${gradientId})`);

    legend.append('g')
      .call(legendAxis)
      .attr('transform', `translate(0,${legendHeight})`);

    return () => {
      tooltip.remove();
    };
  }, [data]);

  return (
    <div className="w-full h-full bg-white rounded-lg p-4">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
};