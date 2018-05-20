

/////////////////////////////////////////////
///////  GLOBAL VARIABLES //////////////////
////////////////////////////////////////////

var current_selected_person; // not used currently
//map: names(concat) of two people => realtionship description
//unique people pair: only store once for pp1+pp2 / pp2+pp1
var relation_map = new Map();
// // map: name of character =>
var character_info;
let character_image;
var character_info;

var currentPeopleSpell=[];
var wordcloud;

var margin = {top: 20, right: 20, bottom: 40, left: 80},
width = 1400 - margin.left - margin.right,
height = 600 - margin.top - margin.bottom;

var spells_data;
var spell_sum_data;
var mapped_spell_data;
var wordsData;
var color;

d3.queue()
.defer(d3.csv, "/dataSet/relation.csv")
.defer(d3.csv, "/dataSet/characters.csv")
.await(function(error, relation_data, character_data) {
  if (error) {
    console.error(error);
  }
  else {
    // 1. store data for characters
    character_info = character_data;

    // 2. process data for relationship
    // the raw data is one-one direction, here it is doubled
    var double_direction_relation = [];
    // hash map that stores: [people1+people2, relationship]

    for (var i = 0; i < relation_data.length; i++){
      relation_map.set(relation_data[i].people1 + relation_data[i].people2,relation_data[i].relationship);

      var org_relation = {
        "people1": relation_data[i].people1,
        "people2": relation_data[i].people2,
        "relation": relation_data[i].relationship
      };
      double_direction_relation.push(org_relation);
      var reverse_relation = {
        "people1": relation_data[i].people2,
        "people2": relation_data[i].people1,
        "relation": relation_data[i].relationship
      };

      double_direction_relation.push(reverse_relation);
    }
    //console.log(relation_map);
    var mpr = chordMpr(double_direction_relation);

    mpr.addValuesToMap('people1')
    .setFilter(function (row, a, b) {
      return (row.people1 === a.name && row.people2 === b.name)
    })
    .setAccessor(function (recs, a, b) {
      if (!recs[0]) return 0;
      return 1;
    });

    drawChords(mpr.getMatrix(), mpr.getMap());
  }
});

/////////////////////////////////////////////
///////  DRAW THE CHORD DIAGRAM /////////////
////////////////////////////////////////////

function drawChords (matrix, mmap) {

  var w = 800, h = 800, r1 = 250, r0 = r1 - 80;

  // var fill = d3.scale.category20b();
  var fill = d3.scale.ordinal().range(["#2B4162", "#FA9F42", "#721817", "#E0E0E2", "#AE0001", "#EEBA30", "#0E1A40", "#5D5D5D", "#946B2D", "#222F5B","#F0C75E", "#726255", "#372E29", "#586B60", "#0D2818", "#93A8AC", "#274037", "#C2D1CD", "#554E3F", "#9E6C54", "#EA8C69", "#9C1320"]);

  var chord = d3.layout.chord()
  .padding(0.02)
  .sortSubgroups(d3.descending)
  .sortChords(d3.descending);

  var arc = d3.svg.arc()
  .innerRadius(r0)
  .outerRadius(r0 + 20);

  var svg = d3.select("#firstSection").append("svg")
  .attr("id","svg1")
  .attr("width", w)
  .attr("height", h)
  .attr("class","inline")
  .append("svg:g")
  .attr("id", "circle")
  .attr("transform", "translate(" + 410 + "," + h / 2 + ")");

  var defs = svg.append("defs");

  //Filter for the outside glow
  var filter = defs.append("filter")
  .attr("id","glow");
  filter.append("feGaussianBlur")
  .attr("stdDeviation","4")
  .attr("result","coloredBlur");
  var feMerge = filter.append("feMerge");
  feMerge.append("feMergeNode")
  .attr("in","coloredBlur");
  feMerge.append("feMergeNode")
  .attr("in","SourceGraphic");

  svg.append("circle")
  .attr("r", r0 + 20);

  var rdr = chordRdr(matrix, mmap);
  chord.matrix(matrix);
  // console.log(matrix);
  // console.log(mmap);
  var g = svg.selectAll("g.group")
  .data(chord.groups())
  .enter().append("svg:g")
  .attr("class", "group")
  .on("mouseover", mouseover)
  .on("mouseout", function (d){
    d3.select("#tooltip").style("visibility", "hidden")
    wordcloud.selectAll("text")
    .data(wordsData)
    .attr('class','word')
    .style("font-size", function(d) {  return d.size + "px"; })
    .style("fill", function(d) {
      var paringObject = mapped_spell_data.filter(function(obj) { return obj.password === d.text});
      return color(paringObject[0].category);
    })
    .style("opacity", function(d) {
      return 1;
    }

  )
  .attr("text-anchor", "middle")
  .attr("transform", function(d) { return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")"; })
  .text(function(d) { return d.text; });
});


g.append("svg:path")
.style("stroke", "none")
.style("fill", function(d) { return fill(d.index); })
.style("filter", "url(#glow)")
.attr("d", arc)
.on("mouseover",function(d){selectPerson(d)});



var names = g.append("svg:text")
.each(function(d) { d.angle = (d.startAngle + d.endAngle) / 2; })
.attr("dy", ".35em")
.attr("text-anchor", function(d) { return d.angle > Math.PI ? "end" : null; })
.attr("transform", function(d) {
  return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")"
  + "translate(" + (r0 + 26) + ")"
  + (d.angle > Math.PI ? "rotate(180)" : "");
})
.text(function(d) {
  return rdr(d).gname;
})
.style("fill","#554E3F")
.on("mouseover",  function (d){
  // g.append("svg.text")

  d3.select(this).style("cursor", "pointer");
  selectPerson(d);
  d3.select(this)
  // .style("filter", "url(#glow)")
  .style("font-size",18);
})
.on("mouseout", function(d){
  handleMouseOut();
  displayHintMsg(); // clear svg2 and display placeholder msg
  d3.select(this).style("filter", "none")
  .style("font-size",14);
});

function handleMouseOut(){
  current_selected_person = null;
  //console.log(current_selected_person);
}

function selectPerson(d){
  current_selected_person = rdr(d).gname;
  //console.log(current_selected_person);
  // console.log(d);
  d3.csv("/dataSet/people_spell.csv",function(error,data) {
    data.forEach(function(row){
      if(row.name == current_selected_person){
        for(var i=1;i<=3;i++){
          if(row["charms"+i]!=""){
            currentPeopleSpell.push(row["charms"+i].toLowerCase());
          }
        }
      }
    });
    wordcloud.selectAll("text")
    .data(wordsData)
    // .enter().append("text")
    .attr('class','word')
    .style("font-size", function(d) { return d.size + "px"; })
    .style("fill", function(d) {

      var paringObject = mapped_spell_data.filter(function(obj) { return obj.password === d.text});
      return color(paringObject[0].category);

    }

  )
  .style("opacity", function(d) {
    if(currentPeopleSpell.includes(d.password)){
      return 1;
    }
    else{
      return 0.3;
    }
  }

)
.attr("text-anchor", "middle")
.attr("transform", function(d) { return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")"; })
.text(function(d) { return d.text; });

currentPeopleSpell=[];

});
}
var chordPaths = svg.selectAll("path.chord")
.data(chord.chords())
.enter().append("svg:path")
.attr("class", "chord")
.style("stroke", function(d) { return d3.rgb(fill(d.target.index)).darker(); })
.style("fill", function(d) { return fill(d.target.index); })
.attr("d", d3.svg.chord().radius(r0))
.on("mouseover", function (d) {
  d3.select("#tooltip")
  .style("visibility", "visible")
  .html(chordTip(rdr(d)))
  .style("top", function () { return (d3.event.pageY - 100)+"px"})
  .style("left", function () { return (d3.event.pageX - 100)+"px";})
})
.on("mouseout", function (d) {
  clearSvg2();
});

function chordTip (d) {
  return d.sname + " and " + d.tname+ ": </br>" + getRelation(d)
}

// function groupTip (d) {
//   console.log(d.gname);
//     return d.gname;
//   }

function getRelation(d){
  var str1 = d.tname + d.sname ;
  if (relation_map.has(str1)) {
    return relation_map.get(str1);
  }
  else{
    return relation_map.get( d.sname+d.tname);
  }
}

function mouseover(d, i) {
  // // adding tooltip to each name: useless
  // d3.select("#tooltip")
  //   .style("visibility", "visible")
  //   .html(groupTip(rdr(d)))
  //   .style("top", function () { return (d3.event.pageY - 80)+"px"})
  //   .style("left", function () { return (d3.event.pageX - 130)+"px";})
  //console.log(rdr(d));
  chordPaths.classed("fade", function(p) {
    return p.source.index != i
    && p.target.index != i;
  });
  displayPersonProfile(rdr(d).gname);
}

/////////////////////////////////////////////
///////  THINGS TO DO WITH SVG2 /////////////
////////////////////////////////////////////

// init svg2
var svg2 = d3.select("#peopleDes").append("svg")
.attr("id","svg2")
.attr("width", 400).attr("height", 300)
.attr("class","inline");
//display msg to ask for interaction
displayHintMsg();

function displayPersonProfile(name){
  // 1. preparation of data
  // map the real name of attributes
  var character_attributes_map = new Map([
    ["blood_status", "Blood Status"],
    ["born", "Date of Birth"],
    ["died", "Date of Death"],
    ["house","House"],
    ["marital_status","Marital Status"]
  ]);
  // clear svg2 before displaying new stuff
  clearSvg2();
  // get information of the selected person
  var selected_person_data = character_info.filter(
    function(d) {
      return ( d.name == name);
    });
    selected_person_data = selected_person_data[0];

    var character_image_url = `img/${name}.png`;
    // console.log(character_image_url);
    // 2. display information of the person
    //console.log(selected_person_data[name]);

    // display name with large font and glow effects
    svg2.append('svg2:image')
    .attr("xlink:href",character_image_url)
    .attr('x',-20)
    .attr('y',0)
    .attr('width',100)
    .attr("transform", "translate(50,100)");


    svg2.append("text")
    .text(name)
    .attr("x",-50)
    .attr("y",100)
    .attr("transform", "translate(200,0)")
    .style("fill","black").style("font-size",20)
    .style("font-weight",900);

    var count = 0; // for y of text
    for (var key in selected_person_data) {
      // not displaying attributes: not null, except "name"
      if (key != "name" && selected_person_data[key] != ""){
        svg2.append("text")
        .text(character_attributes_map.get(key) + ": " + selected_person_data[key])
        .attr("x",-50)
        .attr("y",130 + 25 * count)
        .attr("transform", "translate(200,0)")
        .style("fill","black");
        count++;
      }
    }
  }

  // remind the user to hover on names to interact
  function displayHintMsg(){
    clearSvg2();
    svg2.append("text")
    .text("please hover on any name")
    .attr("x",-40)
    .attr("y",50)
    .attr("transform", "translate(150,50)")
    .style("fill","black");
  }

  // clear everything in svg2
  function clearSvg2(){
    svg2.selectAll("*").remove();
  }


  /////////////////////////////////////////////
  ///////  THINGS TO DO WITH SVG3 /////////////
  ////////////////////////////////////////////

  // init svg3
  // var svg3 = d3.select("#diagram").append("svg")
  //     .attr("width", 1000).attr("height", 1000);

}
// var parseSpellSumData = function(row){
//   row.count = Number(row.count);
//   return row;
// }
// var parseSpellsData = function(row){
//   var rawRow = row.Incantation;
//   rawRow = rawRow.toLowerCase();
//   row.Incantation = rawRow.replace(' ','');
//   return row;
// }
var parseSpellSumData = function(row){
  row.count = Number(row.count);
  return row;
}
var parseSpellsData = function(row){
  var rawRow = row.Incantation;
  rawRow = rawRow.toLowerCase();
  row.Incantation = rawRow.replace(' ','');
  return row;
}
d3.csv("/dataSet/spells.csv",parseSpellsData,function(error,data) {
  spells_data = data;

});

d3.csv("/dataSet/spell_sum.csv",parseSpellSumData,function(error,data) {
  spell_sum_data = data;
  mapped_spell_data = spell_sum_data.map(function(row){
    var result = {password:row.Spell};
    result.category = "Spell";
    spells_data.forEach(function(d){
      if(d.Incantation == row.Spell){
        result.category = d.Type;
      }
    });
    result.count = row.count;
    return result;
  })
  var countExtent = d3.extent(mapped_spell_data,function(d){

    return d.count;
  })
  var categories = d3.keys(d3.nest().key(function(d) { return d.category; }).map(mapped_spell_data));
  color = d3.scale.ordinal().range(["#66c2a5","#fc8d62","#8da0cb"]);
  var fontSize = d3.scale.linear().domain(countExtent).range([20,120]);

  var layout = d3.layout.cloud()
  .timeInterval(1)
  .size([1400, 600])
  .words(mapped_spell_data)
  .rotate(function(d) { return 0; })
  .font('monospace')
  .fontSize(function(d,i) { return fontSize(d.count); })
  .text(function(d) { return d.password; })
  .spiral("archimedean")
  .on("end", draw)
  .start();

  var svg = d3.select('#diagram').append("svg")
  .attr("id","svg3")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  wordcloud = svg.append("g")
  .attr('class','wordcloud')
  .attr("transform", "translate(" + width/2 + "," + height/2 + ")");

  var x0 = d3.scale.ordinal()
  .rangeRoundBands([0, width], .1)
  .domain(categories);

  var xAxis = d3.svg.axis()
  .scale(x0)
  .orient("bottom");

  svg.append("g")
  .attr('id','spellBottom')
  .attr("class", "xAxis")
  .attr("transform", "translate(0," + height + ")")
  .call(xAxis)
  .selectAll('text')
  .style('font-size','40px')
  .style('fill',function(d) { return color(d); })
  .style('font','sans-serif');
  function draw(words) {
    console.log(words);
    wordsData = words;
    wordcloud.selectAll("text")
    .data(words)
    .enter().append("text")
    .attr('class','word')
    .style("font-size", function(d) { return d.size + "px"; })
    .style("font-family", function(d) { return d.font; })
    .style("fill", function(d) {
      var paringObject = mapped_spell_data.filter(function(obj) { return obj.password === d.text});
      return color(paringObject[0].category);
    })
    .attr("text-anchor", "middle")
    .attr("transform", function(d) { return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")"; })
    .text(function(d) { return d.text; });
  };

});
  //////////////////////////////////////////////////
  ////////// functions for the dropdown menu///////
  ////////////////////////////////////////////////

function DropDown(el) {
  this.dd = el;
  this.placeholder = this.dd.children('span');
  this.opts = this.dd.find('ul.dropdown > li');
  this.val = '';
  this.index = -1;
  this.initEvents();
}

DropDown.prototype = {
  initEvents : function() {
    var obj = this;

    obj.dd.on('click', function(event){
      $(this).toggleClass('active');
      return false;
    });

    obj.opts.on('click',function(){
      var opt = $(this);
      obj.val = opt.text();
      obj.index = opt.index();
      obj.placeholder.text(obj.val);
    });
  },
  getValue : function() {
    return this.placeholder.text();
  },
  getIndex : function() {
    return this.index;
  }
}

let c1,c2;

$(function() {
  let dd = new DropDown( $('#d1') );

  $(document).click(function() {
    // all dropdowns
    $('.wrapper-dropdown-3').removeClass('active');
    c1 = dd.getValue();
  });
});

$(function() {
  let dd = new DropDown( $('#d2') );

  $(document).click(function() {
    // all dropdowns
    $('.wrapper-dropdown-4').removeClass('active');
    c2 = dd.getValue();
  });
});

function plotdata() {
  //////////////////////////////////////////////////
  //////////// read in and parse the data//////////
  ////////////////////////////////////////////////

  var parseDate  =   d3.time.format('%Y-%m').parse;
  // dealing with  <1 NaN issue
  function parseTrendValue(value){
    if(isNaN(value)) return 1;
    else return value;
  }

  // read in the trend data for the selected two ppl
  d3.csv('/dataSet/trend.csv', function (error, rawData) {
    if (error) {
      console.error(error);
      return;
    }
    var data = rawData.map(function (d) {
      return {
        date:  parseDate(d.Month),// it is actually Year-Month, misnamed in csv
        p1_trend: parseTrendValue(d[c1]), // popularity values
        p2_trend: parseTrendValue(d[c2])
      };
    });

    // get markers_data
    d3.json('/dataSet/markers.json', function (error, markerData) {
      if (error) {
        console.error(error);
        return;
      }

      var markers = markerData.map(function (marker) {
        return {
          date: parseDate(marker.date), // by Year-Month
          type: marker.type, // Book / Movie
          version: marker.version // HP 1-7
        };
      });

      // delete the whole svg and plot again
      d3.select("#trend_plot_svg").remove();
      // in this function we make new svg
      makeChart(data, markers);
    });
  });
}


function addAxesAndLegend (svg, xAxis, yAxis, margin, chartWidth, chartHeight) {
var legendWidth  = 200,
    legendHeight = 100;

// clipping to make sure nothing appears behind legend
svg.append('clipPath')
  .attr('id', 'axes-clip')
  .append('polygon')
    .attr('points', (-margin.left)                 + ',' + (-margin.top)                 + ' ' +
                    (chartWidth - legendWidth - 1) + ',' + (-margin.top)                 + ' ' +
                    (chartWidth - legendWidth - 1) + ',' + legendHeight                  + ' ' +
                    (chartWidth + margin.right)    + ',' + legendHeight                  + ' ' +
                    (chartWidth + margin.right)    + ',' + (chartHeight + margin.bottom) + ' ' +
                    (-margin.left)                 + ',' + (chartHeight + margin.bottom));

var axes = svg.append('g')
  .attr('clip-path', 'url(#axes-clip)');

axes.append('g')
  .attr('class', 'x axis')
  .attr('transform', 'translate(0,' + chartHeight + ')')
  .call(xAxis);

axes.append('g')
  .attr('class', 'y axis')
  .call(yAxis)
  .append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', 6)
    .attr('dy', '.71em')
    .style('text-anchor', 'end')
    .style('font-size',20)
    .style('fill', 'black')
    .text('Interest');

// draw the marker legend on the top-right
var legend = svg.append('g')
  .attr('class', 'legend')
  .attr('transform', 'translate(' + (chartWidth - legendWidth) + ', 0)');


// legend for the markers

  legend.append('circle')
    .attr("class", "legend-news")
    .attr('r',  10)
    .attr('cx',20).attr('cy',50);

  legend.append('text')
    .attr('x', 50)
    .attr('y', 50)
    .attr("class", "legend-news")
    .text('news');


legend.append('circle')
  .attr("class", "legend-book")
  .attr('r',  10)
  .attr('cx',20).attr('cy',80);

legend.append('text')
  .attr('x', 50)
  .attr('y', 80)
  .attr('class', 'legend-book')
  .text('book');

legend.append('circle')
  .attr('class', 'legend-movie')
  .attr('r',  10)
  .attr('cx',20).attr('cy',110);

legend.append('text')
  .attr('x', 50)
  .attr('y', 110)
  .attr('class', 'legend-movie')
  .text('movie');

}

// draw the lines and areas for two ppl
function drawPaths (svg, data, x, y) {
// interpolate data for plotting: lines and areas
var medianLine = d3.svg.line()
  .interpolate('monotone')
  .x(function (d) { return x(d.date); })
  .y(function (d) { return y(d.p1_trend); });

var medianLine_2 = d3.svg.line()
  .interpolate('monotone')
  .x(function (d) { return x(d.date); })
  .y(function (d) { return y(d.p2_trend); });

var area1 = d3.svg.area()
  .interpolate('monotone')
  .x (function (d) { return x(d.date) || 1; })
  .y0(function (d) { return y(d.p1_trend); })
  .y1(function (d) { return y(0)});

var area2 = d3.svg.area()
  .interpolate('monotone')
  .x (function (d) { return x(d.date) || 1; })
  .y0(function (d) { return y(d.p2_trend); })
  .y1(function (d) { return y(0)});

svg.datum(data);

// actual plotting
// append the two lines for two ppl
svg.append('path')
  .attr('class', 'median-line color1')
  .attr('d', medianLine)
  .attr('clip-path', 'url(#rect-clip)');

svg.append('path')
  .attr('class', 'median-line color2')
  .attr('d', medianLine_2)
  .attr('clip-path', 'url(#rect-clip)');

// fill the area under two lines for two ppl
svg.append('path')
  .attr('class', 'area color1')
  .attr('d', area1)
  .attr('clip-path', 'url(#rect-clip)');

svg.append('path')
  .attr('class', 'area color2')
  .attr('d', area2)
  .attr('clip-path', 'url(#rect-clip)');
}


function addMarker (marker, svg, chartHeight, x) {
   var date  = new Date(marker.date);


var radius = 7,radius_large = 10,
    xPos = x(marker.date) - radius - 3,
    yPosStart = ((marker.type === 'Book' && date.getMonth() == 6 && date.getFullYear() == 2007)? chartHeight - 4*radius : chartHeight - radius), // sit on the x axis
    yPosEnd = ((marker.type === 'Book' && date.getMonth() == 6 && date.getFullYear() == 2007) ? chartHeight - 4*radius : chartHeight - radius);


// assign class(book/movie) to
var markerG = svg.append('g')
  .attr('class', 'marker '+marker.type.toLowerCase())
  .attr('transform', 'translate(' + xPos + ', ' + yPosStart + ')')
  .attr('opacity', 0);


markerG.transition()
  .duration(300)
  .attr('opacity', 0.7);

// for convertint number to short of Month name
//https://stackoverflow.com/questions/1643320/get-month-name-from-date
Date.prototype.monthNames = [
  "January", "February", "March",
  "April", "May", "June",
  "July", "August", "September",
  "October", "November", "December"
];

Date.prototype.getMonthName = function() {
  return this.monthNames[this.getMonth()];
};
Date.prototype.getShortMonthName = function () {
  return this.getMonthName().substr(0, 3);
};

markerG.append('circle')
  .attr('class', 'marker-bg')
  .attr('cx', radius)
  .attr('cy', radius)
  .attr('r', radius)
  .on("mouseover",
    function(){
           d3.select(this).style("opacity", 1).style("r",radius_large);

           // print its time
             svg.append("text").attr("class","marker_hover_text")
             .attr("x",100).attr("y",50)
             .style("fill","#554E3F")

             .text(function() {
               //console.log(marker.date);
               var date  = new Date(marker.date);
               var month = date.getShortMonthName(); //returns 0 - 11
               var year = date.getFullYear();
               return month + "," + year})
               .style("filter", "url(#glow)");

      // print its type + name
        svg.append("text").attr("class","marker_hover_text")
        .attr("x",100).attr("y",100)
        .style("fill",function(){
          if (marker.type == "News") return "#F0C75E";
          return marker.type == "Book" ? "#2B4162" : "#946B2D";
        })
        .text(function() {
          return  marker.type + ": " + marker.version; })
          // .style("filter", "url(#glow)");
    })
    .on("mouseout",  function () {
        // turn the marker bigger
          d3.select(this).style("opacity", 0.7).style("r",radius);
          // d3.selectAll(".marker_hover_text").remove();
          d3.selectAll(".marker_hover_text").remove();

      });
}


// transition animation for everything
function startTransitions (svg, chartWidth, chartHeight, rectClip, markers, x) {
rectClip.transition()
  .duration(300*markers.length)
  .attr('width', chartWidth);

markers.forEach(function (marker, i) {
  setTimeout(function () {
    addMarker(marker, svg, chartHeight, x);
  }, 300 + 100*i);
});
}


function makeChart (data, markers) {
var svgWidth  = 960,
    svgHeight = 500,
    margin = { top: 20, right: 20, bottom: 40, left: 40 },
    chartWidth  = svgWidth  - margin.left - margin.right,
    chartHeight = svgHeight - margin.top  - margin.bottom;

var x = d3.time.scale().range([0, chartWidth])
          .domain(d3.extent(data, function (d) { return d.date; })),
    y = d3.scale.linear().range([chartHeight, 0])
          .domain([0, 100]);

var xAxis = d3.svg.axis().scale(x).orient('bottom')
              .innerTickSize(-chartHeight).outerTickSize(0).tickPadding(10),
    yAxis = d3.svg.axis().scale(y).orient('left')
              .innerTickSize(-chartWidth).outerTickSize(0).tickPadding(10);

var svg = d3.select('body').append('svg')
  .attr("id","trend_plot_svg")
  .attr('width',  svgWidth)
  .attr('height', svgHeight)
  .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

// clipping to start chart hidden and slide it in later
var rectClip = svg.append('clipPath')
  .attr('id', 'rect-clip')
  .append('rect')
    .attr('width', 0)
    .attr('height', chartHeight);

addAxesAndLegend(svg, xAxis, yAxis, margin, chartWidth, chartHeight);
drawPaths(svg, data, x, y);
startTransitions(svg, chartWidth, chartHeight, rectClip, markers, x);
}
