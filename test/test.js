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
		var canvas = document.createElement('canvas');
		ctx2 = canvas.getContext('2d');
		ctx2.moveTo(0,0);
		ctx2.lineTo(200,100);
		ctx2.stroke();
		ctx.drawImage(0, 0, 0, 100, 100, 0, 0, 100, 100);
		//var image = document.getElementById("asteroid1.png");
		//ctx.drawImage(image, 0, 2850, 64, 64, 0, 0, 64, 64);
		//ctx.drawImage(image, 0, 2850, 64, 64, 0, 0, 64, 64);
		//console.log(image.nodes);
	});	
}