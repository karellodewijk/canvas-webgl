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
		var TypedArray = function(BufferType, length) {
			if (!length) length = 10;
			this.b = new BufferType(10);
			this.length = 0;
		}
	
		TypedArray.prototype = {
			push() {
				if (this.length + arguments.length > this.b.length) {
					var new_b = new this.b.constructor(Math.max(this.length+arguments.length, Math.round(this.b.length * 2)));
					new_b.set(this.b, 0);
					this.b = new_b;
				}
				for (var i = 0; i < arguments.length; i++) {
					this.b[this.length++] = arguments[i];
				}
				return this.length;	
			}
		}
		
		var test = new TypedArray(Uint8Array);
		for (var i = 0; i < 100; i++) {
			test.push(i)
		}
		console.log(test.b)
	
	});
}