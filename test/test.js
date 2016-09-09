function test_webgl(test) {
	var canvas = document.createElement('canvas');
	canvas.setAttribute("style", "border-style: solid; border-width: 5px; margin:5px");
	canvas.width = 300;
	canvas.height = 300;
	ctx = canvas.getContext('webgl-2d');
	document.body.appendChild(canvas);
	test(ctx);
}

function test_canvas(test) {
	var canvas = document.createElement('canvas');
	canvas.setAttribute("style", "border-style: solid; border-width: 5px; margin:5px");
	canvas.width = 300;
	canvas.height = 300;
	ctx = canvas.getContext('2d');
	document.body.appendChild(canvas);
	test(ctx);
}

function do_test(test) {
	test_canvas(test);
	test_webgl(test);
	document.body.appendChild(document.createElement('br'));
}

window.onload = function() {
	do_test(function(ctx) {
		//ctx.fillStyle = 'rgba(0,255,0,1)';
		//ctx.fillRect(0, 0, 100, 50);
		ctx.fillStyle = 'rgba(255,0,0,0.5)';
		ctx.shadowColor = '#000';
		ctx.shadowOffsetX = 25;
		ctx.fillRect(0, 0, 50, 50);
		
		//ctx.fillStyle = 'rgba(0,255,0,1)';
		//ctx.fillRect(0, 0, 100, 50);
		ctx.fillStyle = 'rgba(255,0,0,0.5)';
		ctx.shadowColor = '#000';
		ctx.shadowOffsetX = 0;
		ctx.fillStyle = 'rgba(0,0,0,0.5)';
		ctx.fillRect(25, 50, 50, 50);
		ctx.fillStyle = 'rgba(255,0,0,0.5)';
		ctx.fillRect(0, 50, 50, 50);

		
	});
}