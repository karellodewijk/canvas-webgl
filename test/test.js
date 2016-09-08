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

window.onload = function() {
	do_test(function(ctx) {	
		// (These values are chosen to survive relatively alright through being premultiplied)
		ctx.fillStyle = 'rgba(1, 3, 254, 1)';
		ctx.fillRect(0, 0, 25, 25);
		ctx.fillStyle = 'rgba(8, 252, 248, 0.75)';
		ctx.fillRect(25, 0, 25, 25);
		ctx.fillStyle = 'rgba(6, 10, 250, 0.502)';
		ctx.fillRect(50, 0, 25, 25);
		ctx.fillStyle = 'rgba(12, 16, 244, 0.25)';
		ctx.fillRect(75, 0, 25, 25);

	});	
}