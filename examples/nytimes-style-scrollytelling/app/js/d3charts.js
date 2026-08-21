// http://bl.ocks.org/mstanaland/6106487
var formatComma = d3.format(","),
    formatDecimal = d3.format(".1f"),
    formatDecimalComma = d3.format(",.2f"),
    formatSuffix = d3.format(".2s"),
    formatSuffixDecimal1 = d3.format(".1s"),
    formatSuffixDecimal2 = d3.format(".2s"),
    formatMoney = function(d) { return "$" + formatDecimalComma(d); },
    formatPercent = function(d) { return d + "%"; };
var x;
var y;
var svg;
var dataset1 = [{
        "key": "female",
        "value": "18100"
    },
    {
        "key": "male",
        "value": "255600"
    },
    {
        "key": "female",
        "value": "39100"
    },
    {
        "key": "male",
        "value": "316400"
    },
    {
        "key": "female",
        "value": "43600"
    },
    {
        "key": "male",
        "value": "317700"
    },
    {
        "key": "female",
        "value": "0"
    },
    {
        "key": "male",
        "value": "0"
    }
]
var dataset2 = [{
        "key": "female",
        "value": "18100"
    },
    {
        "key": "male",
        "value": "255600"
    },
    {
        "key": "female",
        "value": "39100"
    },
    {
        "key": "male",
        "value": "316400"
    },
    {
        "key": "female",
        "value": "43600"
    },
    {
        "key": "male",
        "value": "317700"
    },
    {
        "key": "female",
        "value": "536800"
    },
    {
        "key": "male",
        "value": "449600"
    }
]

var data = d3.csvParse("group,female,male\n1981,18100,255600\n1992,39100,316400\n2008,43600,317700\n2020,536800,449600")
var linedata = d3.csvParse("date,Females,Males\nFeb,9015900,9833900\nMar,8361200,9434700")
var linedata2 = d3.csvParse("date,Females,Males\nMar,8361200,9434700\nApr,7522500,8446300\nMay,7731400,8872000\nJun,8259400,9482800")
var linedata3 = d3.csvParse("date,Females,Males\nJun,8259400,9482800\nJul,8382000,9656500\nAug,8472300,9746000")

var racedata = d3.csvParse("race,employment\nFilipino,77.1\nWhite,66.6\nSoutheast Asian,63.7\nLatin American,63.7\nBlack,61.8\nSouth Asian,57.2\nChinese,56.7\nArab,45.2")

var dataset1 = [{
        "key": "Filipino",
        "value": "18100"
    },
    {
        "key": "White",
        "value": "255600"
    },
    {
        "key": "female",
        "value": "39100"
    },
    {
        "key": "male",
        "value": "316400"
    },
    {
        "key": "female",
        "value": "43600"
    },
    {
        "key": "male",
        "value": "317700"
    },
    {
        "key": "female",
        "value": "0"
    },
    {
        "key": "male",
        "value": "0"
    }
]



var color = d3.scaleOrdinal(d3.schemeCategory10);
color.domain(d3.keys(linedata[0]).filter(function(key) { return key !== "date"; }));

var companies = color.domain().map(function(name) {
    return {
        name: name,
        values: linedata.map(function(d) {
            return { date: d.date, price: +d[name] };
        })
    };
});

var companies2 = color.domain().map(function(name) {
    return {
        name: name,
        values: linedata2.map(function(d) {
            return { date: d.date, price: +d[name] };
        })
    };
});

var companies3 = color.domain().map(function(name) {
    return {
        name: name,
        values: linedata3.map(function(d) {
            return { date: d.date, price: +d[name] };
        })
    };
});

var chartHeight, chartWidth, chartMargin, width, height;


$("document").ready(function() {
    setTimeout(function(){ chartSetup(); }, 1000);
    
})

function chartSetup() {

    if (exists(svg)) {
        d3.selectAll("#my_dataviz *").remove();
    }
    chartHeight = Math.ceil($('#my_dataviz').height());
    chartWidth = Math.ceil($('#my_dataviz').width());

    // set the dimensions and margins of the graph
    chartMargin = { top: 30, right: 30, bottom: 60, left: 0 },
        width = chartWidth - chartMargin.left - chartMargin.right,
        height = chartHeight - chartMargin.top - chartMargin.bottom;

    // append the svg object to the body of the page
    svg = d3.select("#my_dataviz")
        .append("svg")
        .attr("width", width + chartMargin.left + chartMargin.right)
        .attr("height", height + chartMargin.top + chartMargin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + (chartMargin.left - chartMargin.right / 2) + "," + chartMargin.top + ")");

    // Parse the Data

    var defs = svg.append("defs")

    //make defs and add the linear gradient
    var lg = defs.append("linearGradient")
        .attr("id", "blackgrad") //id of the gradient
        .attr("x1", "0%")
        .attr("x2", "0%")
        .attr("y1", "0%")
        .attr("y2", "100%") //since its a vertical linear gradient 
    ;
    lg.append("stop")
        .attr("offset", "0%")
        .style("stop-color", "#000") //end in red
        .style("stop-opacity", 1)

    lg.append("stop")
        .attr("offset", "100%")
        .style("stop-color", "#000") //start in blue
        .style("stop-opacity", 0.7)

    var lg2 = defs.append("linearGradient")
        .attr("id", "whitegrad") //id of the gradient
        .attr("x1", "0%")
        .attr("x2", "0%")
        .attr("y1", "0%")
        .attr("y2", "100%") //since its a vertical linear gradient 
    ;
    lg2.append("stop")
        .attr("offset", "0%")
        .style("stop-color", "#fff") //end in red
        .style("stop-opacity", 1)

    lg2.append("stop")
        .attr("offset", "100%")
        .style("stop-color", "#fff") //start in blue
        .style("stop-opacity", 0.5)

    // List of subgroups = header of the csv files = soil condition here
    var subgroups = data.columns.slice(1)
    // List of groups = species here = value of the first column called group -> I show them on the X axis
    // var groups = d3.map(data, function(d) { return (d.group) }).keys()
    var groups = ["1981", "1992", "2008", "2020"]

    // Add X axis
    x = d3.scaleBand()
        .domain(groups)
        .range([0, width])
        .padding([0.3])
    svg.append("g")
        .attr("class", "x-axis")
        // .attr("transform", "translate(0," + height + ")")
        .attr("transform", "translate(0," + (height + 10) + ")")
        .call(d3.axisBottom(x).tickSize(0))

    // Add Y axis
    y = d3.scaleLinear()
        .domain([0, 500000])
        .range([height, 0]);
    svg.append("g")
        .attr("class", "y-axis")
        .attr("transform", "translate(20, 0)")
        .call(d3.axisRight(y).tickSize(chartWidth - chartMargin.left - chartMargin.right - 40).tickFormat(formatSuffix));

        svg.select(".y-axis")
        .transition().duration(800)
        .call(d3.axisRight(y).tickSize(chartWidth - chartMargin.left - chartMargin.right - 40).tickFormat(formatSuffix));

    // Another scale for subgroup position?
    var xSubgroup = d3.scaleBand()
        .domain(subgroups)
        .range([0, x.bandwidth()])
        .padding([0])

    // color palette = one color per subgroup
    var color = d3.scaleOrdinal()
        .domain(subgroups)
        .range(['url(#whitegrad)', 'url(#blackgrad)'])
    // color palette = one color per subgroup
    var textcolor = d3.scaleOrdinal()
        .domain(subgroups)
        .range(['#fff', '#000'])

    // Show the bars
    svg.append("g")
        .selectAll("g")
        // Enter in data = loop group per group
        .data(data)
        .enter()
        .append("g")
        .attr("transform", function(d) { return "translate(" + x(d.group) + ",0)"; })
        .selectAll("rect")
        .data(function(d) { return subgroups.map(function(key) { return { key: key, value: d[key] }; }); })
        .enter()
        .append("g")
        .attr("class", "bar")
        .append("rect")
        .attr("x", function(d) { return xSubgroup(d.key); })
        // .attr("y", function(d) { return y(d.value); })
        .attr("y", height)
        .attr("width", xSubgroup.bandwidth())
        .attr("fill", function(d) { return color(d.key); })
        .attr("opacity", 0.8);

    svg.selectAll(".bar")
        .append("text")
        .attr("width", xSubgroup.bandwidth())
        .text(function(d) { return formatSuffix(d.value); })
        .attr("x", function(d) { return xSubgroup(d.key); })
        // .attr("y", function(d) {return y(d.value)+20;  })
        .attr("y", height)
        .attr("fill", function(d) { return textcolor(d.key); })
        .attr("opacity", 0);

    drawLineChart(companies, 1);
    drawLineChart(companies2, 2);
    drawLineChart(companies3, 3);

}

function drawLineChart(dataset, id) {
    y = d3.scaleLinear()
        .domain([7400000, 10000000])
        .range([height, 0]);
    // Add X axis
    x = d3.scaleBand()
        .domain(["Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"])
        .range([0, width])
        .padding([1])

    var company = svg.selectAll(".company")
        .data(dataset)
        .enter().append("g")
        .attr("class", "line-group company_" + id)
        .attr("opacity", 0);


    var line = d3.line()
        .x(function(d) { return x(d.date); })
        .y(function(d) { return y(d.price); });


    var path = svg.selectAll(".company_" + id).append("path")
        .attr("class", function(d) {
            return "line " + d.name + "_" + id
        })
        .attr("d", function(d) { return line(d.values); })
        .attr("fill", "none")
        // .attr("stroke", "steelblue")
        .attr("stroke-width", 3)
        .style("stroke", function(d) {
            if (d.name == "Females") { return "#fff" } else { return "#000"; }
        })


    var annotation = company
        .append("g")
        .attr("class", function(d) {
            return "annotation_" + id
        })
        .attr("opacity", 0)
    annotation.append("text")
        .text(function(d) {
            if (d.name == "Females") { return formatComma(-(9015900 - (d.values[d.values.length - 1].price))); } else { return formatComma(-(9833900 - (d.values[d.values.length - 1].price))); }

        })
        .attr("x", function(d) { return x(d.values[d.values.length - 1].date) + 10; })
        .attr("y", function(d) { return y(d.values[d.values.length - 1].price); })
        .style("text-anchor", function(d) {
            if (id == 3) { return "end" } else if (id == 2) { return "middle" } else { return "start"; }
        })
        .style("transform", function(d) {
            if (id == 3) { return "translate(-13px, -10px)" } else if (id == 2) { return "translate(0px, -14px)" } else { return ""; }
        })
        .style("font-weight", "bold")
        .style("fill", function(d) {
            if (d.name == "Females") { return "#fff" } else { return "#000"; }
        }).append('tspan')
        .text(" since Feb.")
        .style("font-weight", "400")
        // .style("opacity",0.7)
        .style("fill", function(d) {
            if (d.name == "Females") { return "#fbcbcb" } else { return "#491919"; }
        })

    // .attr("dy", '1.2em')
    // .attr("x", function(d) { return x(d.values[d.values.length - 1].date) + 10; })
    // .attr("y", function(d) { return y(d.values[d.values.length - 1].price); })
    // .attr('text-anchor', function(d) {
    //     if (id == 3) { return "end" } else { return "start"; }
    // })
    // .attr("y", height)
    // .attr("fill", function(d) { return textcolor(d.key); })

    if (id === 1) {
        company
            .append('circle')
            // .attr('cx', '50%')
            // .attr('cy', '50%')
            .attr('r', 5)
            .attr("cx", function(d) { return x(d.values[0].date); })
            .attr("cy", function(d) { return y(d.values[0].price); })
            .style("fill", function(d) {
                if (d.name == "Females") { return "#fff" } else { return "#000"; }
            })
    }


    annotation
        .append('circle')
        // .attr('cx', '50%')
        // .attr('cy', '50%')
        .attr('r', 5)
        .attr("cx", function(d) { return x(d.values[d.values.length - 1].date); })
        .attr("cy", function(d) { return y(d.values[d.values.length - 1].price); })
        .style("fill", function(d) {
            if (d.name == "Females") { return "#fff" } else { return "#000"; }
        })

    var femaleLength = path._groups[0][0].getTotalLength() + 10;
    var maleLength = path._groups[0][1].getTotalLength() + 10;

    d3.select(".Females_" + id)
        .attr("data-length", femaleLength)
        .attr("stroke-dasharray", femaleLength + " " + femaleLength)
        .attr("stroke-dashoffset", femaleLength)

    d3.select(".Males_" + id)
        .attr("data-length", maleLength)
        .attr("stroke-dasharray", maleLength + " " + maleLength)
        .attr("stroke-dashoffset", maleLength)
}

function animateChartLeave() {
    // $("#my_dataviz").finish().fadeTo(500, 0);
    // Animation
    svg.selectAll("rect")
        .transition()
        .duration(0)
        .delay(0)
        .attr("y", height)
        .attr("height", 0)

    svg.selectAll(".bar text")
        .data(dataset1)
        .transition()
        .duration(0)
        .delay(0)
        .attr("y", height)
        .attr("opacity", 0);

    svg.selectAll(".racebar text")
        .data(racedata)
        .transition()
        .duration(800)
        .attr("opacity", 0)
        .attr("y", height)
}

function animateChartEnter() {
    $("#my_dataviz").finish().fadeTo(1000, 1);
    // Animation
    svg.selectAll("rect")
        .transition()
        .duration(0)
        .delay(0)
        .attr("height", 0)
}



function animateChart1() {
   chartHeight = Math.ceil($('#my_dataviz').height());
    chartWidth = Math.ceil($('#my_dataviz').width());

    // set the dimensions and margins of the graph
    chartMargin = { top: 30, right: 30, bottom: 60, left: 0 },
        width = chartWidth - chartMargin.left - chartMargin.right,
        height = chartHeight - chartMargin.top - chartMargin.bottom;

    d3.select("#chart-title").text("Net job losses")
    // Animation
    y = d3.scaleLinear()
        .domain([0, 500000])
        .range([height, 0]);
    svg.select(".y-axis")
        .transition().duration(800)
        .call(d3.axisRight(y).tickSize(chartWidth - chartMargin.left - chartMargin.right - 40).tickFormat(formatSuffix));

    // Add X axis
    x = d3.scaleBand()
        .domain(["1981", "1992", "2008", "2020"])
        .range([0, width])
        .padding([0.3])

    svg.select(".x-axis")
        .transition().duration(1)
        .attr("transform", "translate(0," + (height + 10) + ")")
        .call(d3.axisBottom(x).tickSize(0));
    // Animation
    svg.selectAll("rect")
        .data(dataset1)
        .transition()
        .duration(800)
        .attr("y", function(d) { return y(d.value); })
        .attr("height", function(d) { return height - y(d.value); })
    // .attr("opacity", function(d, i) { if (i < 6) { return 0.4 } else { return 1 } });

    svg.selectAll(".bar")
        .data(dataset1)
        .transition()
        .duration(800)
        .attr("opacity", 1);

    svg.selectAll(".bar text")
        .data(dataset1)
        .transition()
        .duration(800)
        .attr("opacity", function(d, i) { if (i < 6) { return 1 } else { return 0 } })
        .attr("y", function(d) { return y(d.value) - 5; })
}

function animateChart2() {
    chartHeight = Math.ceil($('#my_dataviz').height());
    chartWidth = Math.ceil($('#my_dataviz').width());

    // set the dimensions and margins of the graph
    chartMargin = { top: 30, right: 30, bottom: 60, left: 0 },
        width = chartWidth - chartMargin.left - chartMargin.right,
        height = chartHeight - chartMargin.top - chartMargin.bottom;

    d3.select("#chart-title").text("Net job losses")
    y = d3.scaleLinear()
        .domain([0, 500000])
        .range([height, 0]);
    svg.select(".y-axis")
        .transition().duration(800)
        .call(d3.axisRight(y).tickSize(chartWidth - chartMargin.left - chartMargin.right - 40).tickFormat(formatSuffix));

    // Add X axis
    x = d3.scaleBand()
        .domain(["1981", "1992", "2008", "2020"])
        .range([0, width])
        .padding([0.3])

    svg.select(".x-axis")
        .transition().duration(1)
        .attr("transform", "translate(0," + (height + 10) + ")")
        .call(d3.axisBottom(x).tickSize(0));
    // Animation
    svg.selectAll("rect")
        .data(dataset2)
        .transition()
        .duration(800)
        .attr("y", function(d) { return y(d.value); })
        .attr("height", function(d) { return height - y(d.value); })
    // .attr("opacity", function(d, i) { if (i < 6) { return 0.4 } else { return 1 } });

    svg.selectAll(".bar")
        .data(dataset2)
        .transition()
        .duration(800)
        .attr("opacity", function(d, i) { if (i < 6) { return 0.6 } else { return 1 } });

    svg.selectAll(".bar text")
        .data(dataset2)
        .transition()
        .duration(800)
        .attr("opacity", 1)
        .attr("y", function(d) { return y(d.value) - 5; })

    // var femaleLength = path._groups[0][0].getTotalLength();
    // var maleLength = path._groups[0][1].getTotalLength();

    // d3.select(".Females")
    //     .transition()
    //     .duration(800)
    //     .attr("opacity", 0)
    //     .attr("stroke-dasharray", femaleLength + " " + femaleLength)
    //     .attr("stroke-dashoffset", femaleLength)

    // d3.select(".Males")
    //     .transition()
    //     .duration(800)
    //     .attr("opacity", 0)
    //     .attr("stroke-dasharray", maleLength + " " + maleLength)
    //     .attr("stroke-dashoffset", maleLength)



    d3.selectAll(".line-group")
        .transition()
        .duration(500)
        .attr("opacity", 0)

    d3.select(".Females_1")
        .transition()
        .duration(500)
        .attr("stroke-dashoffset", d3.select(".Females_1").attr("data-length"));

    d3.select(".Males_1")
        .transition()
        .duration(500)
        .attr("stroke-dashoffset", d3.select(".Males_1").attr("data-length"));

    d3.select(".Females_2")
        .transition()
        .duration(800)
        .attr("stroke-dashoffset", d3.select(".Females_2").attr("data-length"));

    d3.select(".Males_2")
        .transition()
        .duration(800)
        .attr("stroke-dashoffset", d3.select(".Males_2").attr("data-length"));
}

function animateChart3() {
    chartHeight = Math.ceil($('#my_dataviz').height());
    chartWidth = Math.ceil($('#my_dataviz').width());

    // set the dimensions and margins of the graph
    chartMargin = { top: 30, right: 30, bottom: 60, left: 0 },
        width = chartWidth - chartMargin.left - chartMargin.right,
        height = chartHeight - chartMargin.top - chartMargin.bottom;

    d3.select("#chart-title").text("Employment by sex 2020 (ages 15+)")
    y = d3.scaleLinear()
        .domain([7400000, 10000000])
        .range([height, 0]);
    svg.select(".y-axis")
        .transition().duration(800)
        .call(d3.axisRight(y).tickSize(chartWidth - chartMargin.left - chartMargin.right - 40).tickFormat(formatSuffix));
    // Add X axis
    x = d3.scaleBand()
        .domain(["Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"])
        .range([0, width])
        .padding([1])
    svg.select(".x-axis")
        .transition().duration(1)
        // .attr("transform", "translate(0," + (chartHeight - chartMargin.top - chartMargin.bottom) + ")")
        // .call(d3.axisTop(x).tickSize(chartHeight - chartMargin.top - chartMargin.bottom))
        // .selectAll(".tick text")
        // .attr("transform", "translate(0, -15)")
        .attr("transform", "translate(0," - (chartHeight + 10 - chartMargin.top - chartMargin.bottom) + ")")
        .call(d3.axisBottom(x).tickSize(chartHeight - chartMargin.top - chartMargin.bottom))
        .selectAll(".tick text") // selects the text within all groups of ticks
        .attr("transform", "translate(0, 10)")

    svg.selectAll("rect")
        .transition()
        .duration(800)
        .attr("y", height)
        .attr("height", 0)

    svg.selectAll(".bar")
        .data(dataset2)
        .transition()
        .duration(800)
        .attr("opacity", 0);
    svg.selectAll(".bar text")
        .data(dataset1)
        .transition()
        .duration(800)
        .attr("y", height)
        .attr("opacity", 0).on("end", function() {});

    // var femaleLength = Math.round(path._groups[0][0].getTotalLength());
    // var maleLength = Math.round(path._groups[0][1].getTotalLength());
    // console.log(maleLength)

    // d3.select(".Females")
    //     .transition()
    //     .duration(800)
    //     .delay(500)
    //     .attr("opacity", 0.7)
    //     .attr("stroke-dashoffset", (femaleLength*((100/7/100)*4)));

    // d3.select(".Males")
    //     .transition()
    //     .duration(800)
    //     .delay(500)
    //     .attr("opacity", 0.7)
    //     .attr("stroke-dashoffset", (maleLength*((100/7/100)*4)));

    d3.selectAll(".line-group, .annotation_1")
        .transition()
        .duration(500)
        .attr("opacity", 1)
    d3.selectAll(".annotation_2, .annotation_3")
        .transition()
        .duration(500)
        .attr("opacity", 0)

    d3.select(".Females_1")
        .transition()
        .duration(500)
        .attr("stroke-dashoffset", 0);

    d3.select(".Males_1")
        .transition()
        .duration(500)
        .attr("stroke-dashoffset", 0);

    d3.select(".Females_2")
        .transition()
        .duration(800)
        .attr("stroke-dashoffset", d3.select(".Females_2").attr("data-length"));

    d3.select(".Males_2")
        .transition()
        .duration(800)
        .attr("stroke-dashoffset", d3.select(".Males_2").attr("data-length"));


}


function animateChart4() {
    chartHeight = Math.ceil($('#my_dataviz').height());
    chartWidth = Math.ceil($('#my_dataviz').width());

    // set the dimensions and margins of the graph
    chartMargin = { top: 30, right: 30, bottom: 60, left: 0 },
        width = chartWidth - chartMargin.left - chartMargin.right,
        height = chartHeight - chartMargin.top - chartMargin.bottom;

    d3.selectAll(".annotation_1, .annotation_3")
        .transition()
        .duration(500)
        .attr("opacity", 0)

    d3.selectAll(".line-group, .annotation_2")
        .transition()
        .duration(500)
        .attr("opacity", 1)

    d3.selectAll(".Females_1, .Females_2")
        .transition()
        .duration(800)
        .attr("stroke-dashoffset", 0);

    d3.selectAll(".Males_1, .Males_2")
        .transition()
        .duration(800)
        .attr("stroke-dashoffset", 0);

    d3.select(".Females_3")
        .transition()
        .duration(800)
        .attr("stroke-dashoffset", d3.select(".Females_3").attr("data-length"));

    d3.select(".Males_3")
        .transition()
        .duration(800)
        .attr("stroke-dashoffset", d3.select(".Males_3").attr("data-length"));



}

function animateChart5() {
   chartHeight = Math.ceil($('#my_dataviz').height());
    chartWidth = Math.ceil($('#my_dataviz').width());

    // set the dimensions and margins of the graph
    chartMargin = { top: 30, right: 30, bottom: 60, left: 0 },
        width = chartWidth - chartMargin.left - chartMargin.right,
        height = chartHeight - chartMargin.top - chartMargin.bottom;

    d3.select("#chart-title").text("Employment by sex 2020 (ages 15+)")
    y = d3.scaleLinear()
        .domain([7400000, 10000000])
        .range([height, 0]);
    svg.select(".y-axis")
        .transition().duration(800)
        .call(d3.axisRight(y).tickSize(chartWidth - chartMargin.left - chartMargin.right - 40).tickFormat(formatSuffix));
    // Add X axis
    x = d3.scaleBand()
        .domain(["Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"])
        .range([0, width])
        .padding([1])
    svg.select(".x-axis")
        .transition().duration(1)
        // .attr("transform", "translate(0," + (chartHeight - chartMargin.top - chartMargin.bottom) + ")")
        // .call(d3.axisTop(x).tickSize(chartHeight - chartMargin.top - chartMargin.bottom))
        // .selectAll(".tick text")
        // .attr("transform", "translate(0, -15)")
        .attr("transform", "translate(0," - (chartHeight + 10 - chartMargin.top - chartMargin.bottom) + ")")
        .call(d3.axisBottom(x).tickSize(chartHeight - chartMargin.top - chartMargin.bottom))
        .selectAll(".tick text") // selects the text within all groups of ticks
        .attr("transform", "translate(0, 10)")

    d3.selectAll(".annotation_1, .annotation_2")
        .transition()
        .duration(500)
        .attr("opacity", 0)

    d3.selectAll(".line-group, .annotation_3")
        .transition()
        .duration(500)
        .attr("opacity", 1)

    d3.selectAll(".Females_1, .Females_2, .Females_3")
        .transition()
        .duration(800)
        .attr("stroke-dashoffset", 0);

    d3.selectAll(".Males_1, .Males_2, .Males_3")
        .transition()
        .duration(800)
        .attr("stroke-dashoffset", 0);

}


function animateChart6() {
    chartHeight = Math.ceil($('#my_dataviz').height());
    chartWidth = Math.ceil($('#my_dataviz').width());

    // set the dimensions and margins of the graph
    chartMargin = { top: 30, right: 30, bottom: 60, left: 0 },
        width = chartWidth - chartMargin.left - chartMargin.right,
        height = chartHeight - chartMargin.top - chartMargin.bottom;


    d3.select("#chart-title").text("Female employment by race (2020?)")

    d3.selectAll(".line-group")
        .transition()
        .duration(500)
        .attr("opacity", 0)

    d3.select(".Females_1")
        .transition()
        .duration(800)
        .attr("stroke-dashoffset", d3.select(".Females_1").attr("data-length"));

    d3.select(".Males_1")
        .transition()
        .duration(800)
        .attr("stroke-dashoffset", d3.select(".Males_1").attr("data-length"));


    d3.select(".Females_2")
        .transition()
        .duration(800)
        .attr("stroke-dashoffset", d3.select(".Females_2").attr("data-length"));

    d3.select(".Males_2")
        .transition()
        .duration(800)
        .attr("stroke-dashoffset", d3.select(".Males_2").attr("data-length"));

    d3.select(".Females_3")
        .transition()
        .duration(800)
        .attr("stroke-dashoffset", d3.select(".Females_3").attr("data-length"));

    d3.select(".Males_3")
        .transition()
        .duration(800)
        .attr("stroke-dashoffset", d3.select(".Males_3").attr("data-length"));

    var racegroups = ["Arab", "Chinese", "South Asian", "Black", "Latin American", "Southeast Asian", "White", "Filipino"]

    x = d3.scaleBand()
        .domain(racegroups)
        .range([0, width])
        .padding([0.3])
    // Add Y axis
    y = d3.scaleLinear()
        .domain([0, 77.1])
        .range([height, 0]);


    svg.select(".y-axis")
        .transition().duration(800).delay(500)
        .call(d3.axisRight(y).tickSize(chartWidth - chartMargin.left - chartMargin.right - 20).tickFormat(formatPercent));


    svg.select(".x-axis")
        .transition().duration(1).delay(500)
        .attr("transform", "translate(17," + (height + 10) + ")")
        .call(d3.axisBottom(x).tickSize(0))
        .on("end", function() {
            if (mobile) {
                svg.selectAll(".x-axis .tick text")
                    .style("font-size", "13px")
                    // .style("transform", "translate(0px, -17px)")
                    .attr("transform", "rotate(90)")
                    .attr("text-anchor", "start")
            } else {
                svg.selectAll(".x-axis .tick text")
                    .style("font-size", "13px")
                    .style("transform", "translate(-8px, 0px)")
                    .call(wrap, svg.select(".racebar rect").node().getBBox().width);
            }

        });;
    // Animation
    svg.selectAll(".racebar rect")
        .data(racedata)
        .transition()
        .duration(800).delay(500)
        .attr("y", function(d) { return y(d.employment); })
        .attr("height", function(d) { return height - y(d.employment); })

    svg.selectAll(".racebar text")
        .data(racedata)
        .transition()
        .duration(800).delay(500)
        .attr("opacity", 1)
        .attr("y", function(d) { return y(d.employment) - 5; })
        .text(function(d) { return formatPercent(d.employment) })

    //  svg.selectAll(".x-axis .tick text")
    //  .transition()
    //  .duration(800)
    // .style("font-size", "10px")
    // .call(wrap, 2);
}

function wrap(text, width) {
    text.each(function() {
        var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.2, // ems
            y = text.attr("y"),
            dy = parseFloat(text.attr("dy")),
            tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width && line.length > 1) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
            }
        }
    });
}