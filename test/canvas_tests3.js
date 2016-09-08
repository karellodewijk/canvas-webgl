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
		ctx.beginPath();
		ctx.ellipse(100, 100, 50, 75, 45 * Math.PI/180, 0, 2 * Math.PI);
		ctx.stroke();
	});		
	do_test(function(ctx) {	
		ctx.rect(10, 10, 100, 100);
		ctx.fill();
	});	
	do_test(function(ctx) {	
		ctx.rect(10, 10, 100, 100);
		ctx.stroke();
		console.log(ctx.isPointInPath(10, 10)); // true
		console.log(ctx.isPointInStroke(10, 10)); // true
	});		
	do_test(function(ctx) {	
		ctx.rotate(45 * Math.PI / 180);
		ctx.fillRect(70,0,100,30);

		// reset current transformation matrix to the identity matrix
		ctx.setTransform(1, 0, 0, 1, 0, 0);
	});		
	do_test(function(ctx) {	
		ctx.scale(10, 3);
		ctx.fillRect(10,10,10,10);

		// reset current transformation matrix to the identity matrix
		ctx.setTransform(1, 0, 0, 1, 0, 0);
	});		
	do_test(function(ctx) {	
		ctx.transform(1,1,0,1,0,0);
		ctx.fillRect(0,0,100,100);
	});			
	do_test(function(ctx) {	
		var image = document.getElementById("source");

		ctx.drawImage(image, 33, 71, 104, 124, 21, 20, 87, 104);
	});			
	do_test(function(ctx) {	
		function putImageData(ctx, imageData, dx, dy,
			dirtyX, dirtyY, dirtyWidth, dirtyHeight) {
		  var data = imageData.data;
		  var height = imageData.height;
		  var width = imageData.width;
		  dirtyX = dirtyX || 0;
		  dirtyY = dirtyY || 0;
		  dirtyWidth = dirtyWidth !== undefined? dirtyWidth: width;
		  dirtyHeight = dirtyHeight !== undefined? dirtyHeight: height;
		  var limitBottom = dirtyY + dirtyHeight;
		  var limitRight = dirtyX + dirtyWidth;
		  for (var y = dirtyY; y < limitBottom; y++) {
			for (var x = dirtyX; x < limitRight; x++) {
			  var pos = y * width + x;
			  ctx.fillStyle = 'rgba(' + data[pos*4+0]
								+ ',' + data[pos*4+1]
								+ ',' + data[pos*4+2]
								+ ',' + (data[pos*4+3]/255) + ')';
			  ctx.fillRect(x + dx, y + dy, 1, 1);
			}
		  }
		}

		// Draw content onto the canvas
		ctx.fillRect(0,0,100,100);
		// Create an ImageData object from it
		var imagedata = ctx.getImageData(0,0,100,100);
		// use the putImageData function that illustrates how putImageData works
		putImageData(ctx, imagedata, 150, 0, 50, 50, 25, 25);
	});			
	do_test(function(ctx) {	
		ctx.save(); // save the default state

		ctx.fillStyle = "green";
		ctx.fillRect(10, 10, 100, 100);

		ctx.restore(); // restore to the default state
		ctx.fillRect(150, 75, 100, 100);
	});		
}