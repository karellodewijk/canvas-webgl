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
		ctx.fillStyle = '#f00';
		ctx.fillRect(0, 0, 100, 50);
		ctx.drawImage(document.getElementById('ggrr-256x256.png'), 0, 178, 50, -100, 0, 0, 50, 100);
		ctx.drawImage(document.getElementById('ggrr-256x256.png'), 0, 78, 50, 100, 50, 100, 50, -100);
	});	
}