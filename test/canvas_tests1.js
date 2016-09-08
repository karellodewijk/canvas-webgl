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
		ctx.fillStyle = "green";
		ctx.fillRect(10, 10, 100, 100);
	});
	do_test(function(ctx) {
		ctx.beginPath();
		ctx.moveTo(20,20);
		ctx.lineTo(200,20);
		ctx.lineTo(120,120);
		ctx.closePath(); // draws last line of the triangle
		ctx.stroke();
		ctx.clearRect(10, 10, 100, 100);
	});
	do_test(function(ctx) {
		ctx.strokeStyle = "green";
		ctx.strokeRect(10, 10, 100, 100);
	});
	do_test(function(ctx) {
		ctx.font = "48px serif";
		ctx.fillText("Hello world", 50, 100);
	});
	do_test(function(ctx) {
		ctx.font = "48px serif";
		ctx.strokeText("Hello world", 50, 100);
	});
	do_test(function(ctx) {
		ctx.beginPath();
		ctx.moveTo(0,0);
		ctx.lineWidth = 15;
		ctx.lineTo(100, 100);
		ctx.stroke();
	});
	do_test(function(ctx) {	
		var lineCap = ['butt','round','square'];

		// Draw guides
		ctx.strokeStyle = '#09f';
		ctx.beginPath();
		ctx.moveTo(10,10);
		ctx.lineTo(140,10);
		ctx.moveTo(10,140);
		ctx.lineTo(140,140);
		ctx.stroke();

		// Draw lines
		ctx.strokeStyle = 'black';
		for (var i = 0; i < lineCap.length; i++) {
		  ctx.lineWidth = 15;
		  ctx.lineCap = lineCap[i];
		  ctx.beginPath();
		  ctx.moveTo(25+i*50,10);
		  ctx.lineTo(25+i*50,140);
		  ctx.stroke();
		}
	});
	do_test(function(ctx) {	
		var lineJoin = ['round','bevel','miter'];
		ctx.lineWidth = 10;

		for (var i = 0; i < lineJoin.length; i++) {
		  ctx.lineJoin = lineJoin[i];
		  ctx.beginPath();
		  ctx.moveTo(-5,5+i*40);
		  ctx.lineTo(35,45+i*40);
		  ctx.lineTo(75,5+i*40);
		  ctx.lineTo(115,45+i*40);
		  ctx.lineTo(155,5+i*40);
		  ctx.stroke();
		}
	});
	do_test(function(ctx) {	
		// Clear canvas

		// Draw guides
		ctx.strokeStyle = '#09f';
		ctx.lineWidth   = 2;
		ctx.strokeRect(-5, 50, 160, 50);

		// Set line styles
		ctx.strokeStyle = '#000';
		ctx.lineWidth = 10;

		ctx.miterLimit = 5;

		// Draw lines
		ctx.beginPath();
		ctx.moveTo(0, 100);
		for (i = 0; i < 24 ; i++){
		var dy = i % 2 == 0 ? 25 : -25 ;
		ctx.lineTo(Math.pow(i, 1.5) * 2, 75 + dy);
		}
		ctx.stroke();
	});
	do_test(function(ctx) {	
		ctx.setLineDash([5, 15]);
		console.log(ctx.getLineDash()); // [5, 15]

		ctx.beginPath();
		ctx.moveTo(0,100);
		ctx.lineTo(400, 100);
		ctx.stroke();
	});
	do_test(function(ctx) {	
		ctx.beginPath();
		ctx.moveTo(0,100);
		ctx.lineTo(400, 100);
		ctx.stroke();	
	});


	do_test(function(ctx) {	
		ctx.setLineDash([4, 16]);
		ctx.lineDashOffset = 2;

		ctx.beginPath();
		ctx.moveTo(0,100);
		ctx.lineTo(400, 100);
		ctx.stroke();
	});

	do_test(function(ctx) {	
		ctx.font = "48px serif";
		ctx.strokeText("Hello world", 50, 100);
	});

	do_test(function(ctx) {	
		ctx.font = "48px serif";
		ctx.textAlign = "left";
		ctx.strokeText("Hello world", 0, 100);	
	});

	do_test(function(ctx) {	
		ctx.font = "48px serif";
		ctx.textBaseline = "hanging";
		ctx.strokeText("Hello world", 0, 100);
	});
	do_test(function(ctx) {	
		ctx.font = "48px serif";
		ctx.direction = "ltr";
		ctx.strokeText("Hello world", 0, 100);
	});
}