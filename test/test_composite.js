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
	var img1 = document.getElementById("orig");
	var img2 = document.getElementById("cover");

	function test_comp(comp) {
		var title = document.createElement('h2');
		title.innerHTML = comp
		document.body.appendChild(title)
		do_test(function(ctx) {
			ctx.globalCompositeOperation = comp;
			ctx.drawImage(img1, 0, 0);
			ctx.drawImage(img2, 0, 0);
		});
	} 
	
	test_comp('source-over') //works
	test_comp('copy') //works
}