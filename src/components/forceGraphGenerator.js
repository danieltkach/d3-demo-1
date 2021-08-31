import * as d3 from "d3";
import "d3-force";
import { noop2 } from "../Graph/graphUtils";
import styles from "../Graph/secondIteration.module.css";
import { statusHebToEng } from "../listToGraph/processor";

export function runForceGraph(
  container: HTMLDivElement,
  linksData: any,
  nodesData: any,
  nodeHoverTooltip: any
) {
  const links = linksData.map((d: any) => Object.assign({}, d, { source: d.start_node, target: d.end_node }));
  const nodes = nodesData.map((d: any) => Object.assign({}, d, { statusEng: statusHebToEng(d.status), date: d.firstPositiveTestDate ? new Date(d.firstPositiveTestDate) : undefined}));

  const containerRect = container.getBoundingClientRect();
  const height = containerRect.height;
  const width = containerRect.width;

  const color = (d: d3.HierarchyPointNode) => {
    switch (d.labels[0]) {
      case "Tourist": {
        return "#9D79A0";
      }
      case "Patient": {
        switch (d.statusEng) {
          case "dead": {
            return "#7F7D7D";
          }
          case "sick": {
            return "#FB952A";
          }
          case "healthy": {
            return "#1DB022";
          }
          default: {
            return "#fff";
          }
        }
      }
      case "Flight": {
        return "#CAD496";
      }
      case "Country": {
        return "#CADFFF";
      }
      default: {
        return "#fff";
      }
    }
  };

  const icon = (d: d3.HierarchyPointNode) => {
    switch (d.labels[0]) {
      case "Tourist": {
        return '\uf5c1';
      }
      case "Patient": {
        console.log(d);
        return d.gender === "זכר" ? "\uf222" : "\uf221";
      }
      case "Flight": {
        return '\uf072';
      }
      case "Country": {
        return '\uf0ac';
      }
      default: {
        return undefined;
      }
    }
  };

  const getClass = (d: d3.HierarchyPointNode) => {
    switch (d.labels[0]) {
      case "Tourist": {
        return styles.tourist;
      }
      case "Patient": {
        return d.gender === "male" ? styles.male : styles.female;
      }
      case "Flight": {
        return styles.event;
      }
      case "Country": {
        return undefined;
      }
      default: {
        return undefined;
      }
    }
  }

  const drag = (simulation: any) => {
    const dragstarted = (d: any) => {
      if (!d3.event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    };

    const dragged = (d: any) => {
      d.fx = d3.event.x;
      d.fy = d3.event.y;
    };

    const dragended = (d: any) => {
      if (!d3.event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    };

    return d3
      .drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  };

  // Add the tooltip element to the graph
  const tooltip = document.querySelector("#graph-tooltip");
  if (!tooltip) {
    const tooltipDiv = document.createElement("div");
    tooltipDiv.classList.add(styles.tooltip);
    tooltipDiv.style.opacity = "0";
    tooltipDiv.id = "graph-tooltip";
    document.body.appendChild(tooltipDiv);
  }
  const div = d3.select("#graph-tooltip");

  const addTooltip = (
    hoverTooltip: (node: d3.HierarchyPointNode, parent?: d3.HierarchyPointNode) => string = noop2,
    d: d3.HierarchyPointNode,
    x: number,
    y: number
  ) => {
    div
      .transition()
      .duration(200)
      .style("opacity", 0.9);
    div
      .html(hoverTooltip(d, d.parent?.data))
      .style("left", `${x}px`)
      .style("top", `${y - 28}px`);
  };

  const removeTooltip = () => {
    div
      .transition()
      .duration(200)
      .style("opacity", 0);
  };

  const simulation = d3
    .forceSimulation(nodes)
    .force("link", d3.forceLink(links).id((d: d3.HierarchyPointNode) => d.id))
    .force("charge", d3.forceManyBody().strength(-50))
    .force("x", d3.forceX())
    .force("y", d3.forceY());

  const svg = d3
    .select(container)
    .append("svg")
    // @ts-ignore
    .attr("viewBox", [-width / 2, -height / 2, width, height])
    .call(d3.zoom().on("zoom", function () {
      svg.attr("transform", d3.event.transform);
    }));

  const link = svg
    .append("g")
    .attr("stroke", "#999")
    .attr("stroke-opacity", 0.6)
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("stroke-width", (d: d3.HierarchyPointNode) => Math.sqrt(d.value));

  const node = svg
    .append("g")
    .attr("stroke", "#fff")
    .attr("stroke-width", 2)
    .selectAll("circle")
    .data(nodes)
    .join("circle")
    .attr("r", 12)
    .attr("fill", color)
    .call(drag(simulation));

  const label = svg.append("g")
    .attr("class", "labels")
    .selectAll("text")
    .data(nodes)
    .enter()
    .append("text")
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .attr("class", (d: d3.HierarchyPointNode) => `fa ${getClass(d)}`)
    .text((d: d3.HierarchyPointNode) => {return icon(d);})
    .call(drag(simulation));

  label.on("mouseover", (d: d3.HierarchyPointNode) => {
    addTooltip(
      nodeHoverTooltip,
      d,
      d3.event.pageX,
      d3.event.pageY
    );
  })
    .on("mouseout", () => {
      removeTooltip();
    });

  simulation.on("tick", () => {
    //update link positions
    link
      .attr("x1", (d: d3.HierarchyPointNode) => d.source.x)
      .attr("y1", (d: d3.HierarchyPointNode) => d.source.y)
      .attr("x2", (d: d3.HierarchyPointNode) => d.target.x)
      .attr("y2", (d: d3.HierarchyPointNode) => d.target.y);

    // update node positions
    node
      .attr("cx", (d: d3.HierarchyPointNode) => d.x)
      .attr("cy", (d: d3.HierarchyPointNode) => d.y);

    // update label positions
    label
      .attr("x", (d: d3.HierarchyPointNode) => { return d.x; })
      .attr("y", (d: d3.HierarchyPointNode) => { return d.y; })
  });

  return {
    destroy: () => {
      simulation.stop();
    },
    nodes: () => {
      return svg.node();
    }
  };
}
