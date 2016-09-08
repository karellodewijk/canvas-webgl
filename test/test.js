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
	 ctx.rotate(0.2)
	 
	 ctx.strokeStyle = "rgb(128,128,50)";
	 ctx.strokeRect(4, 4, 102, 102);
	 
	 ctx.fillStyle = "rgb(255,255,150)";
	 ctx.fillRect(5, 5, 100, 100);
	});	
}