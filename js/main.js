
// margin conventions & svg drawing area - since we only have one chart, it's ok to have these stored as global variables
// ultimately, we will create dashboards with multiple graphs where having the margin conventions live in the global
// variable space is no longer a feasible strategy.

/****************************************************
 *  FIFA World Cup – interactive dashboard (HW-7)   *
 *  ------------------------------------------------ *
 *  – Line chart with selectable metric             *
 *  – Year-range slider (noUiSlider)                *
 *  – Detail panel populated automatically & on click*
 ****************************************************/

/* ---------- 1. SVG & scales ---------- */
const margin = { top: 40, right: 40, bottom: 60, left: 60 },
      width  = 600 - margin.left - margin.right,
      height = 500 - margin.top  - margin.bottom;

const svg = d3.select("#chart-area")
  .append("svg")
  .attr("width",  width  + margin.left + margin.right)
  .attr("height", height + margin.top  + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const xScale  = d3.scaleTime().range([0, width]);
const yScale  = d3.scaleLinear().range([height, 0]);

const xAxisG  = svg.append("g").attr("class", "x-axis")
                   .attr("transform", `translate(0,${height})`);
const yAxisG  = svg.append("g").attr("class", "y-axis");

const lineGen = d3.line()
  .x(d => xScale(d.YEAR))
  .y(d => yScale(d.value));

svg.append("path").attr("class", "line-path")
   .attr("fill", "none")
   .attr("stroke", "#86ac86")
   .attr("stroke-width", 2);

/* ---------- 2. Global state ---------- */
let data        = [];
let filtered    = [];
let selectedCir = null;

/* ---------- 3. Load & parse CSV ---------- */
d3.csv("data/fifa-world-cup.csv", row => {
  const num = s => +s.replace(/,/g, "");      // remove thousands-commas
  return {
    YEAR:               d3.timeParse("%Y")(row.YEAR),
    LOCATION:           row.LOCATION,
    WINNER:             row.WINNER,
    TEAMS:              +row.TEAMS,
    MATCHES:            +row.MATCHES,
    GOALS:              num(row.GOALS),
    AVERAGE_GOALS:      +row.AVERAGE_GOALS,
    AVERAGE_ATTENDANCE: num(row.AVERAGE_ATTENDANCE)
  };
}).then(csv => {
  data = csv.sort((a, b) => d3.ascending(a.YEAR, b.YEAR));
  createSlider();
  updateVis();              // initial draw
});

/* ---------- 4. Slider ---------- */
function createSlider() {
  const years = data.map(d => +d3.timeFormat("%Y")(d.YEAR));
  const slider = document.getElementById("slider");
  noUiSlider.create(slider, {
    start: [d3.min(years), d3.max(years)],
    connect: true,
    range: { min: d3.min(years), max: d3.max(years) },
    step: 1,
    tooltips: true,
    format: { to: v => Math.round(v), from: v => +v }
  });
  slider.noUiSlider.on("update", (_, __, values) => {
    document.getElementById("slider-label-left").textContent  = values[0];
    document.getElementById("slider-label-right").textContent = values[1];
  });
  slider.noUiSlider.on("set", (_, __, values) => updateVis(+values[0], +values[1]));
}

/* ---------- 5. Dropdown listener ---------- */
d3.select("#y-axis-select").on("change", () => updateVis());

/* ---------- 6. Main update function ---------- */
function updateVis(minYear, maxYear) {

  // 1 — filter by slider range (if given)
  if (minYear && maxYear) {
    filtered = data.filter(d => {
      const y = +d3.timeFormat("%Y")(d.YEAR);
      return y >= minYear && y <= maxYear;
    });
  } else {
    filtered = data;
  }

  // 2 — metric from dropdown
  const metric = d3.select("#y-axis-select").property("value");
  const metricData = filtered.map(d => ({ ...d, value: d[metric] }));

  // 3 — update scales & axes
  xScale.domain(d3.extent(metricData, d => d.YEAR));
  yScale.domain([0, d3.max(metricData, d => d.value)]).nice();

  xAxisG.transition().duration(600)
        .call(d3.axisBottom(xScale).ticks(d3.timeYear.every(8)).tickFormat(d3.timeFormat("%Y")));
  yAxisG.transition().duration(600).call(d3.axisLeft(yScale));

  // 4 — update line
  svg.select(".line-path")
     .datum(metricData)
     .transition().duration(600)
     .attr("d", lineGen);

  // 5 — update circles
  const circles = svg.selectAll("circle").data(metricData, d => d.YEAR);

  circles.enter().append("circle")
      .attr("r", 6)
      .attr("fill", "#5c865b")
      .attr("stroke", "black")
      .on("click", (_, d) => {
        highlightCircle(d.YEAR);
        populatePanel(d);
      })
    .merge(circles)
      .transition().duration(600)
      .attr("cx", d => xScale(d.YEAR))
      .attr("cy", d => yScale(d.value));

  circles.exit().remove();

  // 6 — auto-populate panel with the latest entry in view
  if (metricData.length) {
    highlightCircle(metricData[metricData.length - 1].YEAR);
    populatePanel(metricData[metricData.length - 1]);
  }
}

/* ---------- 7. Helpers ---------- */
function highlightCircle(yearDate) {
  if (selectedCir) selectedCir.attr("fill", "#5c865b");
  selectedCir = svg.selectAll("circle")
                   .filter(d => d.YEAR === yearDate)
                   .attr("fill", "black");
}

function populatePanel(d) {
  document.getElementById("detail-title").textContent =
      `${d.YEAR.getFullYear()} World Cup ${d.LOCATION}`;

  document.getElementById("detail-winner").textContent            = d.WINNER;
  document.getElementById("detail-goals").textContent             = d.GOALS;
  document.getElementById("detail-average-goals").textContent     = d.AVERAGE_GOALS;
  document.getElementById("detail-matches").textContent           = d.MATCHES;
  document.getElementById("detail-teams").textContent             = d.TEAMS;
  document.getElementById("detail-average-attendance").textContent= d.AVERAGE_ATTENDANCE.toLocaleString();
}
