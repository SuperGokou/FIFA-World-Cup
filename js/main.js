/****************************************************
 *  FIFA World Cup - Interactive Dashboard           *
 *  ------------------------------------------------ *
 *  - Line chart with selectable metric              *
 *  - Year-range slider (noUiSlider)                 *
 *  - Detail panel populated on click                *
 ****************************************************/

/* ---------- Constants ---------- */
const CHART_WIDTH = 600;
const CHART_HEIGHT = 500;
const MARGIN = { top: 40, right: 40, bottom: 60, left: 60 };
const TRANSITION_DURATION = 600;
const COLORS = {
  line: "#3b82f6",
  circle: "#3b82f6",
  circleSelected: "#1e40af",
  circleStroke: "#1e3a8a"
};

/* ---------- SVG & Scales ---------- */
const width = CHART_WIDTH - MARGIN.left - MARGIN.right;
const height = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;

const svg = d3.select("#chart-area")
  .append("svg")
  .attr("width", CHART_WIDTH)
  .attr("height", CHART_HEIGHT)
  .append("g")
  .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

const xScale = d3.scaleTime().range([0, width]);
const yScale = d3.scaleLinear().range([height, 0]);

const xAxisG = svg.append("g").attr("class", "x-axis")
  .attr("transform", `translate(0,${height})`);
const yAxisG = svg.append("g").attr("class", "y-axis");

const lineGen = d3.line()
  .x(d => xScale(d.YEAR))
  .y(d => yScale(d.value));

svg.append("path").attr("class", "line-path")
  .attr("fill", "none")
  .attr("stroke", COLORS.line)
  .attr("stroke-width", 2);

/* ---------- Global State ---------- */
let data = [];
let filtered = [];
let selectedCir = null;

/* ---------- Load & Parse CSV ---------- */
d3.csv("data/fifa-world-cup.csv", row => {
  const parseNum = s => +s.replace(/,/g, "");
  return {
    YEAR: d3.timeParse("%Y")(row.YEAR),
    LOCATION: row.LOCATION,
    WINNER: row.WINNER,
    TEAMS: +row.TEAMS,
    MATCHES: +row.MATCHES,
    GOALS: parseNum(row.GOALS),
    AVERAGE_GOALS: +row.AVERAGE_GOALS,
    AVERAGE_ATTENDANCE: parseNum(row.AVERAGE_ATTENDANCE)
  };
}).then(csv => {
  data = csv.sort((a, b) => d3.ascending(a.YEAR, b.YEAR));
  createSlider();
  updateVis();
}).catch(err => {
  console.error("Failed to load data:", err);
  document.getElementById("chart-area").innerHTML =
    '<p class="text-danger p-3">Failed to load World Cup data.</p>';
});

/* ---------- Slider ---------- */
function createSlider() {
  const years = data.map(d => +d3.timeFormat("%Y")(d.YEAR));
  const minYear = d3.min(years);
  const maxYear = d3.max(years);
  const slider = document.getElementById("slider");

  noUiSlider.create(slider, {
    start: [minYear, maxYear],
    connect: true,
    range: { min: minYear, max: maxYear },
    step: 1,
    tooltips: true,
    format: { to: v => Math.round(v), from: v => +v }
  });

  slider.noUiSlider.on("update", (_, __, values) => {
    document.getElementById("slider-label-left").textContent = values[0];
    document.getElementById("slider-label-right").textContent = values[1];
  });

  slider.noUiSlider.on("set", (_, __, values) => updateVis(+values[0], +values[1]));
}

/* ---------- Dropdown Listener ---------- */
d3.select("#y-axis-select").on("change", () => updateVis());

/* ---------- Main Update Function ---------- */
function updateVis(minYear, maxYear) {
  // Filter by slider range
  if (minYear && maxYear) {
    filtered = data.filter(d => {
      const y = +d3.timeFormat("%Y")(d.YEAR);
      return y >= minYear && y <= maxYear;
    });
  } else {
    filtered = data;
  }

  // Get metric from dropdown
  const metric = d3.select("#y-axis-select").property("value");
  const metricData = filtered.map(d => ({ ...d, value: d[metric] }));

  // Update scales & axes
  xScale.domain(d3.extent(metricData, d => d.YEAR));
  yScale.domain([0, d3.max(metricData, d => d.value)]).nice();

  xAxisG.transition().duration(TRANSITION_DURATION)
    .call(d3.axisBottom(xScale).ticks(d3.timeYear.every(8)).tickFormat(d3.timeFormat("%Y")));
  yAxisG.transition().duration(TRANSITION_DURATION)
    .call(d3.axisLeft(yScale));

  // Update line
  svg.select(".line-path")
    .datum(metricData)
    .transition().duration(TRANSITION_DURATION)
    .attr("d", lineGen);

  // Update circles
  const circles = svg.selectAll("circle").data(metricData, d => d.YEAR);

  circles.enter().append("circle")
    .attr("r", 6)
    .attr("fill", COLORS.circle)
    .attr("stroke", COLORS.circleStroke)
    .on("click", (_, d) => {
      highlightCircle(d.YEAR);
      populatePanel(d);
    })
    .merge(circles)
    .transition().duration(TRANSITION_DURATION)
    .attr("cx", d => xScale(d.YEAR))
    .attr("cy", d => yScale(d.value));

  circles.exit().remove();

  // Auto-populate panel with latest entry
  if (metricData.length) {
    const latest = metricData[metricData.length - 1];
    highlightCircle(latest.YEAR);
    populatePanel(latest);
  }
}

/* ---------- Helpers ---------- */
function highlightCircle(yearDate) {
  if (selectedCir) selectedCir.attr("fill", COLORS.circle);
  selectedCir = svg.selectAll("circle")
    .filter(d => d.YEAR === yearDate)
    .attr("fill", COLORS.circleSelected);
}

function populatePanel(d) {
  document.getElementById("detail-title").textContent =
    `${d.YEAR.getFullYear()} World Cup ${d.LOCATION}`;
  document.getElementById("detail-winner").textContent = d.WINNER;
  document.getElementById("detail-goals").textContent = d.GOALS;
  document.getElementById("detail-average-goals").textContent = d.AVERAGE_GOALS;
  document.getElementById("detail-matches").textContent = d.MATCHES;
  document.getElementById("detail-teams").textContent = d.TEAMS;
  document.getElementById("detail-average-attendance").textContent = d.AVERAGE_ATTENDANCE.toLocaleString();
}
