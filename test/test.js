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
		//cctx.fillStyle = '#0f0';
		//cctx.fillRect(0, 0, 100, 50);

		//cvar tol = 1; // tolerance to avoid antialiasing artifacts

		//cctx.lineJoin = 'round';
		//ctx.lineWidth = 2;

		//cctx.fillStyle = '#f00';
		ctx.strokeStyle = '#000';

		//ctx.fillRect(10, 10, 20, 20);
		//ctx.fillRect(20, 20, 20, 20);
		ctx.beginPath();
		ctx.moveTo(30, 20);
		ctx.arc(30, 20, 10, 0, 2*Math.PI, true);
		ctx.stroke();

		/*
		ctx.beginPath();
		ctx.moveTo(10, 20);
		ctx.lineTo(30, 20);
		ctx.lineTo(30, 40);
		ctx.stroke();


		ctx.fillStyle = '#0f0';
		ctx.strokeStyle = '#f00';

		ctx.beginPath();
		ctx.moveTo(60, 20);
		ctx.lineTo(80, 20);
		ctx.lineTo(80, 40);
		ctx.stroke();

		ctx.fillRect(60, 10, 20, 20);
		ctx.fillRect(70, 20, 20, 20);
		ctx.beginPath();
		ctx.moveTo(80, 20);
		ctx.arc(80, 20, 10+tol, 0, 2*Math.PI, true);
		ctx.fill();
		*/
	});
}