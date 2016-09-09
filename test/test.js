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

	ctx.lineWidth = 20;
	ctx.lineJoin = 'bevel';
	ctx.strokeRect(10, 10, 100, 100);
	
	/*
	ctx.fillStyle = '#f00';
	ctx.strokeStyle = '#0f0';
	ctx.fillRect(0, 0, 100, 50);

	ctx.lineJoin = 'bevel';
	ctx.lineCap = 'square';
	ctx.lineWidth = 400;

	ctx.beginPath();
	ctx.moveTo(200, 200);
	ctx.lineTo(200, 1000);
	ctx.lineTo(1000, 1000);
	ctx.lineTo(1000, 200);
	ctx.lineTo(200, 200);
	ctx.stroke();
	*/
		/*
		ctx.beginPath();
		ctx.moveTo(25, 15);
		ctx.lineTo(25, 35);
		ctx.stroke();


		ctx.fillStyle = '#0f0';
		ctx.strokeStyle = '#f00';

		ctx.beginPath();
		ctx.moveTo(75, 15);
		ctx.lineTo(75, 35);
		ctx.stroke();

		ctx.beginPath();
		ctx.moveTo(85+tol, 15);
		ctx.arc(75, 15, 10+tol, 0, Math.PI, true);
		ctx.arc(75, 35, 10+tol, Math.PI, 0, true);
		ctx.fill();
		*/
	});
}