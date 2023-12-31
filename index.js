if(localStorage.getItem("token") == null){
	document.getElementById("noSavedToken").hidden = false;
}else{
	document.getElementById("savedToken").hidden = false;
}

function clearData(){
	localStorage.clear();
	document.getElementById("noSavedToken").hidden = false;
	document.getElementById("savedToken").hidden = true;
}

let width = null;
let height = null;
let links = null;
let nodes = null;
let simulation = null;
let svg = null;
let link = null;
let node = null;
let zoom = null;
let token = null;

const reqDelay = 3388;
let reqInterval = null;
let linked = 0;

let zoomOffsetX = 0;
let zoomOffsetY = 0;

let data = {"nodes": [], "links": []};
/*for(let i = 0; i < graph.length; i++){
	data.nodes.push({"id": userIDs[i], "name": userMap[userIDs[i]]});
	for(let j = 0; j < graph[i].length; j++){
		if(graph[i][j] < i) continue;
		data.links.push({"source": userIDs[i], "target": userIDs[graph[i][j]]});
	}
}*/

function makeGraph(){
	if(localStorage.getItem("token") == null){
		token = document.getElementById("token").value;
		localStorage.setItem("token", token);
	}else{
		token = localStorage.getItem("token");
	}
	if(localStorage.getItem("data") != null){
		data = JSON.parse(localStorage.getItem("data"));
	}
	if(localStorage.getItem("linked") != null){
		linked = parseInt(localStorage.getItem("linked"));
	}
	document.getElementById("noSavedToken").hidden = true;
	document.getElementById("savedToken").hidden = true;
	document.getElementById("searchdiv").hidden = false;
	document.getElementById("status").hidden = false;
	document.getElementById("status").innerHTML = "Getting Friends...";
	fetch("https://discord.com/api/v9/users/@me/relationships", {"headers": {"authorization": token}}).then(x => x.json()).then(j => function(){
		for(let i = data.nodes.length; i < j.length; i++){
			let name = j[i].user.username;
			if(j[i].user.global_name != null){
				name += " (" + j[i].user.global_name + ")";
			}
			data.nodes.push({"id": j[i].id, "name": name});
		}
		initSvg();
		render();
		updateToolTip();
		reqInterval = setInterval(function(){
			function getRelationships(id){
				let clinks = [];
				let cidx = 0;
				fetch("https://discord.com/api/v9/users/" + id + "/relationships", {"headers": {"authorization": token}}).then(x => x.json()).then(j => function(){
					for(let i = 0; i < j.length; i++){
						let cid = j[i].id;
						if(parseInt(id) > parseInt(cid)) continue;
						console.log("huh");
						//data.links.push({"source": id, "target": cid});
						clinks.push({"source": id, "target": cid});
					}
					let updInterval = null;
					updInterval = setInterval(function (){
						if(cidx == clinks.length){
							clearInterval(updInterval);
							return;
						}
						console.log("sus");
						data.links.push(clinks[cidx]);
						cidx++;
						render();
					}, reqDelay*1.0 / (clinks.length + 3));
			  	}());
			}
			if(linked < data.nodes.length){
				document.getElementById("status").innerHTML = "Getting Friends for: " + data.nodes[linked].name + " | " + linked.toString() + "/" + data.nodes.length.toString();
				getRelationships(data.nodes[linked].id);
				linked++;
				localStorage.setItem("data", JSON.stringify(data));
				localStorage.setItem("linked", linked.toString());
				//render();
			}else{
				clearInterval(reqInterval);
			}
		}, reqDelay);
	}());
}

function initSvg(){
	width = window.innerWidth;
	height = window.innerHeight;

	// Specify the color scale.
	color = d3.scaleOrdinal(d3.schemeCategory10);

	// The force simulation mutates links and nodes, so create a copy
	// so that re-evaluating this cell produces the same result.
	links = data.links.map(d => ({...d}));
	nodes = data.nodes.map(d => ({...d}));

	// Create a simulation with several forces.
	simulation = d3.forceSimulation(nodes)
	  .force("link", d3.forceLink(links).id(d => d.id))
	  .force("charge", d3.forceManyBody())
	  .force("center", d3.forceCenter(width/10, height/10))
	  .on("tick", ticked);


	// Create the SVG container.
	svg = d3.select("#container").append("svg")
	  .attr("width", width)
	  .attr("height", height)
	  .attr("viewBox", [0, 0, width, height])
	  .attr("style", "max-width: 100%; height: auto;");

	zoom = d3.zoom().on("zoom", function () {
	       node.attr("transform", d3.zoomTransform(this))
	       link.attr("transform", d3.zoomTransform(this))
	    });
	svg.call(zoom);

	  link = svg.append("g")
	  .attr("stroke", "#999")
	  .attr("stroke-opacity", 0.3)
	.selectAll()

	node = svg.append("g")
	  .attr("stroke", "#fff")
	  .attr("stroke-width", 1.5)
	.selectAll().data(nodes)
	.join("circle")
	  .attr("r", 5);;
	node.append("title")
	  .text(d => d.name);
	// Set the position attributes of links and nodes each time the simulation ticks.
	
}

function render(){

	links = data.links.map(d => ({...d}));
      simulation.force("link").links(links);
      simulation.alpha(1).restart().tick();

	// Add a line for each link, and a circle for each node.
	
	link = link.data(links)
	.join("line").attr("stroke-width", 0.5)
	
	// Add a drag behavior.
	node.call(d3.drag()
	    .on("start", dragstarted)
	    .on("drag", dragged)
	    .on("end", dragended));

	node.attr("transform", d3.zoomTransform(svg["_groups"][0][0]))
	link.attr("transform", d3.zoomTransform(svg["_groups"][0][0]))

	// Reheat the simulation when drag starts, and fix the subject position.
	function dragstarted(event) {
	if (!event.active) simulation.alphaTarget(0.3).restart();
	zoomOffsetX = (event.subject.x - event.subject.x / d3.zoomTransform(svg["_groups"][0][0]).k);
	zoomOffsetY = (event.subject.y - event.subject.y / d3.zoomTransform(svg["_groups"][0][0]).k);
	event.subject.fx = event.subject.x / d3.zoomTransform(svg["_groups"][0][0]).k + zoomOffsetX;
	event.subject.fy = event.subject.y / d3.zoomTransform(svg["_groups"][0][0]).k + zoomOffsetY;
	}

	// Update the subject (dragged node) position during drag.
	function dragged(event) {
	event.subject.fx = event.x / d3.zoomTransform(svg["_groups"][0][0]).k + zoomOffsetX;
	event.subject.fy = event.y / d3.zoomTransform(svg["_groups"][0][0]).k + zoomOffsetY;
	}

	// Restore the target alpha so the simulation cools after dragging ends.
	// Unfix the subject position now that it’s no longer being dragged.
	function dragended(event) {
	if (!event.active) simulation.alphaTarget(0);
	event.subject.fx = null;
	event.subject.fy = null;
	}
}

function ticked() {
	link
	    .attr("x1", d => d.source.x)
	    .attr("y1", d => d.source.y)
	    .attr("x2", d => d.target.x)
	    .attr("y2", d => d.target.y);

	node
	    .attr("cx", d => d.x)
	    .attr("cy", d => d.y);
	}

function searchnodes(){
	let username = document.getElementById("search").value;
	const circles = document.querySelectorAll('circle');
	for(let i = 0; i < circles.length; i++){
		let found = false;
		if(username != ""){
			if(circles[i].getAttribute("data-title") == null){
				if(circles[i].childNodes[0].innerHTML.includes(username)){
					found = true;
				}
			}else{
				if(circles[i].getAttribute("data-title").includes(username)){
					found = true;
				}
			}
		}
		if(found){
			circles[i].setAttribute("fill", "red");
		}else{
			circles[i].setAttribute("fill", "black");
		}
	}
}

let clicked = false;
function showTooltip(event) {
  let element = event.target;
  let tooltipElement = document.getElementById('tooltip');
  let title;
  if (!element.dataset.title) {
    let titleElement = element.querySelector('title');
    title = titleElement.innerHTML;
    event.target.setAttribute('data-title', title);
    titleElement.parentNode.removeChild(titleElement);
  } else {
    title = element.dataset.title;
  }
  
  tooltipElement.innerHTML = title;
  tooltipElement.style.display = 'block';
  tooltipElement.style.left = event.pageX + 10 + 'px';
  tooltipElement.style.top = event.pageY + 10 + 'px';
}

function hideTooltip() {
	if(!clicked){
	  var tooltip = document.getElementById('tooltip');
	  tooltip.style.display = 'none';
	}
}

function clickey(){
	clicked = !clicked;
}

function updateToolTip(){
	const tooltipTriggers = document.querySelectorAll('circle');
  Array.from(tooltipTriggers).map(trigger => {
    trigger.addEventListener('mousemove', showTooltip);
    trigger.addEventListener('mouseout', hideTooltip);
    trigger.addEventListener('click', clickey);
  })
}