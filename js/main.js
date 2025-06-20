
// margin conventions & svg drawing area - since we only have one chart, it's ok to have these stored as global variables
// ultimately, we will create dashboards with multiple graphs where having the margin conventions live in the global
// variable space is no longer a feasible strategy.

let margin = {top: 40, right: 40, bottom: 60, left: 60};

let width = 600 - margin.left - margin.right;
let height = 500 - margin.top - margin.bottom;

let svg = d3.select("#chart-area").append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
	.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Date parser
let formatDate = d3.timeFormat("%Y");
let parseDate = d3.timeParse("%Y");

// Initialize data
loadData();

// FIFA world cup
let data;
let filteredData;
let minYear;
let maxYear;
// Load CSV file
function loadData() {
	d3.csv("data/fifa-world-cup.csv", row => {
		row.EDITION = +row.EDITION;
		row.YEAR = parseDate(row.YEAR);
		row.TEAMS = +row.TEAMS;
		row.MATCHES = +row.MATCHES;
		row.GOALS = +row.GOALS;
		row.AVERAGE_GOALS = +row.AVERAGE_GOALS;
		row.AVERAGE_ATTENDANCE = +row.AVERAGE_ATTENDANCE;
		return row
	}).then(csv => {
		// Store csv data in global variable
		data = csv;

		// Extract the min and max years from the data
		minYear = d3.min(data, d => formatDate(d.YEAR)); // assuming d.YEAR is now just a year number
		maxYear = d3.max(data, d => formatDate(d.YEAR));

		var slider = document.getElementById('slider');

		noUiSlider.create(slider, {
				start: [minYear, maxYear],  // assuming you have variables for these
				connect: true,
				behaviour: 'tap-drag',
				step: 1,  // considering each step as 1 year
				range: {
					'min': Number(minYear),  // should be dynamically extracted from your data
					'max': Number(maxYear)
				},
				tooltips: true,  // displays the selected values
				format: {
					to: value => Number(value), // avoid decimals in year value
					from: value => Number(value)
				}

			});

		function updateSliderLabels (values) {
			// Assuming values are years, we'll convert them to integers for display
			document.getElementById('slider-label-left').textContent = Math.floor(values[0]);
			document.getElementById('slider-label-right').textContent = Math.floor(values[1]);
		}


		slider.noUiSlider.on('set', function (values, handle) {
			let [lowerYear, upperYear] = values.map(value => parseInt(value));
			console.log(lowerYear, upperYear);
			updateSliderLabels(values);

			// Filter the data
			filteredData = data.filter(d => formatDate(d.YEAR) >= lowerYear && formatDate(d.YEAR) <= upperYear);
			console.log(filteredData);
			// Redraw the visualization with the new filtered data
			updateVisualization(filteredData);  // this function now needs to accept the data as a parameter
		});

		updateVisualization(data);
	});
}

let xScale = d3.scaleTime()
	.range([0, width]);

let yScale = d3.scaleLinear()
	.range([height, 0]);

// X-axis
let xAxis = d3.axisBottom()
	.scale(xScale)
	.ticks(d3.timeYear.every(10))
	.tickFormat(d3.timeFormat("%Y"));

// Y-axis
let yAxis = d3.axisLeft()
	.scale(yScale); // attach the y scale to use

let xAxisGroup = svg.append("g")
	.attr("class", "x-axis")
	.attr("transform", "translate(0," + height + ")");  // Move it to the bottom of the SVG.

let yAxisGroup = svg.append("g")
	.attr("class", "y-axis");

// Render visualization
function updateVisualization(filteredData) {
	console.log(data);
	console.log(filteredData);

	let selectedOption = d3.select("#y-axis-select").node().value;

	xScale.domain(d3.extent(filteredData, d => d.YEAR));
	//yScale.domain([0, d3.max(data, d => d.GOALS)]);
	yScale.domain([0, d3.max(filteredData, d => +d[selectedOption])]);

	xAxisGroup.transition().duration(1000).call(d3.axisBottom(xScale));
	yAxisGroup.transition().duration(1000).call(d3.axisLeft(yScale));

	// X-axis group
	let line = d3.line()
		.x(d => xScale(d.YEAR)) // set the x values for the line generator
		.y(d => yScale(+d[selectedOption]))

	svg.select(".line")
		.transition()
		.duration(1000)
		.attr("d", line(filteredData)); // Update the line path for the new data

	let path = svg.selectAll(".line-path")
		.data([filteredData]);

	path
		.enter()
		.append("path")
		.attr("class", "line-path") // you can reference this class in CSS for styling
		.merge(path) // merge the enter and update selections
		.transition()
		.duration(1000)
		.attr("d", line) // apply the line generator to create the 'd' attribute
		.attr("fill", "none")
		.attr("stroke", "#86ac86")
		.attr("stroke-width", "2");

	path.exit().remove();

	// Select all circles and bind them to the new data
	let circles = svg.selectAll("circle")
		.data(filteredData);

	let selectedCircle = null; // No circle is selected initially

	circles.enter()
		.append("circle")
		.attr("class", "data-point")
		.attr("cx", d => xScale(d.YEAR))
		.attr("cy", d => yScale(+d[selectedOption]))
		.attr("r", 6)
		.on("click", function(event, d) {
			if (selectedCircle) {
				selectedCircle.attr("fill", "#5c865b"); // or whatever your original color is
			}

			// Select the new circle and change its color
			selectedCircle = d3.select(this);
			selectedCircle.attr("fill", "black");

			showEdition(d);
		})
		.merge(circles)
		.transition()
		.duration(800)
		.attr("cx", d => xScale(d.YEAR))
		.attr("cy", d => yScale(+d[selectedOption]))
		.attr("r", 6)
		.attr("fill", "#5c865b")
		.style("stroke", "black");

	circles
		.transition()
		.duration(1000)
		.attr("cx", d => xScale(d.YEAR))
		.attr("cy", d => yScale(+d[selectedOption]));

	circles.exit()
		.transition()
		.duration(1000)
		.attr("cy", 0) // transition them out by moving to the baseline
		.remove();
}

// Event listener for the select box
d3.select("#y-axis-select").on("change", function() {
	updateVisualization(data);
});

// Show details for a specific FIFA World Cup
function showEdition(d){

	const editionTitle = `${d.YEAR.getFullYear()} World Cup ${d.LOCATION}`;
	document.getElementById("detail-title").textContent = editionTitle;
	document.getElementById("detail-winner").textContent = d.WINNER;
	document.getElementById("detail-goals").textContent = d.GOALS;
	document.getElementById("detail-average-goals").textContent = d.AVERAGE_GOALS;
	document.getElementById("detail-matches").textContent = d.MATCHES;
	document.getElementById("detail-teams").textContent = d.TEAMS;
	document.getElementById("detail-average-attendance").textContent = d.AVERAGE_ATTENDANCE;
}