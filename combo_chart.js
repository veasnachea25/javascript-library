'use strict';

function drawComboChart(config, data) {
	
    var me        = config.thisVis;
    var domNode   = config.domNode;
    
    //Dimension variables
	var domWidth  = config.width;
	var domHeight = config.height;
    var minEdge = Math.min(domWidth,domHeight);
    var margin    = config.margin;
	var	width  = domWidth - margin.left - margin.right;
	var height = domHeight - margin.top - margin.bottom;
	var padding   = config.padding || 0.5;

    //JSON key variables
    var attributes= config.attributes;
    var metrics   = config.metrics;
    var originalAttributes = config.originalAttributes;
    var originalMetrics  = config.originalMetrics;
    var totalAttributes = attributes.length;
    var totalMetrics = metrics.length;
	var bmi = config.barMetricIndex;

    //Font variables
    var fontName         = config.font ? config.font.family        : "Arial";
    //general text
    var fontColor_text   = config.font ? config.font.color.text    : 'black';
    var fontSize_text    = config.font ? config.font.size.text     : 12;
    var fontStyle_text   = config.font ? config.font.style.text    : 'normal';
    var fontWight_text   = config.font ? config.font.weight.text   : 'normal';
    //tooltip font
    var fontColor_tooltip= config.font ? config.font.color.tooltip : 'black';
    var fontSize_tooltip = config.font ? config.font.size.tooltip  : 12;
    var fontStyle_tooltip= config.font ? config.font.style.tooltip : 'normal';
    var fontWight_tooltip= config.font ? config.font.weight.tooltip: 'normal';
    //legend font
    var fontColor_legend = config.font ? config.font.color.legend  : 'black';
    var fontSize_legend  = config.font ? config.font.size.legend   : 12;
    var fontStyle_legend = config.font ? config.font.style.legend  : 'normal';
    var fontWight_legend = config.font ? config.font.weight.legend : 'normal';

    var numberFormat = config.numberFormat;
    var dateFormat = config.dateFormat;

    var colors    = config.colors ? config.colors : d3.schemeCategory20c;
    var selectedFillColor = config.selectedFillColor;

	//Tooltip variables
	var tooltip_bgcolor  = config.tooltips ? config.tooltips.bgcolor      : colors_array[6];
	var tooltip_stroke   = config.tooltips ? config.tooltips.stroke       : colors_array[7];
	var tooltip_radius   = config.tooltips ? config.tooltips.radius       : 0;
	var tooltip_position = config.tooltips ? config.tooltips.position     : 0;
	var tooltip_delay    = config.tooltips ? config.tooltips.delay        : 0;
	
	
	//Detect whether the device is a PC or an iPad
	var testExp = new RegExp('Android|webOS|iPhone|iPad|' + 'BlackBerry|Windows Phone|'  +   'Opera Mini|IEMobile|Mobile' ,  'i');
	var ismobile = testExp.test(navigator.userAgent); //true or false
	var isIE = /*@cc_on!@*/false || !!document.documentMode;


    d3.select(domNode).selectAll('svg').remove();
        
	var	svg = d3.select(domNode).append('svg');
	if (config.responsive){
		svg.attr("preserveAspectRatio", "xMidYMid")
			.attr("viewBox", "0 0 " + domWidth + " " + domHeight);
	} else {
		svg.attr('width',domWidth)
			.attr('height',domHeight);
	}
    
    //Apply font name as global
    svg.attr('font-family',fontName);

	//Background rectangle
	svg.append("rect")
        .attr("id","background")
        .attr("x",1)
        .attr("y",1)
        .attr("width", domWidth)
        .attr("height",domHeight)
        .style("fill","white")
        .style("opacity",0)
        .on("click", function (){ 
            //set original color
            svg.select('.selected')
                .style('fill', colors[bmi])
                .classed('selected',false);
            
            //clear filter
            clearFilter();
		});
		
		
	var gFeature = svg.append("g").attr("id","feature").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    var gLegends = svg.append("g").attr("id","legend");
    var gTooltip = svg.append('g').attr('class', 'tooltip').attr("visibility","hidden").attr('pointer-events', 'none');
	
	
	//preparing scales -----------------------------------------------------------
	var xScale = d3.scaleBand()
				.domain(data.map(function(d) { return d[attributes[0]];} ))
				.range([0, width])
    			.padding(padding)
				//.align(0.1)
				;

    var ChartData = data.map(function(datum){
        var row = {};
        Object.keys(datum).forEach(function(key){
            row[key] = datum[key];
        });
        row['MstrData'] = datum;
        return row;
    });

	var yScales = metrics.map(function(metr){ 
        var yDomain = d3.extent(ChartData, function(d) { return d[metr];});
        var yRange = [height, 0];
        if      (yDomain[0]<0 && yDomain[1]<0){ yDomain[1] = 0; } //both negative
        else if (yDomain[0]>0 && yDomain[1]>0){ yDomain[0] = 0; } //both positive

		return d3.scaleLinear()
				.domain(yDomain)
				.range(yRange);
	});

    
	//Generate axes -------------------------------------------------------------
	//x-axis: 
	gFeature.append("g")
		.attr("class", "axis x-axis")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(xScale))
        .attr('font-family',fontName)
        .attr('font-size',fontSize_text)
        ;
    
    if(bmi<totalMetrics){
        gFeature.append('g')
            .attr('class','serie')
            .selectAll(".bar")
            .data(ChartData)
            .enter().append("rect")
            .attr("class", "bar")
            .attr("x", function(d) { return xScale(d[attributes[0]]); })
            .attr("y", height)
            .attr("width", xScale.bandwidth())
            .attr("height", 0)
            .style('fill', colors[bmi])
            .on("mouseover", ismobile ? null : showTooltip) // on PC
            .on("mousemove", ismobile ? null : moveTooltip) // on PC
            .on("mouseout" , ismobile ? null : hideTooltip) // on PC
            .on("touchstart",ismobile ? showTooltip : null) // on iPad
            .on("touchmove", ismobile ? moveTooltip : null) // on iPad
            .on("touchend" , ismobile ? hideTooltip : null) // on iPad
            .on("click", clickEvent)
            .transition()
            .attr("y", function(d){ var dy = d[metrics[bmi]]; return dy >= 0 ? yScales[bmi](dy) : yScales[bmi](0); })
            .attr("height", function(d) { return Math.abs(yScales[bmi](0) - yScales[bmi](d[metrics[bmi]])); })
            .delay(function(d,i){ return i*800/data.length; })//ChartData.length
            .duration(1000)
            // .ease(d3.easeBack)
            ;	
    }

	//append line
	metrics.forEach(function(metr,mi){ if(mi!==bmi){
		var line = d3.line()
                 .x(function(d) { return xScale(d[attributes[0]]) + xScale.bandwidth()/2; })
				 .y(function(d) { return yScales[mi](d[metrics[mi]]); })
				 .curve(d3.curveLinear);//curveLinear, curveCardinal

		gFeature.append("g")
			.attr("class", "line")
			.append('path')
			.attr('d', line(data))
			.style('fill', 'none')
			.style('stroke-width', config.strokes[mi])
			.style("stroke", colors[mi])
			.style("stroke-dasharray", config.dashArray[mi])
			;
	}});
		
	
	//Generate legend -------------------------------------------------
	if (config.legend && config.legend.show === true){ 
		var legendTexts = originalMetrics;
		
		
		gLegends.attr('class','legend')
			.attr("text-anchor", "start")
            .attr("transform", "translate("+ [0, domHeight - margin.bottom/2] + ")" );
            
        var legend = gLegends.selectAll("g")
			.data(legendTexts)
			.enter().append("g")
			.attr("transform", function(d, i) { return "translate("+ [(i+1)*width/(legendTexts.length+1), 0] + ")"; });

		legend.append("rect")
			.attr("x", 0)
			.attr("y" , function(d,i) { return i==bmi ? 0 : 6; })
			.attr("width", 15)
			.attr("height" , function(d,i) { return i==bmi ? 15 : 2; })
			.attr("fill", function(d,i) { return colors[i]; });

		legend.append("text")
			.attr("x", 0 + 15 + 2)
			.attr("y", 0 + 9)
			.attr("dy", "0.32em")
			.text(function(d) { return d; });
	}
	


    //Display tooltips ------------------------------------------------
    function showTooltip(d) {  
		d3.select(this).moveToFront();
		
        if (d.MstrData) { 
            var ArrayText = [];
            var ai = 0;//totalAttributes - 1;
            ArrayText.push([originalAttributes[ai], ": "+d[attributes[ai]]]);
            for (var i=0; i<metrics.length; i++) {
                ArrayText.push(
                    [originalMetrics[i], ": "+numeral(d[metrics[i]]).format(numberFormat[i])]
                );
            }
            generateTooltip(ArrayText);
        }
    }

    function generateTooltip(ArrayText) { 
        
        var pad = fontSize_tooltip * 0.5;
        var gap = fontSize_tooltip * 1.5;

        gTooltip.selectAll('*').remove();
        gTooltip.transition()
            .delay(0)
            .attr("visibility","visible");
            
        var tiprect = gTooltip.append('rect');
        var tiptext = gTooltip.selectAll('text')
            .data(ArrayText)
            .enter().append('text')
            .attr('y', function(d,i) { return i*gap + pad; })
            .attr('dy','0.8em')
            .style('font-size', fontSize_tooltip+'px')
            .style('font-style',fontStyle_tooltip)
            .style('fill',fontColor_tooltip);

        //append first tspan
        var tspans = tiptext
            .append('tspan')
            .text(function(d){ return d[0]; })
            .attr('x', pad)
            .style('font-weight', 'bold');//fontWight_tooltip);

        //calculate position for second tspan then append to text
        var px_ts2 = pad;
        tspans.each(function(){ px_ts2 = Math.max(px_ts2,this.getBoundingClientRect().width); });
        tiptext.append('tspan')
            .text(function(d){ return d[1]; })
            .attr('x', px_ts2 + pad);

        //apply dimension to tooltip background rectangle
        var dim = gTooltip.node().getBoundingClientRect();
        tiprect.attr('rx',tooltip_radius)
            .attr('ry',tooltip_radius)
            .attr('width',dim.width + pad*2)
            .attr('height',dim.height + pad*2)
            .style('stroke', tooltip_stroke)
            .style('stroke-width', '1px')
            .style('fill', tooltip_bgcolor);

        //Initial position
        moveTooltip();
    }

    function moveTooltip() {
        var mouse = d3.mouse(svg.node()); //d3.event
        var dim = gTooltip.node().getBoundingClientRect();
        var x = mouse[0] - dim.width * 0.5 * (1 - tooltip_position);
        var y = mouse[1] - dim.height - 10;
        if (x<0){ x = 0;}
        if (x>domWidth-dim.width){ x = domWidth-dim.width;}
        if (y<0){ y += dim.height+20;}
        gTooltip.attr('transform', 'translate('+[x, y]+')' );
    }

    function hideTooltip() {
        svg.select('.selected').moveToFront();
        gTooltip.transition()
            .delay(Math.round(tooltip_delay*1000))
            .attr("visibility","hidden");
    }

    var previousIndex;
    var hasSelected = false;

    function clickEvent(d,i) { 
        if (d.MstrData){
            //filter event
            if(i == previousIndex){ //select on self
                if(hasSelected){ //already selected
                    //set original color
                    svg.select('.selected')
                        .style('fill', colors[bmi])
                        .classed('selected',false);
            
                    //clear filter
                    clearFilter();
                    hasSelected = false;
                } else { //not yet selected
                    //set original color
                    svg.select('.selected')
                        .style('fill', colors[bmi])
                        .classed('selected',false);
                    
                    //apply new selected color
                    d3.select(this)
                        .classed('selected',true)
                        .style('fill',selectedFillColor)
                        ;
            
                    if(isIE){ d3.select(this).moveToFront(); }
            
                    //Apply Filter
                    applyFilter(d);
                    hasSelected = true;
                }
            } else { //select on other
                //set original color
                svg.select('.selected')
                    .style('fill', colors[bmi])
                    .classed('selected',false);
                
                //apply new selected color
                d3.select(this)
                    .classed('selected',true)
                    .style('fill',selectedFillColor)
                    ;
            
                if(isIE){ d3.select(this).moveToFront(); }
        
                //Apply Filter
                applyFilter(d);
                previousIndex = i;
                hasSelected = true;
            }

        }
    }
    
    function clearFilter() { 
        if(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.selectionDataJSONString) { //for mobile
            var selection = {};
            selection.messageType = "deselection";
            window.webkit.messageHandlers.selectionDataJSONString.postMessage(selection);
        } else {
            me.clearSelections();
            me.endSelections();
        }
    }
    
    function applyFilter(d) { 
        var selection = d.MstrData.attributeSelector[totalAttributes-1];
        if(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.selectionDataJSONString) { //for mobile
            selection.messageType = "selection";
            window.webkit.messageHandlers.selectionDataJSONString.postMessage(selection);
        } else {
            me.applySelection(selection); //for web
        }
    }

}


function wrap(text, width) {
	text.each(function() {
        var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.1, // ems
            y = text.attr("y"),
            dy = parseFloat(text.attr("dy")),
            tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
            }
        }
	});
}


  
d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
        this.parentNode.appendChild(this);
    });
};
  
