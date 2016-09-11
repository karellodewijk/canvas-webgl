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
		ctx.rect(5,5,30,30);
		ctx.rect(25,25,50,50);
		ctx.stroke();
		
		var data = ctx.getImageData(10,10,50,50);

		var canvas = document.createElement('canvas');
		canvas.setAttribute("style", "border-style: solid; border-width: 5px; margin:5px");
		canvas.width = 300;
		canvas.height = 300;
		ctx2 = canvas.getContext('webgl-2d');
		var new_data = ctx2.createImageData(50,50);
		
		for (var i in data.data) {
			new_data.data[i] = data.data[i];
		}
		
		ctx2.putImageData(new_data,20,80);
		
		document.body.appendChild(canvas);
		
	});
}