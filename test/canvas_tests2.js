function test_webgl(test) {
	var canvas = document.createElement('canvas');
	canvas.setAttribute("style", "border-style: solid; border-width: 5px; margin:5px");
	canvas.width = 300;
	canvas.height = 300;
	ctx = canvas.getContext('webgl-2d');
	test(ctx);
	document.body.appendChild(canvas);
}

function test_canvas(test) {
	var canvas = document.createElement('canvas');
	canvas.setAttribute("style", "border-style: solid; border-width: 5px; margin:5px");
	canvas.width = 300;
	canvas.height = 300;
	ctx = canvas.getContext('2d');
	test(ctx);
	document.body.appendChild(canvas);
}

function do_test(test) {
	test_canvas(test);
	test_webgl(test);
	document.body.appendChild(document.createElement('br'));
}

test_webgl
 
window.onload = function() {
	do_test(function(ctx) {	
		ctx.fillStyle = "blue";
		ctx.fillRect(10, 10, 100, 100);
	});
	do_test(function(ctx) {	
		var gradient = ctx.createLinearGradient(0,0,200,0);
		gradient.addColorStop(0,"green");
		gradient.addColorStop(1,"white");
		ctx.fillStyle = gradient;
		ctx.fillRect(10,10,200,100);
	});
	do_test(function(ctx) {	
		var gradient = ctx.createRadialGradient(100,100,100,100,100,0);
		gradient.addColorStop(0,"white");
		gradient.addColorStop(1,"green");
		ctx.fillStyle = gradient;
		ctx.fillRect(0,0,200,200);
	});
	do_test(function(ctx) {	
		var img = new Image();
		img.src = 'Canvas_createpattern.png';
		img.onload = function() {
		  var pattern = ctx.createPattern(img, 'repeat');
		  ctx.fillStyle = pattern;
		  ctx.fillRect(0,0,400,400);
		};
	});
	do_test(function(ctx) {	
		ctx.shadowColor = "black";
		ctx.shadowBlur = 10;

		ctx.fillStyle = "white";
		ctx.fillRect(10, 10, 100, 100);
	});
	do_test(function(ctx) {	
		ctx.shadowColor = "black";
		ctx.shadowOffsetY = 10;
		ctx.shadowOffsetX = 10;

		ctx.fillStyle = "green"
		ctx.fillRect(10, 10, 100, 100);
	});
	do_test(function(ctx) {	
		ctx.shadowColor = "black";
		ctx.shadowOffsetX = 10;
		ctx.shadowBlur = 10;

		ctx.fillStyle = "green";
		ctx.fillRect(10, 10, 100, 100);
	});
	do_test(function(ctx) {	
		ctx.shadowColor = "black";
		ctx.shadowOffsetY = 10;
		ctx.shadowBlur = 10;

		ctx.fillStyle = "green";
		ctx.fillRect(10, 10, 100, 100);
	});
	do_test(function(ctx) {	
		// First path
		ctx.beginPath();
		ctx.strokeStyle = 'blue';
		ctx.moveTo(20,20);
		ctx.lineTo(200,20);
		ctx.stroke();

		// Second path
		ctx.beginPath();
		ctx.strokeStyle = 'green';
		ctx.moveTo(20,20);
		ctx.lineTo(120,120);
		ctx.stroke();
	});
	
	do_test(function(ctx) {	
		ctx.fillStyle = "blue";
		ctx.fillRect(10, 10, 100, 100);
	});
	
	do_test(function(ctx) {	
		ctx.beginPath();
		ctx.moveTo(20,20);
		ctx.lineTo(200,20);
		ctx.lineTo(120,120);
		ctx.closePath(); // draws last line of the triangle
		ctx.stroke();
	});
	
	do_test(function(ctx) {	
		ctx.beginPath();
		ctx.moveTo(50,50);
		ctx.lineTo(200, 50);
		ctx.stroke();
	});	
	do_test(function(ctx) {	
		ctx.beginPath();
		ctx.moveTo(50,20);
		ctx.bezierCurveTo(230, 30, 150, 60, 50, 100);
		ctx.stroke();

		ctx.fillStyle = 'blue';
		// start point
		ctx.fillRect(50, 20, 10, 10);
		// end point
		ctx.fillRect(50, 100, 10, 10);

		ctx.fillStyle = 'red';
		// control point one
		ctx.fillRect(230, 30, 10, 10);
		// control point two
		ctx.fillRect(150, 60, 10, 10);
	});	
	do_test(function(ctx) {	
		ctx.beginPath();
		ctx.moveTo(50,20);
		ctx.quadraticCurveTo(230, 30, 50, 100);
		ctx.stroke();

		ctx.fillStyle = 'blue';
		// start point
		ctx.fillRect(50, 20, 10, 10);
		// end point
		ctx.fillRect(50, 100, 10, 10);

		ctx.fillStyle = 'red';
		// control point
		ctx.fillRect(230, 30, 10, 10);
	});	
	
	do_test(function(ctx) {	
		ctx.beginPath();
		ctx.arc(75, 75, 50, 0, 2 * Math.PI);
		ctx.stroke();
	});	
	do_test(function(ctx) {	
		ctx.beginPath();
		ctx.moveTo(150, 20);
		ctx.arcTo(150,100,50,20,30);
		ctx.stroke();

		ctx.fillStyle = 'blue';
		// base point
		ctx.fillRect(150, 20, 10, 10);

		ctx.fillStyle = 'red';
		// control point one
		ctx.fillRect(150, 100, 10, 10);
		// control point two
		ctx.fillRect(50, 20, 10, 10);
	});			
}