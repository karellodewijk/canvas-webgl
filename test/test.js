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
		//ctx.shadowBlur = 10;
		
		//console.log(ctx._transform)
		ctx.translate(2,2);
		ctx.rect(5,5,30,30);
		ctx.clip();
		
		ctx.resetTransform();
		ctx.beginPath();
		ctx.rect(5,5,30,30);
		ctx.stroke()
		//var image = document.getElementById("source");
		//ctx.drawImage(image, 33, 71, 104, 124, 21, 20, 87, 104);
	});
}