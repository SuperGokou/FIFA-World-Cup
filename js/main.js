/***** Globals *****/
let svg, gLine, gXAxis, gYAxis,
    xScale = d3.scaleTime(),
    yScale = d3.scaleLinear(),
    data = [];

/***** Load & parse *****/
d3.csv("data/fifa-world-cup.csv", d => ({
  YEAR:               d3.timeParse("%Y")(d.YEAR),
  LOCATION:           d.LOCATION,
  WINNER:             d.WINNER,
  TEAMS:              +d.TEAMS,
  MATCHES:            +d.MATCHES,
  GOALS:              +d.GOALS.replace(/,/g, ""),
  AVERAGE_GOALS:      +d.AVERAGE_GOALS,
  AVERAGE_ATTENDANCE: +d.AVERAGE_ATTENDANCE.replace(/,/g, "")
})).then(csv => {
  data = csv.sort((a, b) => d3.ascending(a.YEAR, b.YEAR));
  initChart();
  updateVis();
});

/***** Build the SVG once *****/
function initChart() {
  const area = d3.select("#chart-area");
  svg = area.append("svg")
            .attr("class", "w-100 h-100")      // let CSS handle size
            .attr("preserveAspectRatio", "xMidYMid")
            .append("g");
  gLine  = svg.append("path").attr("fill","none").attr("stroke","#86ac86").attr("stroke-width",2);
  gXAxis = svg.append("g").attr("class","x-axis");
  gYAxis = svg.append("g").attr("class","y-axis");

  // dropdown & slider listeners
  d3.select("#y-axis-select").on("change", updateVis);
  initSlider();

  // redraw on resize (throttled)
  window.addEventListener("resize", d3.throttle(updateVis, 150));
}

/***** Slider *****/
function initSlider() {
  const years   = data.map(d => +d3.timeFormat("%Y")(d.YEAR));
  const sliderElement  = document.getElementById("slider");
  const slider = sliderElement.noUiSlider; 
  const minYear = d3.min(years), maxYear = d3.max(years);

  noUiSlider.create(slider, {
    start: [minYear, maxYear], connect: true, step: 1,
    range: { min: minYear, max: maxYear }, tooltips: true,
    format: { to: v => Math.round(v), from: v => +v }
  });

  slider.noUiSlider.on("update", (_, __, v) => {
    document.getElementById("slider-label-left").textContent  = v[0];
    document.getElementById("slider-label-right").textContent = v[1];
  });

  slider.noUiSlider.on("set", updateVis);
  
  // Force a redraw when the window is resized:
	window.addEventListener("resize", () => {
	  // no built-in 'refresh', so just set the same value(s) again
	  slider.set(slider.get());
	});

}

/***** Main redraw *****/
function updateVis() {
  // 1. current dims
  const { width, height } = document
        .getElementById("chart-area")
        .getBoundingClientRect();
  svg.attr("viewBox", `0 0 ${width} ${height}`);

  // 2. filter by slider
  const [lo, hi] = document.getElementById("slider").noUiSlider.get().map(Number);
  const filtered = data.filter(d => {
    const y = +d3.timeFormat("%Y")(d.YEAR);
    return y >= lo && y <= hi;
  });

  // 3. metric
  const metric = d3.select("#y-axis-select").property("value");
  xScale.range([0,width]).domain(d3.extent(filtered, d => d.YEAR));
  yScale.range([height,0]).domain([0, d3.max(filtered, d => d[metric])]).nice();

  // 4. axes
  gXAxis.attr("transform",`translate(0,${height})`)
        .call(d3.axisBottom(xScale).ticks(width/100));
  gYAxis.call(d3.axisLeft(yScale));

  // 5. line
  const line = d3.line()
                 .x(d => xScale(d.YEAR))
                 .y(d => yScale(d[metric]));
  gLine.datum(filtered).attr("d", line);

  // 6. circles
  const pts = svg.selectAll("circle").data(filtered, d => d.YEAR);
  pts.enter().append("circle")
      .attr("r",6).attr("stroke","black").attr("fill","#5c865b")
      .on("click", (_, d) => {
        svg.selectAll("circle").attr("fill","#5c865b");
        d3.select(d3.event.target).attr("fill","black");
        populatePanel(d);
      })
    .merge(pts)
      .attr("cx", d => xScale(d.YEAR))
      .attr("cy", d => yScale(d[metric]));
  pts.exit().remove();

  // 7. auto-populate with last point
  if (filtered.length) populatePanel(filtered.at(-1));
}


/***** Detail card *****/
function populatePanel(d){
  d3.select("#detail-title")
    .text(`${d.YEAR.getFullYear()} World Cup ${d.LOCATION}`);
  d3.select("#detail-winner").text(d.WINNER);
  d3.select("#detail-goals").text(d.GOALS.toLocaleString());
  d3.select("#detail-average-goals").text(d.AVERAGE_GOALS.toFixed(2));
  d3.select("#detail-matches").text(d.MATCHES);
  d3.select("#detail-teams").text(d.TEAMS);
  d3.select("#detail-average-attendance").text(d.AVERAGE_ATTENDANCE.toLocaleString());
}
