"use strict";

(function() {	
	var EPSILON = 0.000001; //mostly used for zindex increments
	var BEZIER_CURVE_RESOLUTION = 5; //space between interpolation points for quadratic and bezier curve approx. in pixels.
	var ARC_RESOLUTION = 5;  //space between interpolation points for quadratic and bezier curve approx. in pixels. Also used for linejoins and linecaps
	var SQRT_2 = Math.sqrt(2);
	var MAX_TEXTURE_SIZE = 4096;
	
	var shadow_fragment_shader = `
	    precision mediump float;
	
		uniform sampler2D texture;
		uniform vec4 u_shadow_color;
		uniform vec2 u_direction;
		uniform float u_gauss_coeff[100]; //we will rarely send 100 coeff
		uniform float u_global_alpha;
		 
		varying vec2 v_texcoord;

		/*
		//returns vec4(0,0,0,0) when coords are out of bounds
		//TODO: this seems expensive, but couldn't find a better way
		//where is gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, (some option saying no-wrap, return 0 vect));
		vec4 get_color(sampler2D tex, vec2 coord) {
			if (coord.x < 0.0 || coord.x > 1.0 || coord.y < 0.0 || coord.y > 1.0) {
				return vec4(0.0);
			}
			return texture2D(tex, coord);
		}
		*/
			
		void main() {
			vec4 color = texture2D(texture, v_texcoord)* u_gauss_coeff[0];
			for (int i = 1; i < 100; i++) {
				if (u_gauss_coeff[i] == 0.0) break;
			    color += texture2D(texture, v_texcoord + float(i) * u_direction) * u_gauss_coeff[i];
			    color += texture2D(texture, v_texcoord - float(i) * u_direction) * u_gauss_coeff[i];
		    }  
			gl_FragColor = vec4(u_shadow_color.xyz, u_shadow_color.w * color.w * u_global_alpha);
		}
	`
	
	var shadow_vertex_shader = `
		attribute vec2 a_position;
		uniform float u_zindex;
		uniform vec2 u_offset;
		
		varying vec2 v_texcoord;
		
		void main() {
		   gl_Position = vec4(a_position, u_zindex, 1);
		   v_texcoord = 0.5 * (gl_Position.xy  + 1.0) + u_offset; //-1,1 -> 0,1
		}
	`

		var image_draw_vertex_shader2 = `
		attribute vec2 a_position;
		attribute vec2 a_texcoord;
		
		uniform float u_zindex;
		uniform mat4 u_matrix;
		
		varying vec2 v_texcoord;

		void main() {
		  gl_Position = u_matrix * vec4(a_position, u_zindex, 1);
		  v_texcoord = a_texcoord;
		}
	`
	
	var image_draw_fragment_shader2 = `	
		precision mediump float;

		uniform sampler2D texture;
		uniform float u_global_alpha;
		
		varying vec2 v_texcoord;
		

		void main() {
		   gl_FragColor = texture2D(texture, v_texcoord);
		   gl_FragColor.w *= u_global_alpha;
		}
	`

	var texture_draw_vertex_shader = `
		attribute vec2 a_position;
		uniform float u_zindex;
		uniform mat4 u_matrix;
		
		varying vec2 v_texcoord;
		
		void main() {
		    gl_Position = u_matrix * vec4(a_position, u_zindex, 1);
			v_texcoord = 0.5 * (gl_Position.xy + 1.0); //-1,1 -> 0,1
		}
	`
	
	var texture_draw_fragment_shader = `	
		precision mediump float;
		uniform sampler2D texture;
		uniform float u_global_alpha;
		
		varying vec2 v_texcoord;
		 
		void main() {
		   gl_FragColor = texture2D(texture, v_texcoord);
		   gl_FragColor.w *= u_global_alpha;
		}
	`
	
	var direct_texture_draw_vertex_shader =  `		
		attribute vec2 a_position;
		attribute vec2 a_texcoord;
		
		uniform float u_zindex;
		uniform mat4 u_matrix;

		varying vec2 v_texcoord;

		void main()	{
		    gl_Position = u_matrix * vec4(a_position, u_zindex, 1);
			v_texcoord = a_texcoord;
		}
	`

	var simple_draw_vertex_shader = `
		attribute vec2 a_position;
		uniform float u_zindex;
		uniform mat4 u_matrix;

		void main() {
		  gl_Position = u_matrix * vec4(a_position, u_zindex, 1);
		}
	`
	
	var simple_draw_fragment_shader = `	
		precision mediump float;

		uniform vec4 u_color;
		uniform float u_global_alpha;

		void main() {
		   gl_FragColor = u_color;
		   gl_FragColor.w *= u_global_alpha;
		}
	`

	var gradient_vertex_shader = `
		attribute vec2 a_position;
		attribute vec4 a_color;
		uniform float u_zindex;
		uniform mat4 u_matrix;
		
		varying vec4 v_color;
		
		void main() {
		  gl_Position = u_matrix * vec4(a_position, u_zindex, 1);
		  v_color = a_color;
		}
	`
	
	var gradient_fragment_shader = `	
		precision mediump float;

		varying vec4 v_color;
		
		void main() {
		   gl_FragColor = v_color;
		}
	`
	
	var circle_gradient_vertex_shader = `
		attribute vec2 a_position;
		
		uniform vec3 a_circle1;
		uniform vec3 a_circle2;
		uniform vec4 a_color1;
		uniform vec4 a_color2;
		
		uniform float u_zindex;
		uniform mat4 u_matrix;

		varying vec3 circle1;
		varying vec3 circle2;
		varying vec4 color1;
		varying vec4 color2;
		
		void main() {
		  gl_Position = u_matrix * vec4(a_position, u_zindex, 1);
		  circle1 = a_circle1;
		  circle2 = a_circle2;
		  color1 = a_color1;
		  color2 = a_color2;
		}
	`
	
	var circle_gradient_fragment_shader = `	
		precision mediump float;

		uniform vec3 circle1;
		uniform vec3 circle2;
		uniform vec4 color1;
		uniform vec4 color2;
		
		void main() {
			float dx1 =  gl_FragCoord.x - circle1.x;
			float dy1 =  gl_FragCoord.y - circle1.y;
			float l1 = sqrt(dx1*dx1 + dy1*dy1) - circle1.z;

			float dx2 =  gl_FragCoord.x - circle2.x;
			float dy2 =  gl_FragCoord.y - circle2.y;
			float l2 = sqrt(dx2*dx2 + dy2*dy2) - circle2.z;
			
			float w = l2 / (l2-l1);
			
			if (w < 0.0) {
				discard;
			}
			if (w > 1.0) {
				discard;
			}
			
			w = max(w, 0.0);
	
			gl_FragColor = w * color1 + (1.0 - w) * color2;
		}
	`
	
	//quick wrapper around a typed array that supports push and auto-grow mechanics akin to std::vector
	//It's not great but performance should be better than Array for fixed types and it avoids conversions
	//NOTE: only supports push/length, everything else should be done by .b var which contains the actual buffer
	var TypedArray = function(BufferType, length) {
		if (!length) length = 10;
		this.b = new BufferType(10);
		this.length = 0;
	}

	TypedArray.prototype = {
		push() {
			if (this.length + arguments.length > this.b.length) {
				//grow buffer
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
	
	//2d bin packing algorihm, taken from https://github.com/mackstann/binpack
    function Rect(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }
    Rect.prototype.fits_in = function(outer) {
        return outer.w >= this.w && outer.h >= this.h;
    }
    Rect.prototype.same_size_as = function(other) {
        return this.w == other.w && this.h == other.h;
    }	
    function Node() {
        this.left = null;
        this.right = null;
        this.rect = null;
        this.filled = false;
    }
    Node.prototype = {
		insert_rect(rect) {
			if(this.left != null)
				return this.left.insert_rect(rect) || this.right.insert_rect(rect);
			if(this.filled)
				return null;
			if(!rect.fits_in(this.rect))
				return null;
			if(rect.same_size_as(this.rect)) {
				this.filled = true;
				return this;
			}
			this.left = new Node();
			this.right = new Node();
			var width_diff = this.rect.w - rect.w;
			var height_diff = this.rect.h - rect.h;
			var me = this.rect;
			if(width_diff > height_diff) {
				// split literally into left and right, putting the rect on the left.
				this.left.rect = new Rect(me.x, me.y, rect.w, me.h);
				this.right.rect = new Rect(me.x + rect.w, me.y, me.w - rect.w, me.h);
			} else {
				// split into top and bottom, putting rect on top.
				this.left.rect = new Rect(me.x, me.y, me.w, rect.h);
				this.right.rect = new Rect(me.x, me.y + rect.h, me.w, me.h - rect.h);
			}
			return this.left.insert_rect(rect);
		},
		insert_rect_partition(rect, xOffset, yOffset) {
			var node = this.insert_rect(rect);
			if (node == null) {
				if (rect.w <= 1 && rect.h <= 1) return [null]; //partitioning further just doesn't make sense
				var rect1, rect2, xOffset2, yOffset2;
				if (rect.w >= rect.h) {
					rect1 = new Rect(0, 0, Math.round(rect.w/2), rect.h);
					rect2 = new Rect(0, 0, rect.w - Math.round(rect.w/2), rect.h);
					xOffset2 = xOffset + Math.round(rect.w/2);
					yOffset2 = yOffset;
				} else {
					rect1 = new Rect(0, 0, rect.w, Math.round(rect.h/2));
					rect2 = new Rect(0, 0, rect.w, rect.h - Math.round(rect.h/2));
					xOffset2 = xOffset;
					yOffset2 = yOffset + Math.round(rect.h/2);					
				}
				return this.insert_rect_partition(rect2, xOffset2 , yOffset2).concat(this.insert_rect_partition(rect1, xOffset, yOffset));
			}
			node.x = xOffset;
			node.y = yOffset;
			return [node];
		}
    }
	
	function TextureManager(gl, width, height) {
		this.gl = gl;
		this.root = new Node();
		this.root.rect = new Rect(0, 0, width, height);
		gl.activeTexture(gl.TEXTURE4);
		this.texture = gl.createTexture();
		this.width = width;
		this.height = height;
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		this.colorAtlas = {};
		
		//the things we need to do to crealte a wxh blank texture
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(width*height*4));
	}
	
	TextureManager.prototype = {
		//returns texture coords for a color
		set_color(color) {
			var gl = this.gl;
			gl.activeTexture(gl.TEXTURE4);
			gl.bindTexture(gl.TEXTURE_2D, this.texture);
			if (!this.colorAtlas[color]) {
				var rect = new Rect(0, 0, 1, 1);
				var node = this.root.insert_rect(rect);
				var texColor = new Uint8Array([color[0]*255, color[1]*255, color[2]*255, color[3]*255]);
				gl.texSubImage2D(gl.TEXTURE_2D, 0, node.rect.x, node.rect.y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, texColor);
				this.colorAtlas[color] = [node.rect.x, node.rect.y];
			}
			return this.colorAtlas[color];
		},
		//copies a into texture map. after this function img.nodes will contain the coord(s) of the image within
		//the texture map. Note that the image may be split into multiple rectangles.
		set_texture_from_texture(img, ctx) {
			var gl = this.gl;
			var _this = this;
			var copy_texture = function(node) {				
				var framebuffer = gl.createFramebuffer();
				framebuffer.width = img.width;
				framebuffer.height = img.height;	
				gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);				
				gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, img, 0);
				
				gl.activeTexture(gl.TEXTURE4);
				gl.bindTexture(gl.TEXTURE_2D, _this.texture);
				
				gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, node.rect.x, node.rect.y, node.x, node.y, node.rect.w, node.rect.h);				
			}
			if (!img.nodes) {
				var rect = new Rect(0, 0, img.width, img.height);	
				img.nodes = this.root.insert_rect_partition(rect, 0, 0);
				
				if (img.nodes.length == 1) {
					var node = img.nodes[0];
					if (node == null) {
						console.warn("Texture full: contact the canvas-webgl API developer for a fix");
					} else {
						copy_texture(node);
					}
				} else {
					for (var i in img.nodes) {
						var node = img.nodes[i];
						if (node == null) {
							console.warn("Texture full: contact the canvas-webgl API developer for a fix");
							continue;
						}
						copy_texture(node);
					}
				}
				gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			}			
			gl.activeTexture(gl.TEXTURE4);
			gl.bindTexture(gl.TEXTURE_2D, this.texture);
		},
		//copies the img or canvas to the texture map. after this function img.nodes will contain the coord(s) of the image within
		//the texture map. Note that the image may be split into multiple rectangles.
		set_texture_from_img(img) {
			var gl = this.gl;
			gl.activeTexture(gl.TEXTURE4);
			gl.bindTexture(gl.TEXTURE_2D, this.texture);		
			var write_texture = function() {
				if (img.nodes.length == 1) {
					var node = img.nodes[0];
					if (node == null) {
						console.warn("Texture full: contact the canvas-webgl API developer for a fix");
					} else {
						gl.texSubImage2D(gl.TEXTURE_2D, 0, node.rect.x, node.rect.y, gl.RGBA, gl.UNSIGNED_BYTE, img);
					}
				} else {
					for (var i in img.nodes) {
						var node = img.nodes[i];
						if (node == null) {
							console.warn("Texture full: contact the canvas-webgl API developer for a fix");
							continue;
						}
						var canvas = document.createElement('canvas');
						canvas.width = node.rect.w;
						canvas.height = node.rect.h;
						var ctx = canvas.getContext('2d');
						ctx.drawImage(img, node.x, node.y, node.rect.w, node.rect.h, 0, 0, node.rect.w, node.rect.h);
						gl.texSubImage2D(gl.TEXTURE_2D, 0, node.rect.x, node.rect.y, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
					}
				}
			}			
			if (img instanceof HTMLCanvasElement) {
				//canvas has no associated texture space or the canvas is grown
				if (!img.nodes || img.width > img.orig_width || img.height > img.orig_height) {
					var w = img.orig_width ? Math.max(img.width, img.orig_width) : img.width;
					var h = img.orig_height ? Math.max(img.height, img.orig_height) : img.height;
					var rect = new Rect(0, 0, w, h);
					img.orig_height = w;
					img.orig_width = h;
					img.nodes = this.root.insert_rect_partition(rect, 0, 0);
				}
				write_texture(); //always overwrite the texture space as canvas may have changed
			} else {
				if (!img.nodes) {
					var rect = new Rect(0, 0, img.width, img.height);
					img.nodes = this.root.insert_rect_partition(rect, 0, 0);
					write_texture();
				}
			}
		}
	}
	
	function matrixMultiply(a, b) {
	  return[ a[0]  * b[0] + a[1]  * b[4]  + a[2]  * b[8]  + a[3]  * b[12], //0,0
	          a[0]  * b[1] + a[1]  * b[5]  + a[2]  * b[9]  + a[3]  * b[13], //0,1
			  a[0]  * b[2] + a[1]  * b[6]  + a[2]  * b[10] + a[3]  * b[14], //0,2
			  a[0]  * b[3] + a[1]  * b[7]  + a[2]  * b[11] + a[3]  * b[15], //0,3		
			  a[4]  * b[0] + a[5]  * b[4]  + a[6]  * b[8]  + a[7]  * b[12], //1,0
			  a[4]  * b[1] + a[5]  * b[5]  + a[6]  * b[9]  + a[7]  * b[13], //1,1
			  a[4]  * b[2] + a[5]  * b[6]  + a[6]  * b[10] + a[7]  * b[14], //1,2
			  a[4]  * b[3] + a[5]  * b[7]  + a[6]  * b[11] + a[7]  * b[15], //1,3
			  a[8]  * b[0] + a[9]  * b[4]  + a[10] * b[8]  + a[11] * b[12], //2,0
			  a[8]  * b[1] + a[9]  * b[5]  + a[10] * b[9]  + a[11] * b[13], //2,1
			  a[8]  * b[2] + a[9]  * b[6] + a[10] * b[10] + a[11] * b[14], //2,2
			  a[8]  * b[3] + a[9]  * b[7] + a[10] * b[11] + a[11] * b[15], //2,3
			  a[12] * b[0] + a[13] * b[4]  + a[14] * b[8]  + a[15] * b[12], //3,0
			  a[12] * b[1] + a[13] * b[5]  + a[14] * b[9]  + a[15] * b[13], //3,1
			  a[12] * b[2] + a[13] * b[6] + a[14] * b[10] + a[15] * b[14], //3,2
			  a[12] * b[3] + a[13] * b[7] + a[14] * b[11] + a[15] * b[15] ]//3,3
	}

	//from: http://www.blackpawn.com/texts/pointinpoly/default.html
	function is_in_triangle(px,py,ax,ay,bx,by,cx,cy) {
		var v0 = [cx-ax,cy-ay];
		var v1 = [bx-ax,by-ay];
		var v2 = [px-ax,py-ay];

		var dot00 = (v0[0]*v0[0]) + (v0[1]*v0[1]);
		var dot01 = (v0[0]*v1[0]) + (v0[1]*v1[1]);
		var dot02 = (v0[0]*v2[0]) + (v0[1]*v2[1]);
		var dot11 = (v1[0]*v1[0]) + (v1[1]*v1[1]);
		var dot12 = (v1[0]*v2[0]) + (v1[1]*v2[1]);

		var invDenom = 1/ (dot00 * dot11 - dot01 * dot01);

		var u = (dot11 * dot02 - dot01 * dot12) * invDenom;
		var v = (dot00 * dot12 - dot01 * dot02) * invDenom;

		return ((u >= 0) && (v >= 0) && (u + v <= 1));
	}
	
	function matrixVectorMultiply(m, v) {
		return  [ m[0*4 + 0] * v[0] + m[0*4 + 1] * v[1] + m[0*4 + 2] * v[2] + m[0*4 + 3] * v[3],
				  m[1*4 + 0] * v[0] + m[1*4 + 1] * v[1] + m[1*4 + 2] * v[2] + m[1*4 + 3] * v[3],
				  m[2*4 + 0] * v[0] + m[2*4 + 1] * v[1] + m[2*4 + 2] * v[2] + m[2*4 + 3] * v[3],
				  m[3*4 + 0] * v[0] + m[3*4 + 1] * v[1] + m[3*4 + 2] * v[2] + m[3*4 + 3] * v[3] ];
	}
	
	function vectTransform(m, v) {
		return  [m[0] * v[0] + m[1] * v[1] + m[12],
				 m[4] * v[0] + m[5] * v[1] + m[13]];
	}
	
	function vectSvgTransform(m, v) {
		return  [m.a * v[0] + m.c * v[1] + m.e,
				 m.b * v[0] + m.d * v[1] + m.f];
	}

	function _add_arc(triangle_buffer, x, y, radius, startAngle, endAngle, anticlockwise) {
		//bring angles all in [0, 2*PI] range
		startAngle = startAngle % (2 * Math.PI);
		endAngle = endAngle % (2 * Math.PI);
		if (startAngle < 0) startAngle += 2*Math.PI;
		if (endAngle < 0) endAngle += 2*Math.PI;

		if (startAngle>=endAngle) {
			endAngle += 2 * Math.PI;
		}
		var diff = endAngle - startAngle;
		
		var direction = 1;
		if (anticlockwise) {
			direction = -1;			
			diff = 2*Math.PI - diff;
			if (diff == 0) diff = 2*Math.PI;
		}
		
		var length = diff * radius;
		var nr_of_interpolation_points = length / ARC_RESOLUTION;		
		var dangle = diff / nr_of_interpolation_points;
		
		var angle = startAngle;
		for (var j = 0; j < nr_of_interpolation_points+1; j++) {
			triangle_buffer.push(x, y, x + radius * Math.cos(angle), y + radius * Math.sin(angle));
			angle += direction * dangle;
		}
	}
	
	function _add_dashed_arc(triangle_buffer, center, a, b, lineWidthDiv2, interpolation_scale, to_draw) {
		var start_angle = Math.atan2(a[1] - center[1], a[0] - center[0]);
		var stop_angle = Math.atan2(b[1] - center[1], b[0] - center[0]);
		if (start_angle > stop_angle) { 
			stop_angle += 2 * Math.PI;
		}
		var diff = stop_angle - start_angle;						
		var nr_of_interpolation_points = Math.ceil(interpolation_scale * lineWidthDiv2) + 1;		
		var dangle = diff / nr_of_interpolation_points;

		var angle = start_angle + dangle;
		for (var j = 0; j < nr_of_interpolation_points - 1; j++) {
			var x = center[0] + lineWidthDiv2 * Math.cos(angle);
			var y = center[1] + lineWidthDiv2 * Math.sin(angle);
			triangle_buffer.push(center[0], center[1], to_draw, x, y, to_draw);
			angle += dangle;
		}
	}
	
	var CanvasPattern = function(image, repetition) {
		this.image = image;
		if (repetition === null || repetition == "") {
			this.repetition = 'repeat';
		} else {
			this.repetition = repetition;
		}
		this.thisImplementsCanvasPattern = true;
	}
	
	CanvasPattern.prototype = {
		_generateTexture(ctx, width, height) {
			var gl = ctx.gl;
			var program = ctx._select_program(ctx.image_program);

			//This is our input texture
			gl.activeTexture(gl.TEXTURE1);
			var temp_texture = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, temp_texture);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);		
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.image);
			gl.uniform1i(program.textureLocation, 1);

			//This will be our output texture
			gl.activeTexture(gl.TEXTURE0);
			var texture = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, texture);	
			var framebuffer = gl.createFramebuffer();
			gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
			framebuffer.width = width;
			framebuffer.height = height;		
			
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, framebuffer.width, framebuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
			gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
			
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, texture);					
	
			var texPoints = [0, 0, 1, 0, 1, 1, 0, 1];			
			gl.bindBuffer(gl.ARRAY_BUFFER, program.texCoordBuffer);
			gl.vertexAttribPointer(program.texCoordLocation, 2, gl.FLOAT, false, 0, 0);				
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texPoints), gl.STATIC_DRAW);
			
			gl.uniformMatrix4fv(program.transformLocation, false, ctx.projectionMatrix);
			
			var iw, ih;
			if (this.image instanceof HTMLImageElement) {
				iw = this.image.naturalWidth; ih = this.image.naturalHeight; 
			} else {
				iw = this.image.width; ih = this.image.height;
			}
			
			if (this.repetition == 'repeat-x') {
				height =  ih;
			} else if (this.repetition == 'repeat-y') {
				width = iw;
			} else if (this.repetition == 'no-repeat') {
				width = iw;
				height =  ih;
			}				

			if (iw > 0 && ih > 0) {
				for (var x=0; x < width; x+=iw) {
					for (var y=0; y < height; y+=ih) {				
						var points = [x, y, x+iw, y, x+iw, y+ih, x, y+ih];
						gl.bindBuffer(gl.ARRAY_BUFFER, program.vertexBuffer);
						gl.vertexAttribPointer(program.positionLocation, 2, gl.FLOAT, false, 0, 0);				
						gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);
						gl.drawArrays(gl.TRIANGLE_FAN, 0, points.length/2);
					}
				}
			}

			gl.bindTexture(gl.TEXTURE_2D, null);
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);			
			return texture;
		}
	}
	
	var RadialGradient = function(x0, y0, r0, x1, y1, r1) {
		this.circle1 = [x0, y0, r0];
		this.circle2 = [x1, y1, r1];
		this.colorStops = [];
	}
	
	RadialGradient.prototype = {
		addColorStop(offset, color) {
			this.colorStops.push([offset, parseColor(color)]);
			this.colorStops.sort(function(a, b) {
			  return a[0] - b[0];
			});
		},		
		_generateTexture(ctx, width, height) {
			//prepare texture
			var gl = ctx.gl;
			
			var framebuffer = gl.createFramebuffer();
			gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
			framebuffer.width = width;
			framebuffer.height = height;
			
			var texture = gl.createTexture();		
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, framebuffer.width, framebuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
			gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

			var program = ctx._select_program(ctx.circle_program);
			var vertices =  [0, 0, width, 0, width, height, 0, height];
			
			gl.bindBuffer(gl.ARRAY_BUFFER, program.vertexBuffer);			
			gl.vertexAttribPointer(program.positionLocation, 2, gl.FLOAT, false, 0, 0);	
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);	
				
			var inner_stop;
			var inner_circle;
			if (this.circle1[2] > this.circle2[2]) {
				gl.clearColor(this.colorStops[0][1][0], this.colorStops[0][1][1], this.colorStops[0][1][2], this.colorStops[0][1][3]);
				inner_circle = this.circle2;
				inner_stop = this.colorStops[this.colorStops.length-1];
			} else {
				gl.clearColor(this.colorStops[this.colorStops.length-1][1][0], this.colorStops[this.colorStops.length-1][1][1], this.colorStops[this.colorStops.length-1][1][2], this.colorStops[this.colorStops.length-1][1][3]);
				inner_circle = this.circle1;
				inner_stop = this.colorStops[0];
			}
			gl.clear(gl.COLOR_BUFFER_BIT);
			
			for (var i = 1; i < this.colorStops.length; i++) {
				ctx._set_zindex();
				
				var x = (this.circle2[0]-this.circle1[0]) * this.colorStops[i-1][0] + this.circle1[0];
				var y = (this.circle2[1]-this.circle1[1]) * this.colorStops[i-1][0] + this.circle1[1];
				var r = (this.circle2[2]-this.circle1[2]) * this.colorStops[i-1][0] + this.circle1[2];
				
				var x2 = (this.circle2[0]-this.circle1[0]) * this.colorStops[i][0] + this.circle1[0];
				var y2 = (this.circle2[1]-this.circle1[1]) * this.colorStops[i][0] + this.circle1[1];
				var r2 = (this.circle2[2]-this.circle1[2]) * this.colorStops[i][0] + this.circle1[2];

				gl.uniform3f(program.circle1Location, x, height-y, r);
				gl.uniform3f(program.circle2Location, x2, height-y2, r2);
				gl.uniform4f(program.color1Location, this.colorStops[i-1][1][0], this.colorStops[i-1][1][1], this.colorStops[i-1][1][2], this.colorStops[i-1][1][3]);
				gl.uniform4f(program.color2Location, this.colorStops[i][1][0], this.colorStops[i][1][1], this.colorStops[i][1][2], this.colorStops[i][1][3]);
				
				gl.drawArrays(gl.TRIANGLE_FAN, 0, vertices.length/2);
			}

			gl.uniform3f(program.circle2Location, inner_circle[0], height - inner_circle[1], inner_circle[2]);
			gl.uniform3f(program.circle1Location, inner_circle[0], height - inner_circle[1], 0);
			gl.uniform4f(program.color1Location, inner_stop[1][0], inner_stop[1][1], inner_stop[1][2], inner_stop[1][3]);
			gl.uniform4f(program.color2Location, inner_stop[1][0], inner_stop[1][1], inner_stop[1][2], inner_stop[1][3]);

			gl.drawArrays(gl.TRIANGLE_FAN, 0, vertices.length/2);
			
			//retore the buffer we were drawing in
			gl.bindTexture(gl.TEXTURE_2D, null);
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);

			return texture;				
		}
	}
	
	var LinearGradient = function(x0, y0, x1, y1) {
		this.colorStops = [];
		this.line = [x1 - x0, y1 - y0];
		this.base = [x0, y0];
		
		//we precaculate |line|^2, as we'll be using it alot
		this.len_sq = Math.pow(this.line[0],2) + Math.pow(this.line[1], 2);
	}
		
	LinearGradient.prototype = {
		addColorStop(offset, color) {
			this.colorStops.push([offset, parseColor(color)]);
			this.colorStops.sort(function(a, b) {
			  return a[0] - b[0];
			});
		},
		_calculate_color(x,y) {
			//project [x,y]-base onto line. proj = [x.y].line / |line|^2 * line;
			var u = ((x - this.base[0]) * this.line[0] + (y - this.base[1]) * this.line[1]) / this.len_sq;
			//now u is our offset
			var prev_stop, next_stop = this.colorStops[0];
			for (var i = this.colorStops.length-1; i >= 0; i--) {	
				if (u > this.colorStops[i][0]) {
					prev_stop = this.colorStops[i];
					next_stop = this.colorStops[i+1];
					break;
				}
			}		
			if (!prev_stop) {
				return next_stop[1];
			} else if (!next_stop) {
				return prev_stop[1];
			} else {
				var w = ((u - prev_stop[0]) / (next_stop[0] - prev_stop[0]))
				var color = [(1-w) * prev_stop[1][0] + (1) * next_stop[1][0], (1-w) * prev_stop[1][1] + w * next_stop[1][1], (1-w) * prev_stop[1][2] + w * next_stop[1][2], (1-w) * prev_stop[1][3] + w * next_stop[1][3]];
				return color;
			}		
		},
		_generateTexture(ctx, width, height) {
			function intersection(box, p, v) {
				//AABB ray intersection, slab method
				var tmin = -999999, tmax = 999999;				
				if (v[0] != 0) {
					var tx1 = (box.x - p[0])/v[0];
					var tx2 = (box.x + box.width - p[0])/v[0];
					tmin = Math.max(tmin, Math.min(tx1, tx2));
					tmax = Math.min(tmax, Math.max(tx1, tx2));
				}
				if (v[1] != 0) {
					var ty1 = (box.x - p[1])/v[1];
					var ty2 = (box.y + box.height - p[1])/v[1];
					tmin = Math.max(tmin, Math.min(ty1, ty2));
					tmax = Math.min(tmax, Math.max(ty1, ty2));
				}
				if (tmax >= tmin) { //tmin != tmax is technically an intersection in the corner, but we don't need that
					var s1 = [p[0] + tmin * v[0], p[1] + tmin * v[1]]
					var s2 = [p[0] + tmax * v[0], p[1] + tmax * v[1]]
					return [s1, s2];
				} else {
					return [];
				}
			}
			
			var line_orth = [-this.line[1], this.line[0]];
			var box = { x:0, y:0, width:width, height:height }	
			
			//find intersections
			var intersections = []
			for (var i = 0; i < this.colorStops.length; i++) {
				var p = [this.base[0] + this.colorStops[i][0] * this.line[0], this.base[1] + this.colorStops[i][0] * this.line[1]]
				var intersection_points = intersection(box, p, line_orth);
				for (var j in intersection_points) {
					intersection_points[j].push(this.colorStops[i][1])
					intersections.push(intersection_points[j]);
				}
			}
			
			//add corners and the points opposite the corner in direction of line_orth
			var corners = [[0,0, this._calculate_color(0,0)], [width,0, this._calculate_color(width,0)], [width,height, this._calculate_color(width,height)], [0,height, this._calculate_color(0,height)]]
			for (var i in corners) {
				var intersection_points = intersection(box, [corners[i][0], corners[i][1]], line_orth);
				for (var j in intersection_points) {
					intersection_points[j].push(corners[i][2])
					intersections.push(intersection_points[j]);
				}
						
			}
			
			//sort in the direction of line
			var _this = this;
			intersections.sort(function(a,b) {
				var comp = ((a[0] - _this.base[0]) * _this.line[0] + (a[1] - _this.base[1]) * _this.line[1])
				          -((b[0] - _this.base[0]) * _this.line[0] + (b[1] - _this.base[1]) * _this.line[1]);
				if (comp != 0) return comp;	
				else {
					comp = a[0] - b[0]
					if (comp != 0) return comp;	
					else {
						return a[1] - b[1]
					}
				}
			});
			
			//make all points unique
			var unique = [intersections[0]];
			for (var i = 1; i < intersections.length; i++) {
				if (intersections[i][0] != intersections[i-1][0] || intersections[i][1] != intersections[i-1][1]) {
					unique.push(intersections[i]);
				}
			}
			intersections = unique;
			
			//the result here is that from a bunch of corners and intersection points, we've built something we can
			//draw as a gl.TRIANGLE_STRIP.
			
			//flatten
			var vertices = [];
			var colors = [];
			for (var i in intersections) {
				vertices.push(intersections[i][0], intersections[i][1]);
				colors.push(intersections[i][2][0], intersections[i][2][1], intersections[i][2][2], intersections[i][2][3]);
			}

			//prepare texture
			var gl = ctx.gl;
			
			var framebuffer = gl.createFramebuffer();
			gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
			framebuffer.width = width;
			framebuffer.height = height;
			
			var texture = gl.createTexture();		
			gl.bindTexture(gl.TEXTURE_2D, texture);
			
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, framebuffer.width, framebuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
			gl.bindTexture(gl.TEXTURE_2D, null);
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);

			var tempFrameBuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);
			gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
						
			//draw
			var program = ctx._select_program(ctx.gradient_program);
			
			gl.bindBuffer(gl.ARRAY_BUFFER, program.vertexBuffer);			
			gl.vertexAttribPointer(program.positionLocation, 2, gl.FLOAT, false, 0, 0);	
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);	
			
			gl.bindBuffer(gl.ARRAY_BUFFER, program.colorBuffer);
			gl.vertexAttribPointer(program.colorLocation, 4, gl.FLOAT, false, 0, 0);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);			

			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertices.length/2);

			//retore the buffer we were drawing in
			gl.bindFramebuffer(gl.FRAMEBUFFER, tempFrameBuffer);

			return texture;				
		}
	}

	var ImageData = function() {}
	
	var Path2D = function() {
		this.paths = [[]];
		this.closed = [false];
	}

	Path2D.prototype = {
		addPath(paths, transform) {
			for (var i in paths) {
				var path = paths[i];
				var new_path = [];
				if (!(typeof transform === undefined)) {
					for (var j = 0; j < path.length; j+=2) {
						var point_tranformed = vectSvgTransform(transform, [path[j], path[j+1]]);
						new_path.push(point_tranformed[0], point_tranformed[1]);
					}
				} else {
					for (var j in path)
						new_path.push(path[j]);
				}
				this.paths.push(new_path);
				this.closed.push(paths.closed[i]);
			}
		},
		closePath() {
			if (this.paths.length > 0) {
				var currentPath = this.paths[this.paths.length-1];
				if (currentPath.length >= 2) {
					this.closed[this.paths.length-1] = true;
					this.paths.push([currentPath[0], currentPath[1]]);
					this.closed.push(false);
				}		
			}
		},
		moveTo(x,y) {
			if (this.paths[this.paths.length-1].length == 0) {
				this.paths[this.paths.length-1].push(x,y);
			} else {
				this.paths.push([x,y]);
				this.closed.push(false);
			}
		},
		lineTo(x,y) {
			var currentPath = this.paths[this.paths.length-1];
			currentPath.push(x,y);
		},
		bezierCurveTo(x1, y1, x2, y2, x3, y3) {
			if (!isFinite(x1) || !isFinite(y1) || !isFinite(x2) || !isFinite(y2) || !isFinite(x3) || !isFinite(y3)) return;
			
			var currentPath = this.paths[this.paths.length-1];
			var x0 = currentPath[currentPath.length-2], y0 = currentPath[currentPath.length-1];
			function calc(t) {
				//https://en.wikipedia.org/wiki/B%C3%A9zier_curve#Cubic_B.C3.A9zier_curves
				var coeff = [Math.pow(1-t, 3), 3 * Math.pow(1-t, 2) * t, 3 * (1-t) * Math.pow(t,2), Math.pow(t,3)];
				return [coeff[0] * x0 + coeff[1] * x1 + coeff[2] * x2 + coeff[3] * x3, coeff[0] * y0 + coeff[1] * y1 + coeff[2] * y2 + coeff[3] * y3];
			}
			var length_estimate =  Math.sqrt(Math.pow(x3 - x2, 2) +  Math.pow(y3 - y2, 2))
								 + Math.sqrt(Math.pow(x2 - x1, 2) +  Math.pow(y2 - y1, 2))
								 + Math.sqrt(Math.pow(x1 - x0, 2) +  Math.pow(y1 - y0, 2));							 
			var step = BEZIER_CURVE_RESOLUTION / length_estimate;
			step = Math.min(step, 0.5); //do at least 1 step
			
			for (var t = step; t < 1; t+=step) {
				var point = calc(t);
				currentPath.push(point[0], point[1]);
			}
			currentPath.push(x3, y3);
		},
		quadraticCurveTo(x1, y1, x2, y2) {
			if (!isFinite(x1) || !isFinite(y1) || !isFinite(x2) || !isFinite(y2)) return;
			var currentPath = this.paths[this.paths.length-1];
			var x0 = currentPath[currentPath.length-2], y0 = currentPath[currentPath.length-1];
			
			function calc(t) {
				//https://en.wikipedia.org/wiki/B%C3%A9zier_curve#Quadratic_B.C3.A9zier_curves
				var coeff = [Math.pow(1-t, 2), 2 * (1-t) * t, Math.pow(t,2)];
				return [coeff[0] * x0 + coeff[1] * x1 + coeff[2] * x2, coeff[0] * y0 + coeff[1] * y1 + coeff[2] * y2];
			}
			var length_estimate =  Math.sqrt(Math.pow(x2 - x1, 2) +  Math.pow(y2 - y1, 2))
								 + Math.sqrt(Math.pow(x1 - x0, 2) +  Math.pow(y1 - y0, 2));
					 
			var step = BEZIER_CURVE_RESOLUTION / length_estimate;
			step = Math.min(step, 0.5); //do at least 1 step
			
			for (var t = step; t < 1; t+=step) {
				var point = calc(t);
				currentPath.push(point[0], point[1]);
			}
			currentPath.push(x2, y2);			
		},
		ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, anticlockwise) {
			if (startAngle == endAngle) return;
			var fullCircle = anticlockwise ? Math.abs(startAngle-endAngle) >= (2*Math.PI) : Math.abs(endAngle-startAngle) >= (2*Math.PI);
			
			//bring angles all in [0, 2*PI] range
			startAngle = startAngle % (2 * Math.PI);
			endAngle = endAngle % (2 * Math.PI);
			if (startAngle < 0) startAngle += 2*Math.PI;
			if (endAngle < 0) endAngle += 2*Math.PI;

			if (startAngle>=endAngle) {
				endAngle += 2 * Math.PI;
			}

			var diff = endAngle - startAngle;

			var direction = 1;
			if (anticlockwise) {
				direction = -1;			
				diff = 2*Math.PI - diff;
			}
			
			if (fullCircle) diff = 2*Math.PI;
			
			var length = (diff * radiusX + diff * radiusY) / 2; 
			var nr_of_interpolation_points = length / ARC_RESOLUTION;		
			var dangle = diff / nr_of_interpolation_points;

			var currentPath = this.paths[this.paths.length-1];
			
			var angle = startAngle;
			var cos_rotation = Math.cos(rotation);
			var sin_rotation = Math.sin(rotation);
			for (var j = 0; j < nr_of_interpolation_points; j++) {				
				var x1 = radiusX * Math.cos(angle);
				var y1 = radiusY * Math.sin(angle);
				var x2 = x + x1 * cos_rotation - y1 * sin_rotation;
				var y2 = y + x1 * sin_rotation + y1 * cos_rotation;		
				currentPath.push(x2, y2);
				angle += direction * dangle;
			}
			var x1 = radiusX * Math.cos(endAngle);
			var y1 = radiusY * Math.sin(endAngle);
			currentPath.push(x + x1 * cos_rotation - y1 * sin_rotation, y + x1 * sin_rotation + y1 * cos_rotation);
		},
		arc(x, y, radius, startAngle, endAngle, anticlockwise) {			
			//bring angles all in [0, 2*PI] range
			if (startAngle == endAngle) return;
			var fullCircle = anticlockwise ? Math.abs(startAngle-endAngle) >= (2*Math.PI) : Math.abs(endAngle-startAngle) >= (2*Math.PI);

			startAngle = startAngle % (2 * Math.PI);
			endAngle = endAngle % (2 * Math.PI);
			
			if (startAngle < 0) startAngle += 2*Math.PI;
			if (endAngle < 0) endAngle += 2*Math.PI;

			if (startAngle>=endAngle) {
				endAngle += 2 * Math.PI;
			}
			
			var diff = endAngle - startAngle;
			var direction = 1;
			if (anticlockwise) {
				direction = -1;			
				diff = 2*Math.PI - diff;
			}
			
			if (fullCircle) diff = 2*Math.PI;
			
			var length = diff * radius;
			var nr_of_interpolation_points = length / ARC_RESOLUTION;		
			var dangle = diff / nr_of_interpolation_points;
			
			var currentPath = this.paths[this.paths.length-1];

			var angle = startAngle;
			for (var j = 0; j < nr_of_interpolation_points; j++) {
				currentPath.push(x + radius * Math.cos(angle), y + radius * Math.sin(angle));
				angle += direction * dangle;
			}
			currentPath.push(x + radius * Math.cos(endAngle), y + radius * Math.sin(endAngle));
						
		},
		arcTo(x1, y1, x2, y2, radius) {
			var currentPath = this.paths[this.paths.length-1];
			var x0 = currentPath[currentPath.length-2], y0 = currentPath[currentPath.length-1];
			
			//a = -incoming vector, b = outgoing vector to x1, y1
			var a = [x0 - x1, y0 - y1];
			var b = [x2 - x1, y2 - y1];
			
			//normalize
			var l_a = Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2));
			var l_b = Math.sqrt(Math.pow(b[0], 2) + Math.pow(b[1], 2));
			a[0] /= l_a; a[1] /= l_a; b[0] /= l_b; b[1] /= l_b;
			var angle = Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0]);
			
			//work out tangent points using tan(θ) = opposite / adjacent; angle/2 because hypotenuse is the bisection of a,b
			var tan_angle_div2 = Math.tan(angle/2);
			var adj_l = (radius/tan_angle_div2);
			
			var tangent_point1 =  [x1 + a[0] * adj_l, y1 + a[1] * adj_l];
			var tangent_point2 =  [x1 + b[0] * adj_l, y1 + b[1] * adj_l];

			currentPath.push(tangent_point1[0], tangent_point1[1])
			
			var bisec = [(a[0] + b[0]) / 2.0, (a[1] + b[1]) / 2.0];
			var bisec_l = Math.sqrt(Math.pow(bisec[0], 2) + Math.pow(bisec[1], 2));
			bisec[0] /= bisec_l; bisec[1] /= bisec_l;
				
			var hyp_l = Math.sqrt(Math.pow(radius,2) + Math.pow(adj_l,2))
			var center = [x1 + hyp_l * bisec[0], y1 + hyp_l * bisec[1]];
			
			var startAngle = Math.atan2(tangent_point1[1] - center[1], tangent_point1[0] - center[0]);
			var endAngle = Math.atan2(tangent_point2[1] - center[1], tangent_point2[0] - center[0]);
			
			this.arc(center[0], center[1], radius, startAngle, endAngle)
			
			currentPath.push(tangent_point2[0], tangent_point2[1])		
		},
		rect(x, y, width, height) {
			this.paths.push([x, y, x+width, y, x+width, y+height, x, y+height], [x, y]);
			this.closed.push(true, false);
		},
	}
	
	var CanvasRenderingContext2D = function(webgl_context) {
		this.gl = webgl_context;
		this._set_defaults()
		var gl = this.gl;

		this.currentZIndex = 0;
		
		function create_program(vertex_shader_src, fragment_shader_src) {
			var vertexShader = gl.createShader(gl.VERTEX_SHADER);
			gl.shaderSource(vertexShader , vertex_shader_src);
			gl.compileShader(vertexShader);	

			// Check the compile status
			var compiled = gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS);
			if (!compiled) {
				// Something went wrong during compilation; get the error
				var lastError = gl.getShaderInfoLog(vertexShader);
				console.log("*** Error compiling shader '" + vertexShader + "':" + lastError);
				gl.deleteShader(vertexShader);
				return null;
			}
			
			var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
			gl.shaderSource(fragmentShader, fragment_shader_src);
			gl.compileShader(fragmentShader);

			// Check the compile status
			var compiled = gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS);
			if (!compiled) {
				// Something went wrong during compilation; get the error
				var lastError = gl.getShaderInfoLog(fragmentShader);
				console.log("*** Error compiling shader '" + fragmentShader + "':" + lastError);
				gl.deleteShader(fragmentShader);
				return null;
			}
			
			var program = gl.createProgram();
			gl.attachShader(program, vertexShader);
			gl.attachShader(program, fragmentShader);
			gl.linkProgram(program);

			return program;
		}
		
		//used for regular stroke/fill with no dash pattern and fixed color
		this.simple_program = create_program(simple_draw_vertex_shader, simple_draw_fragment_shader);
		//used for regular stroke/fill with no dash pattern and a texture the same size as the canvas for color
		this.texture_program = create_program(texture_draw_vertex_shader, texture_draw_fragment_shader);
		//used for regular stroke/fill with per-vertex color
		this.gradient_program = create_program(gradient_vertex_shader, gradient_fragment_shader)
		//used for regular stroke/fill with no dash pattern but per-vertex color
		this.circle_program = create_program(simple_draw_vertex_shader, circle_gradient_fragment_shader)
		//used for loading images
		this.image_program = create_program(image_draw_vertex_shader2, image_draw_fragment_shader2);
		//applies guassian blur
		this.shadow_program = create_program(shadow_vertex_shader, shadow_fragment_shader);	
		//Accepts texture and location positions and maps them
		this.direct_texture_program = create_program(direct_texture_draw_vertex_shader, texture_draw_fragment_shader);	

		this.projectionMatrix = [ //flips y, shift scale from [width, height] to [-1, 1]
			2/gl.canvas.width,  0,                   0, 0,
			0,                  -2/gl.canvas.height, 0, 0,
			0,                  0,                   2, 0,
			-1,                 1,                   0, 1
	    ];
		
		//init image program
		var program = this.image_program;
		gl.useProgram(this.image_program);

		program.transformLocation = gl.getUniformLocation(program, "u_matrix");
		gl.uniformMatrix4fv(program.transformLocation, false, this.projectionMatrix);
		program.textureLocation = gl.getUniformLocation(program, "texture");
		program.zindexLocation = gl.getUniformLocation(program, "u_zindex");
		program.globalAlphaLocation = gl.getUniformLocation(program, "u_global_alpha");
		gl.uniform1f(program.globalAlphaLocation, this.globalAlpha);
		
		program.positionLocation = gl.getAttribLocation(program, "a_position");
		program.vertexBuffer = gl.createBuffer();
		program.indexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, program.vertexBuffer);
		gl.enableVertexAttribArray(program.positionLocation);
		gl.vertexAttribPointer(program.positionLocation, 2, gl.FLOAT, false, 0, 0);	
		
		program.texCoordLocation = gl.getAttribLocation(program, "a_texcoord");
		program.texCoordBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, program.texCoordBuffer);
		gl.enableVertexAttribArray(program.texCoordLocation);
		gl.vertexAttribPointer(program.texCoordLocation, 2, gl.FLOAT, false, 0, 0);	
		
		//init gradient draw program
		program = this.gradient_program;
		gl.useProgram(this.gradient_program);
		
		program.zindexLocation = gl.getUniformLocation(program, "u_zindex");
		program.globalAlphaLocation = gl.getUniformLocation(program, "u_global_alpha");
		gl.uniform1f(program.globalAlphaLocation, this.globalAlpha);
		program.transformLocation = gl.getUniformLocation(program, "u_matrix");
		gl.uniformMatrix4fv(program.transformLocation, false, this.projectionMatrix);

		program.positionLocation = gl.getAttribLocation(program, "a_position");
		program.vertexBuffer = gl.createBuffer();
		program.indexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, program.vertexBuffer);
		gl.enableVertexAttribArray(program.positionLocation);
		gl.vertexAttribPointer(program.positionLocation, 2, gl.FLOAT, false, 0, 0);	

		program.colorLocation = gl.getAttribLocation(program, "a_color");
		program.colorBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, program.colorBuffer);
		gl.enableVertexAttribArray(program.colorLocation);
		gl.vertexAttribPointer(program.colorLocation, 4, gl.FLOAT, false, 0, 0);	
		
		//init simple draw program
		program = this.simple_program;
		gl.useProgram(this.simple_program);
		
		program.colorLocation = gl.getUniformLocation(program, "u_color");
		gl.uniform4f(program.colorLocation, 0, 0, 0, 1);
		program.zindexLocation = gl.getUniformLocation(program, "u_zindex");
		program.globalAlphaLocation = gl.getUniformLocation(program, "u_global_alpha");
		gl.uniform1f(program.globalAlphaLocation, this.globalAlpha);		
		program.transformLocation = gl.getUniformLocation(program, "u_matrix");
		gl.uniformMatrix4fv(program.transformLocation, false, this.projectionMatrix);

		program.positionLocation = gl.getAttribLocation(program, "a_position");
		program.vertexBuffer = gl.createBuffer();
		program.indexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, program.vertexBuffer);
		gl.enableVertexAttribArray(program.positionLocation);
		gl.vertexAttribPointer(program.positionLocation, 2, gl.FLOAT, false, 0, 0);			
	
		//init circle gradient program
		program = this.circle_program;
		gl.useProgram(this.circle_program);
		
		program.zindexLocation = gl.getUniformLocation(program, "u_zindex");
		program.globalAlphaLocation = gl.getUniformLocation(program, "u_global_alpha");
		gl.uniform1f(program.globalAlphaLocation, this.globalAlpha);
		program.transformLocation = gl.getUniformLocation(program, "u_matrix");
		gl.uniformMatrix4fv(program.transformLocation, false, this.projectionMatrix);

		program.positionLocation = gl.getAttribLocation(program, "a_position");
		program.vertexBuffer = gl.createBuffer();
		program.indexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, program.vertexBuffer);
		gl.enableVertexAttribArray(program.positionLocation);
		gl.vertexAttribPointer(program.positionLocation, 2, gl.FLOAT, false, 0, 0);	

		program.circle1Location = gl.getUniformLocation(program, "circle1");
		program.circle2Location = gl.getUniformLocation(program, "circle2");	
		program.color1Location = gl.getUniformLocation(program, "color1");		
		program.color2Location = gl.getUniformLocation(program, "color2");
		
		//init texture draw program
		program = this.texture_program;
		gl.useProgram(this.texture_program);
		
		program.zindexLocation = gl.getUniformLocation(program, "u_zindex");
		program.globalAlphaLocation = gl.getUniformLocation(program, "u_global_alpha");
		gl.uniform1f(program.globalAlphaLocation, this.globalAlpha);
		program.transformLocation = gl.getUniformLocation(program, "u_matrix");
		gl.uniformMatrix4fv(program.transformLocation, false, this.projectionMatrix);
		program.textureLocation = gl.getUniformLocation(program, "texture");
		
		program.positionLocation = gl.getAttribLocation(program, "a_position");
		program.vertexBuffer = gl.createBuffer();
		program.indexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, program.vertexBuffer);
		gl.enableVertexAttribArray(program.positionLocation);
		gl.vertexAttribPointer(program.positionLocation, 2, gl.FLOAT, false, 0, 0);	

		//init direct texture draw program
		program = this.direct_texture_program;
		gl.useProgram(this.direct_texture_program);
		
		program.zindexLocation = gl.getUniformLocation(program, "u_zindex");
		program.globalAlphaLocation = gl.getUniformLocation(program, "u_global_alpha");
		gl.uniform1f(program.globalAlphaLocation, this.globalAlpha);
		program.transformLocation = gl.getUniformLocation(program, "u_matrix");
		gl.uniformMatrix4fv(program.transformLocation, false, this.projectionMatrix);
		program.textureLocation = gl.getUniformLocation(program, "texture");
		
		program.textureCoordsLocation = gl.getAttribLocation(program, "a_texcoord");
		program.textureCoordsBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, program.textureCoordsBuffer);
		gl.enableVertexAttribArray(program.textureCoordsLocation);
		gl.vertexAttribPointer(program.textureCoordsLocation, 2, gl.FLOAT, false, 0, 0);
		
		program.positionLocation = gl.getAttribLocation(program, "a_position");
		program.vertexBuffer = gl.createBuffer();
		program.indexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, program.vertexBuffer);
		gl.enableVertexAttribArray(program.positionLocation);
		gl.vertexAttribPointer(program.positionLocation, 2, gl.FLOAT, false, 0, 0);	

		
		//init shadow program
		program = this.shadow_program;
		gl.useProgram(this.shadow_program);
		
		program.textureLocation = gl.getUniformLocation(program, "texture");
		program.directionLocation = gl.getUniformLocation(program, "u_direction");
		program.gaussCoeffLocation = gl.getUniformLocation(program, "u_gauss_coeff");
		program.shadowColorLocation = gl.getUniformLocation(program, "u_shadow_color");
		program.zindexLocation = gl.getUniformLocation(program, "u_zindex");
		program.globalAlphaLocation = gl.getUniformLocation(program, "u_global_alpha");
		gl.uniform1f(program.globalAlphaLocation, this.globalAlpha);
		program.offsetLocation = gl.getUniformLocation(program, "u_offset");

		program.positionLocation = gl.getAttribLocation(program, "a_position");
		program.vertexBuffer = gl.createBuffer();
		program.indexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, program.vertexBuffer);
		gl.enableVertexAttribArray(program.positionLocation);
		gl.vertexAttribPointer(program.positionLocation, 2, gl.FLOAT, false, 0, 0);	
		
		//init some other random webgl stuff
		gl.enable(gl.DEPTH_TEST);
		gl.depthFunc(gl.LESS);		
		gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		gl.enable(gl.BLEND);

		//TODO: this doesn't look pretty, does it
		var _this = this;
		var widthProp = Object.getOwnPropertyDescriptor(gl.canvas.__proto__, 'width');
		var heightProp = Object.getOwnPropertyDescriptor(gl.canvas.__proto__, 'height');
		Object.defineProperty(gl.canvas, "width", {
			set: function myProperty(new_width) {
				widthProp.set.call(gl.canvas, new_width);
				_this._resize();
			},
			get: function() {
				return widthProp.get.call(gl.canvas);
			}
		});
		Object.defineProperty(gl.canvas, "height", {
			set: function myProperty(new_height) {			
				heightProp.set.call(gl.canvas, new_height);
				_this._resize();
			},
			get: function() {
				return heightProp.get.call(gl.canvas);
			}
		});
			
	}	
	
	CanvasRenderingContext2D.prototype = {
		_set_defaults() {
			this.globalAlpha = 1;
			this.globalCompositeOperation = "source-over";	
			this.strokeStyle = "#000";
			this.strokeStyleRGBA = [0,0,0,1];	
			this.fillStyle = "#000";
			this.fillStyleRGBA = [0,0,0,1];
			this.shadowColor = "rgba(0, 0, 0, 0.0)";
			this.shadowColorRGBA = [0,0,0,0];
			this.shadowOffsetX = 0;
			this.shadowOffsetY = 0;
			this.shadowBlur = 0;
			this.lineWidth = 1.0;
			this.lineWidthSupported = true;
			this.font = "10px sans-serif";
			this.lineJoin = "miter";
			this.miterLimit = 10;
			this.textAlign = "start";
			this.lineCap = 'butt'
			this.lineDash = [];
			this.lineDashOffset = 0;
			this.textBaseline = 'alphabetic';
			this.direction = 'inherit';
			this.path = new Path2D();
			this._transform = [1, 0, 0, 0,
							   0, 1, 0, 0,
							   0, 0, 1, 0,
							   0, 0, 0, 1];
			this._savedWidth = this.width;
			this._savedHeight = this.height;
		},
		setTransform(a, b, c, d, e, f) {
			this._transform = [a,b,0,0,
							   c,d,0,0,
							   0,0,1,0,
							   e,f,0,1];
		},
		rotate(angle) {
			var rotation = [Math.cos(angle), Math.sin(angle), 0, 0,
							-Math.sin(angle), Math.cos(angle), 0, 0,
							0,0,1,0,
							0,0,0,1];
			this._transform = matrixMultiply(rotation, this._transform);
		},
		scale(x, y) {
			var scale = [x, 0, 0, 0,
						 0, y, 0, 0,
						 0, 0, 1, 0,
						 0, 0, 0, 1];
			this._transform = matrixMultiply(scale, this._transform);
		},
		translate(x, y) {
			var translate = [1, 0, 0, 0,
						     0, 1, 0, 0,
						     0, 0, 1, 0,
						     x, y, 0, 1];
			this._transform = matrixMultiply(translate, this._transform);
		},
		transform(a, b, c, d, e, f) {
			var transform = [a, b, 0, 0,
						     c, d, 0, 0,
						     0, 0, 1, 0,
						     e, f, 0, 1];	
			this._transform = matrixMultiply(transform, this._transform);
		},
		resetTransform() {
			this._transform = [1, 0, 0, 0,
							   0, 1, 0, 0,
							   0, 0, 1, 0,
							   0, 0, 0, 1];
		},
		set currentTransform(matrix) {
			this._transform = [matrix.a, matrix.b, 0, 0,
							   matrix.c, matrix.d, 0, 0,
							   0, 0, 1, 0,
							   matrix.e, matrix.f, 0, 1];
		},
		get currentTransform() {
			return new SVGMatrix(this._transform[0], this._transform[1], this._transform[4],
								 this._transform[5], this._transform[12], this._transform[13]);
		},
		save() {
			var saveState = {_transform:this._transform, clipPlane:this.clipPlane, strokeStyleRGBA:this.strokeStyleRGBA, fillStyleRGBA:this.fillStyleRGBA, _strokeStyle:this._strokeStyle, _fillStyle:this._fillStyle, globalAlpha:this.globalAlpha, lineWidth:this.lineWidth,
							  lineCap:this.lineCap, lineJoin:this.lineJoin, miterLimit:this.miterLimit,lineDashOffset:this.lineDashOffset, shadowOffsetX:this.shadowOffsetX, 
							  shadowOffsetY:this.shadowOffsetY, shadowBlur:this.shadowBlur, _shadowColorRGBA:this._shadowColorRGBA, _shadowColor:this._shadowColor, filter:this.filter, globalCompositeOperation:this.globalCompositeOperation, 
							  font:this.font, textAlign:this.textAlign, textBaseline:this.textBaseline, direction:this.direction, imageSmoothingEnabled:this.imageSmoothingEnabled,
							  imageSmoothingQuality:this.imageSmoothingQuality, lineDash:this.lineDash};
			if (this.saveStack) {
				this.saveStack.push(saveState);
			} else {
				this.saveStack = [saveState];
			}
			  
		},
		restore() {
			if (this.saveStack && this.saveStack.length > 0) {
				var s = this.saveStack.pop();
				this._transform = s._transform;
				this.clipPlane = s.clipPlane;
				this.strokeStyleRGBA = s.strokeStyleRGBA;
				this.fillStyleRGBA = s.fillStyleRGBA;
				this._strokeStyle = s._strokeStyle;
				this._fillStyle = s._fillStyle;
				this.globalAlpha = s.globalAlpha;
				this.lineWidth = s.lineWidth;
				this.lineCap = s.lineCap;
				this.lineJoin = s.lineJoin;
				this.miterLimit = s.miterLimit;
				this.lineDashOffset = s.lineDashOffset;
				this.shadowOffsetX = s.shadowOffsetX;
				this.shadowOffsetY = s.shadowOffsetY;
				this._shadowColor = s._shadowColor;
				this._shadowColorRGBA = s._shadowColorRGBA;
				this.shadowBlur = s.shadowBlur;
				this.filter = s.filter;
				this.globalCompositeOperation = s.globalCompositeOperation;
				this.font = s.font;
				this.textAlign = s.textAlign;
				this.textBaseline = s.textBaseline;
				this.direction = s.direction;
				this.imageSmoothingEnabled = s.imageSmoothingEnabled;
				this.imageSmoothingQuality = s.imageSmoothingQuality;
				this.lineDash = s.lineDash;
			}
		},
		getImageData(sx, sy, sw, sh) {
			var gl = this.gl;
			
			var data = this.createImageData(sw, sh)
			
			var buffer = new Uint8Array(sw * sh * 4);
			gl.readPixels(sx, this.height-sh-sy, sw, sh, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
			
			//reverse rows
			for (var i = 0; i < sh; i++) {
				for (var j = 0; j < sw; j++) {
					data.data[(i*sw + j)*4] = buffer[((sh-i-1)*sw + j)*4];
					data.data[(i*sw + j)*4+1] = buffer[((sh-i-1)*sw + j)*4+1];
					data.data[(i*sw + j)*4+2] = buffer[((sh-i-1)*sw + j)*4+2];
					data.data[(i*sw + j)*4+3] = buffer[((sh-i-1)*sw + j)*4+3];
				}
			}
			return data;
		},
		putImageData(imagedata, dx, dy, x, y, w, h) {
			var gl = this.gl;
			
			x = (x === undefined) ? 0 : x;
			y = (y === undefined) ? 0 : y;
			w = (w === undefined) ? imagedata.width : w;
			h = (h === undefined) ? imagedata.height : h;

			var iw = imagedata.width, ih = imagedata.height;
			
			var buffer;
			if (w != iw || h != ih) {
				//extract points
				buffer = new Uint8Array(w * h * 4);			
				for (var i = 0; i < h; i++) {
					for (var j = 0; j < w; j++) {
						buffer[(i*w + j)*4] = imagedata.data[((i+y)*iw + x + j)*4];
						buffer[(i*w + j)*4+1] = imagedata.data[((i+y)*iw + x + j)*4+1];
						buffer[(i*w + j)*4+2] = imagedata.data[((i+y)*iw + x + j)*4+2];
						buffer[(i*w + j)*4+3] = imagedata.data[((i+y)*iw + x + j)*4+3];
					}
				}
			} else {
				//we can just use it directly				
				if (!(imagedata.data instanceof Uint8Array)) {
					buffer = new Uint8Array(imagedata.data);
				} else {
					buffer = imagedata.data;
				}
			}					

			var program = this._select_program(this.direct_texture_program);
					
			var texture = gl.createTexture();
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
			gl.uniform1i(program.textureLocation, 0);
			
			var transform = matrixMultiply(this._transform, this.projectionMatrix);
			gl.uniformMatrix4fv(program.transformLocation, false, transform);
						
			gl.uniform1f(program.globalAlphaLocation, this.globalAlpha);
			this._set_zindex();
			
			this.__prepare_clip();
			gl.bindBuffer(gl.ARRAY_BUFFER, program.textureCoordsBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,0,1,0,1,1,0,1]), gl.STATIC_DRAW);
			gl.vertexAttribPointer(program.textureCoordsLocation, 2, gl.FLOAT, false, 0, 0);	
			gl.bindBuffer(gl.ARRAY_BUFFER, program.vertexBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([dx+x, dy+y, dx+x+w, dy+y, dx+x+w, dy+y+h, dx+x, dy+y+h]), gl.STATIC_DRAW);
			gl.vertexAttribPointer(program.positionLocation, 2, gl.FLOAT, false, 0, 0);	
			gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
			this.__execute_clip(this.currentZIndex)
			this.currentZIndex -=EPSILON;
		},
		createImageData(width, height) {
			if (height === undefined) {
				height = this.height;
				width = this.width;
			}
			
			var data = new ImageData();
			data.data = new Uint8ClampedArray(width * height * 4);
			data.width = width;
			data.height = height;
			
			return data;
		},
		_set_zindex() {
			var gl = this.gl;
			this.currentZIndex-=EPSILON;
			var program = gl.getParameter(gl.CURRENT_PROGRAM);
			gl.uniform1f(program.zindexLocation, this.currentZIndex);
		},
		beginPath() {
			this.path = new Path2D();
		},
		closePath() {
			this.path.closePath();
		},
		moveTo(x,y) {
			this.path.moveTo(x,y);
		},
		lineTo(x,y) {
			this.path.lineTo(x,y);
		},
		bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
			this.path.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
		},
		quadraticCurveTo(cpx, cpy, x, y) {
			this.path.quadraticCurveTo(cpx, cpy, x, y);
		},
		arc(x, y, radius, startAngle, endAngle, anticlockwise) {
			this.path.arc(x, y, radius, startAngle, endAngle, anticlockwise);
		},
		ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, anticlockwise) {
			this.path.ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, anticlockwise);
		},
		arcTo(x1, y1, x2, y2, radiusX, radiusY, rotation) {
			this.path.arcTo(x1, y1, x2, y2, radiusX, radiusY, rotation);
		},
		rect(x, y, width, height) {
			this.path.rect(x, y, width, height);
		},
		stroke(path) {
			var _path = this.path;
			if(path) {  
				_path = path;
			}
			
			var gl = this.gl;
			
			if (!this.textureManager) {
				this.textureManager = new TextureManager(gl, MAX_TEXTURE_SIZE, MAX_TEXTURE_SIZE);
			}
			
			var tex_offsets;
			var flat_color = true;
			if (this.strokeStyleRGBA instanceof WebGLTexture) {
				this.strokeStyleRGBA.width = this.width;
				this.strokeStyleRGBA.height = this.height;
				this.textureManager.set_texture_from_texture(this.strokeStyleRGBA, this);
				flat_color = false;
				tex_offsets = [this.strokeStyleRGBA.nodes[0].rect.x, this.strokeStyleRGBA.nodes[0].rect.y];
			} else {
				tex_offsets = this.textureManager.set_color(this.strokeStyleRGBA);
			}
			
			if (!_path.stroke_lineWidth || _path.stroke_lineWidth != this.lineWidth) {
				//buffer is only correct for a certain linewidth
				_path.stroke_buffered = 0;
				_path.stroke_lineWidth = this.lineWidth; 
				_path.stroke_texPoints = new TypedArray(Float32Array);
				_path.stroke_vertices = new TypedArray(Float32Array);
				_path.stroke_indices = new TypedArray(Uint16Array);
			}
			
			for (;_path.stroke_buffered < _path.paths.length; _path.stroke_buffered++) {
				var i = _path.stroke_buffered;
				var currentPath = _path.paths[i];
				if (currentPath.length > 2) {
					this.__strokePath(currentPath, _path.closed[i], _path.stroke_vertices, _path.stroke_indices);
					if (flat_color) {
						for (var j = _path.stroke_texPoints.length; j < _path.stroke_vertices.length; j+=2) {
							_path.stroke_texPoints.push((tex_offsets[0]+0.5)/MAX_TEXTURE_SIZE, (tex_offsets[1]+0.5)/MAX_TEXTURE_SIZE);
						}
					} else {
						for (var j = _path.stroke_texPoints.length; j < _path.stroke_vertices.length; j+=2) {
							_path.stroke_texPoints.push((tex_offsets[0]+_path.stroke_vertices.b[j])/MAX_TEXTURE_SIZE, 
													  (tex_offsets[1]+this.height-_path.stroke_vertices.b[j+1])/MAX_TEXTURE_SIZE);
						}
					}
				}
			}
			this.__draw(_path.stroke_vertices, _path.stroke_indices, _path.stroke_texPoints);	
		},
		clip(path) {
			var _path = this.path;
			if(path) {  
				_path = path;
			}		
			if (!this.clipPlane) {
				this.clipPlane = [];
			}
			
			for (var i in _path.paths) {		
				var currentPath = _path.paths[i];
				var transformedPath = [];
				
				for (var j = 0; j < currentPath.length; j+=2) {
					var tranformed = vectTransform(this._transform, [currentPath[j], currentPath[j+1]]);
					transformedPath.push(tranformed[0], tranformed[1])
				}
				
				var closed = transformedPath[0] == transformedPath[transformedPath.length-2] && transformedPath[1] == transformedPath[transformedPath.length-1];			
				if (!closed) {
					transformedPath.push(transformedPath[0],  transformedPath[1]);
				}			
				
				var triangles = earcut(transformedPath);
				for (var i = 0; i < triangles.length; i+=3) {
					this.clipPlane.push(transformedPath[triangles[i]*2], transformedPath[triangles[i]*2+1]);
					this.clipPlane.push(transformedPath[triangles[i+1]*2], transformedPath[triangles[i+1]*2+1]);
					this.clipPlane.push(transformedPath[triangles[i+2]*2], transformedPath[triangles[i+2]*2+1]);
				}
			}
		},
		resetClip() {
			delete this.clipPlane;
			delete this.clipFramebuffer;
			delete this.clipTexture
		},
		__prepare_clip() {
			if (this.clipPlane) {
				var gl = this.gl;
				gl.activeTexture(gl.TEXTURE5);
				if (!this.clipFramebuffer) {
					gl.activeTexture(gl.TEXTURE5);
					this.clipFramebuffer = gl.createFramebuffer();
					gl.bindFramebuffer(gl.FRAMEBUFFER, this.clipFramebuffer);
					this.clipFramebuffer.width = this.width;
					this.clipFramebuffer.height = this.height;					
					this.clipTexture = gl.createTexture();		
					gl.bindTexture(gl.TEXTURE_2D, this.clipTexture);
					gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.clipFramebuffer.width, this.clipFramebuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
					gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.clipTexture, 0);
					gl.clearColor(0, 0, 0, 0);
				} else {
					gl.activeTexture(gl.TEXTURE5);					
					gl.bindFramebuffer(gl.FRAMEBUFFER, this.clipFramebuffer);
					gl.bindTexture(gl.TEXTURE_2D, this.clipTexture);
					gl.clear(gl.COLOR_BUFFER_BIT);
				}
			}
		},
		__execute_clip(z_index) {
			var gl = this.gl;
			if (this.clipPlane && this.clipPlane.length > 0 ) {			
				var program = this._select_program(this.texture_program);
				gl.bindFramebuffer(gl.FRAMEBUFFER, null);		
				
				gl.activeTexture(gl.TEXTURE5);
				gl.bindTexture(gl.TEXTURE_2D, this.clipTexture);
				gl.uniform1i(program.textureLocation, 5);	
				
				gl.uniformMatrix4fv(program.transformLocation, false, this.projectionMatrix);				
				gl.vertexAttribPointer(program.positionLocation, 2, gl.FLOAT, false, 0, 0);	
			
				gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.clipPlane), gl.STATIC_DRAW);
				
				gl.uniform1f(program.zindexLocation, z_index);		
				gl.drawArrays(gl.TRIANGLES, 0, this.clipPlane.length/2);
			}
			gl.bindTexture(gl.TEXTURE_2D, null);
		},		
		isPointInPath(path, x, y) {
			//works but I wouldn't recommend using it a whole lot, cause it's sloooow
			//It triangulates and then checks every triangle
			var _path, _x, _y;
			if(path && path instanceof Path2D) {  
				_path = path;
				_x = x;
				_y = y;
			} else {
				_path = this.path;
				_x = path;
				_y = x;
			}
			
			for (var k in _path.paths) {
				var currentPath = _path.paths[k];
				var closed = currentPath[0] == currentPath[currentPath.length-2] && currentPath[1] == currentPath[currentPath.length-1];			
				if (!closed) {
					currentPath.push(currentPath[0],  currentPath[1]);
				}
				var triangles = earcut(currentPath);	
				for (var i = 0; i < triangles.length; i+=3) {
					if (is_in_triangle(_x, _y, currentPath[triangles[i]*2],currentPath[triangles[i]*2+1], 
											   currentPath[triangles[i+1]*2],currentPath[triangles[i+1]*2+1],
											   currentPath[triangles[i+2]*2],currentPath[triangles[i+2]*2+1])) return true;
				}			
				if (!closed) {
					currentPath.pop();
					currentPath.pop();
				}
			}
			
			return false;
		},
		isPointInStroke(path, x, y) {
			//works but I wouldn't recommend using it a whole lot, cause it's sloooow
			var _path, _x, _y;
			if(path && path instanceof Path2D) {  
				_path = path;
				_x = x;
				_y = y;
			} else {
				_path = this.path;
				_x = path;
				_y = x;
			}
			
			var lineWidthDiv2 = this.lineWidth / 2.0;
			for (var k in _path.paths) {		
				var currentPath = _path.paths[k];
				
				var vertices = new TypedArray(Float32Array);
				var indices = new TypedArray(Uint16Array);
				
				this.__strokePath(currentPath, _path.closed[k], vertices, indices);

				for (var i = 0; i < indices.length; i+=3) {
					if (is_in_triangle(_x, _y, vertices.b[indices.b[i]*2],   vertices.b[indices.b[i]*2+1], 
											   vertices.b[indices.b[i+1]*2],   vertices.b[indices.b[i+1]*2+1],
											   vertices.b[indices.b[i+2]*2],   vertices.b[indices.b[i+2]*2+1])) { return true; }
				}
			}
			return false;			
		},
		get canvas() { return this.gl.canvas; },
		get height() { return this.canvas.height; },
		get width() { return this.canvas.width; },
		_resize() {			
			var gl = this.gl;

			gl.clear(gl.COLOR_BUFFER_BIT);
			
			this.resetTransform();
			
			this.path = new Path2D();
			
			//delete some buffers we may have lying around
			delete this.clipFramebuffer;
			delete this.clipTexture;
			delete this.clipPlane;
			delete this.shadowFramebuffer;
			delete this.shadowFramebuffer2;
			delete this.shadowTexture;
			delete this.shadowTexture2;
			delete this.imageTexture;
			delete this.cachedImage;
			delete this.textRenderCanvas;
			delete this.TextureManager;
		},
		createLinearGradient(x0, y0, x1, y1) {
			return new LinearGradient(x0, y0, x1, y1);			
		},
		createRadialGradient(x0, y0, r0, x1, y1, r1) {
			return new RadialGradient(x0, y0, r0, x1, y1, r1);
		},
		createPattern(image, repetition) {
			return new CanvasPattern(image, repetition);
		},
		getLineDash() {
			return this.lineDash;
		},
		setLineDash(new_line_dash) {
			if (this.lineDash.length % 2 == 1) {
				this.lineDash = new_line_dash.concat(new_line_dash);
			} else {
				this.lineDash = new_line_dash;	
			}			
		},
		_prepare_line_dash(path, closed, lineWidthDiv2) {
			if (closed) {
				path.push(path[0], path[1]);
			}
			
			var currentOffset = this.lineDashOffset;
			var dash_index = 0;
			var draw = 1;
			while (currentOffset > this.lineDash[dash_index]) {				
				currentOffset -= this.lineDash[dash_index];
				dash_index++;
				if (draw) draw = 0; else draw = 1;
				if (dash_index == this.lineDash.length) {
					dash_index = 0;
				}
			}
			
			var new_path = [path[0], path[1]];
			var to_draw_or_not_to_draw = [draw];			
			var skipped_dash_switch = false;
			for (var i = 2; i < path.length; i+=2) {
				var line = [path[i]-path[i-2], path[i+1]-path[i-1]];
				var line_l = Math.sqrt(Math.pow(line[0], 2) + Math.pow(line[1], 2))
				line[0] /= line_l; line[1] /= line_l;				
				var progress = 0;
				while (line_l - progress + currentOffset >= this.lineDash[dash_index]) {
					progress += this.lineDash[dash_index] - currentOffset;
					
					currentOffset = 0;
					if (draw) draw = 0; else draw = 1;
					dash_index++;
					if (dash_index == this.lineDash.length) {
						dash_index = 0;
					}
					
					to_draw_or_not_to_draw.push(draw);
					new_path.push(path[i-2] + progress * line[0], path[i-1] + progress * line[1]);
				}							
				if (line_l - progress != 0) {				
					new_path.push(path[i], path[i+1])
					to_draw_or_not_to_draw.push(draw);
				}
				currentOffset += line_l - progress;
			}
			
			//I've once wished this was available so I could continue a dash pattern with a different stroked path, so now it is
			this.currentLineDashOffset = currentOffset;
			for (var i = 0; i < dash_index; i++) {
				this.currentLineDashOffset += this.lineDash[dash_index];
			}
			
			if (closed) {
				path.pop();
				path.pop();
				new_path.pop();
				new_path.pop();
				to_draw_or_not_to_draw.pop();
			}
			
			return [new_path, to_draw_or_not_to_draw];
		},
		
		set globalCompositeOperation(new_globcomp) {
			var gl = this.gl;
			switch(new_globcomp) {
				case 'source-over':
					gl.blendEquation(gl.FUNC_ADD);
					gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);					
					break;
				case 'copy':
					gl.blendEquation(gl.FUNC_ADD);
					gl.blendFunc(gl.ONE, gl.ZERO);
					break;
				case 'lighter': //works
					gl.blendEquation(gl.FUNC_ADD);
					gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
					break;
				default:
				    return; //couldn't find it, so don't change it
			}
			this._globalCompositeOperation = new_globcomp;
			
		},
		get globalCompositeOperation() {
			return this._globalCompositeOperation;
		},
		get fillStyle() {
			return this._fillStyle;
		},
		set fillStyle(new_color) {
			if (new_color == this._fillStyle) return;
			this._fillStyle = new_color;
			if (typeof new_color == 'string') {
				this.fillStyleRGBA = parseColor(new_color);
			} else {
				this.fillStyleRGBA = new_color._generateTexture(this, this.width, this.height);
			}
		},
		get strokeStyle() {
			return this._strokeStyle;
		},
		set strokeStyle(new_color) {
			if (new_color == this._strokeStyle) return;
			this._strokeStyle = new_color;
			if (typeof new_color == 'string') {
				this.strokeStyleRGBA = parseColor(new_color);
			} else {
				this.strokeStyleRGBA = new_color._generateTexture(this, this.width, this.height);
			}
		},
		get shadowColor() {
			return this._shadowColor;
		},
		set shadowColor(new_color) {
			if (new_color == this._shadowColor) return;
			this._shadowColor = new_color;
			if (typeof new_color == 'string') {
				this._shadowColorRGBA = parseColor(new_color);
			}
		},
		_select_program(program) {
			if (this.gl.getParameter(this.gl.CURRENT_PROGRAM) != program) {
				this.gl.useProgram(program);
			}
			return program;
		},
		_draw_shadow(transform, z_index, draw_cb) {
			if (this.shadowOffsetX == 0 && this.shadowOffsetY==0 && this.shadowBlur == 0) return;
						
			var gl = this.gl;
			
			var old_texture = gl.getParameter(gl.ACTIVE_TEXTURE);
			var old_texture_binding = gl.getParameter(gl.TEXTURE_BINDING_2D);
			var old_framebuffer_binding = gl.getParameter(gl.FRAMEBUFFER_BINDING);
			var old_program = gl.getParameter(gl.CURRENT_PROGRAM);
			var old_renderbuffer = gl.getParameter(gl.RENDERBUFFER_BINDING);
			
			if (!this.shadowTexture) {
				this.shadowFramebuffer2 = gl.createFramebuffer();
				gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFramebuffer2);
				this.shadowFramebuffer2.width = this.width;
				this.shadowFramebuffer2.height = this.height;
				
				gl.activeTexture(gl.TEXTURE1);
				this.shadowTexture2 = gl.createTexture();		
				gl.bindTexture(gl.TEXTURE_2D, this.shadowTexture2);
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.shadowFramebuffer2.width, this.shadowFramebuffer2.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
				gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.shadowTexture2, 0);
				gl.clearColor(0, 0, 0, 0);
				
				this.shadowFramebuffer = gl.createFramebuffer();
				gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFramebuffer);
				this.shadowFramebuffer.width = this.width;
				this.shadowFramebuffer.height = this.height;
				
				gl.activeTexture(gl.TEXTURE0);
				this.shadowTexture = gl.createTexture();		
				gl.bindTexture(gl.TEXTURE_2D, this.shadowTexture);
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.shadowFramebuffer.width, this.shadowFramebuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);		
				gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.shadowTexture, 0);
				gl.clearColor(0, 0, 0, 0);				
			} else {			
				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, this.shadowTexture);	
				gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFramebuffer2);
				gl.clear(gl.COLOR_BUFFER_BIT);
				gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFramebuffer);
				gl.clear(gl.COLOR_BUFFER_BIT);
			}
						
			var program = gl.getParameter(gl.CURRENT_PROGRAM);			
			var projection_and_move_offset = [ //flips y, shift scale from [width, height] to [-1, 1]
				2/gl.canvas.width,  0,                   0, 0,
				0,                  -2/gl.canvas.height, 0, 0,
				0,                  0,                   1, 0,
				-1+2*this.shadowOffsetX/gl.canvas.width, 1-2*this.shadowOffsetY/gl.canvas.height, 0, 1
			];		
			
			var new_transform = matrixMultiply(transform, projection_and_move_offset)	
			gl.uniformMatrix4fv(program.transformLocation, false, new_transform);

			draw_cb(); //draw the thing we're shadowing into the texture
			
			gl.uniformMatrix4fv(program.transformLocation, false, this.projectionMatrix);
			
			var program = this._select_program(this.shadow_program);			

			//this piece of code is to calculate coefficients for the gaussian blur
			//gaussian error function from http://picomath.org/javascript/erf.js.html
			function erf(x) {
				// constants
				var a1 =  0.254829592;
				var a2 = -0.284496736;
				var a3 =  1.421413741;
				var a4 = -1.453152027;
				var a5 =  1.061405429;
				var p  =  0.3275911;

				// Save the sign of x
				var sign = 1;
				if (x < 0)
					sign = -1;
				x = Math.abs(x);

				// A&S formula 7.1.26
				var t = 1.0/(1.0 + p*x);
				var y = 1.0 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t*Math.exp(-x*x);

				return sign*y;
			}
			
			//definite integral of the gaussian function from -inf to x
			function def_int_gaussian(x, mu, sigma) {
				return 0.5 * erf((x-mu)/(SQRT_2 * sigma));
			}
			
			var sigma = this.shadowBlur/2;
			
			//Guassian function is a continuous function. So theoretically all pixels contribute to the value of every
			//other pixel. In reality it drops off fast. We only consider pixels 3 * sigma away, because they will 
			//contribute 99.7% of the real value, which is good enough. The +0.5 is to make the number of coeff always odd.
			var kernel_size = 3 * Math.ceil(sigma) + 0.5;
			var start_x = -kernel_size;
			var end_x = kernel_size;
			var coeff = []
			var last_int = def_int_gaussian(start_x, 0, sigma);
			for (var xi = start_x; xi < end_x; xi+=1) {
				var new_int = def_int_gaussian(xi+1, 0, sigma)
				coeff.push(new_int-last_int);
				last_int = new_int;
			}
			
			//renormalize
			var sum = 0;
			for (var i in coeff) {
				sum += coeff[i]
			}
			for (var i in coeff) {
				coeff[i] /= sum;
			}

			//coeff are symmetrical, the first half will do
			coeff = coeff.slice(0, Math.ceil(coeff.length/2));
			coeff.reverse();
			
			if (coeff.length > 100) {
				console.warn("shadowBlur is too large: resulting shadow may lack precision");
			}
			
			//pad with 0s, cause my shader wants and array of 100 coefficients.
			for (var i = coeff.length; i < 100; i++) {
				coeff.push(0);
			}
		
			gl.uniform2f(program.directionLocation, 1/this.width, 0);	
			gl.uniform2f(program.offsetLocation, 0, 0);
			gl.uniform1fv(program.gaussCoeffLocation, coeff);
			gl.uniform4fv(program.shadowColorLocation, this._shadowColorRGBA)
			
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, this.shadowTexture);
			gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFramebuffer2);
			gl.uniform1i(program.textureLocation, 0);
			
			//draw first pass to buffer
			var points = [-1, -1, 1, -1, 1, 1, -1, 1];
			
			gl.bindBuffer(gl.ARRAY_BUFFER, program.vertexBuffer);
			gl.vertexAttribPointer(program.positionLocation, 2, gl.FLOAT, false, 0, 0);				
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);
			
			gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
			
			//draw 2nd pass directly to sreen			
			gl.uniform2f(program.directionLocation, 0, 1/this.height);
			gl.uniform2f(program.offsetLocation, 0, 0); //2nd pass we don't need to offset anymore or we'll offset 2x

			gl.bindFramebuffer(gl.FRAMEBUFFER, old_framebuffer_binding);
			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D, this.shadowTexture2);
			gl.uniform1i(program.textureLocation, 1);
						
			gl.uniform1f(program.zindexLocation, z_index);	
			gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
			
			this._select_program(old_program);	
			gl.activeTexture(old_texture);
			gl.bindTexture(gl.TEXTURE_2D, old_texture_binding);				
			gl.bindBuffer(gl.ARRAY_BUFFER, old_renderbuffer);	
		},
		__draw(vertices, indices, texCoords) {
			var gl = this.gl;
			
			var program = this._select_program(this.image_program);
			gl.uniform1i(program.textureLocation, 4);
			
			this.__prepare_clip();		
			var _this = this;		
			this._draw_shadow(this._transform, this.currentZIndex, function() {	
				gl.bindBuffer(gl.ARRAY_BUFFER, program.texCoordBuffer);
				gl.bufferData(gl.ARRAY_BUFFER, texCoords.b, gl.STATIC_DRAW);
				gl.vertexAttribPointer(program.texCoordLocation, 2, gl.FLOAT, false, 0, 0);	
				gl.bindBuffer(gl.ARRAY_BUFFER, program.vertexBuffer);					
				gl.bufferData(gl.ARRAY_BUFFER,vertices.b, gl.STATIC_DRAW);
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, program.indexBuffer);
				gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices.b, gl.STATIC_DRAW);	
				gl.vertexAttribPointer(program.positionLocation, 2, gl.FLOAT, false, 0, 0);			
				gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);	
			});
			this.currentZIndex -=EPSILON;

			var transform = matrixMultiply(this._transform, this.projectionMatrix);
			gl.uniformMatrix4fv(program.transformLocation, false, transform);
			this._set_zindex();
			gl.uniform1f(program.globalAlphaLocation, this.globalAlpha);

			gl.bindBuffer(gl.ARRAY_BUFFER, program.texCoordBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, texCoords.b, gl.STATIC_DRAW);
			gl.vertexAttribPointer(program.texCoordLocation, 2, gl.FLOAT, false, 0, 0);	
			gl.bindBuffer(gl.ARRAY_BUFFER, program.vertexBuffer);					
			gl.bufferData(gl.ARRAY_BUFFER,vertices.b, gl.STATIC_DRAW);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, program.indexBuffer);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices.b, gl.STATIC_DRAW);	
			gl.vertexAttribPointer(program.positionLocation, 2, gl.FLOAT, false, 0, 0);			
			gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);	
			
			this.__execute_clip(this.currentZIndex)
			this.currentZIndex -=EPSILON;
		},
		fill(path) {
			var _path = this.path;
			if(path) {  
				_path = path;
			}
						
			var gl = this.gl;			
			
			if (!this.textureManager) {
				this.textureManager = new TextureManager(gl, MAX_TEXTURE_SIZE, MAX_TEXTURE_SIZE);
			}
			
			var tex_offsets;
			var flat_color = true;
			if (this.fillStyleRGBA instanceof WebGLTexture) {
				this.fillStyleRGBA.width = this.width;
				this.fillStyleRGBA.height = this.height;
				this.textureManager.set_texture_from_texture(this.fillStyleRGBA, this);
				flat_color = false;
				tex_offsets = [this.fillStyleRGBA.nodes[0].rect.x, this.fillStyleRGBA.nodes[0].rect.y];
			} else {
				tex_offsets = this.textureManager.set_color(this.fillStyleRGBA);
			}

			if (!_path.fill_vertices) {
				_path.fill_buffered = 0;
				_path.fill_vertices = new TypedArray(Float32Array);
				_path.fill_indices = new TypedArray(Uint16Array);
				_path.fill_texPoints = new TypedArray(Float32Array);
			}
			
			for (;_path.fill_buffered < _path.paths.length; _path.fill_buffered++) {
				var i = _path.fill_buffered;
				var currentPath = _path.paths[i];

				if (currentPath.length < 6) continue;
				
				var closed = currentPath[0] == currentPath[currentPath.length-2] && currentPath[1] == currentPath[currentPath.length-1];			
				if (!closed) {
					currentPath.push(currentPath[0], currentPath[1]);
				}
				var triangles = earcut(currentPath);			
				
				var offset = _path.fill_vertices.length/2;
				if (triangles.length > 0) {					
					for (var j in triangles) {
						_path.fill_indices.push(offset+triangles[j]);
					}
					for (var j in currentPath) {
						_path.fill_vertices.push(currentPath[j]);
					}
				}
				if (!closed) {
					currentPath.pop();
					currentPath.pop();
				}
				if (flat_color) {
					for (var j = _path.fill_texPoints.length; j < _path.fill_vertices.length; j+=2) {
						_path.fill_texPoints.push((tex_offsets[0]+0.5)/MAX_TEXTURE_SIZE, (tex_offsets[1]+0.5)/MAX_TEXTURE_SIZE);
					}
				} else {
					for (var j = _path.fill_texPoints.length; j < _path.fill_vertices.length; j+=2) {
						_path.fill_texPoints.push((tex_offsets[0]+_path.fill_vertices.b[j])/MAX_TEXTURE_SIZE, 
												  (tex_offsets[1]+this.height-_path.fill_vertices.b[j+1])/MAX_TEXTURE_SIZE);
					}
				}
			}
			
			this.__draw(_path.fill_vertices, _path.fill_indices, _path.fill_texPoints);
			
		},
		fillRect(x, y, width, height) {
			var path = new Path2D();
			path.rect(x, y, width, height);
			this.fill(path);
		},
		clearRect(x, y, width, height) {
			var gl = this.gl;
			if (x == 0 && y == 0 && width == this.width && height == this.height) {
				gl.clear(gl.COLOR_BUFFER_BIT);
			} else {
				gl.enable(gl.SCISSOR_TEST);
				gl.scissor(x, this.height-y-height, width, height);
				gl.clear(gl.COLOR_BUFFER_BIT);
				gl.disable(gl.SCISSOR_TEST);
			}
		},
		__prepareStroke(path, closed, lineWidthDiv2, use_linedash, vertices) {
			//Polyline algorithm, take a piece of paper and draw it if you want to understand what is happening
			//If stroking turns out to be slow, here will be your problem. This should and can easily 
			//be implemented in a geometry shader or something so it runs on the gpu. But webgl doesn't
			//support geometry shaders for some reason.

			//remove duplicate points, they mess up the math
			var array = [path[0], path[1]];
			for (var i = 2; i < path.length; i+=2) {
				if (path[i] != array[array.length-2] || path[i+1] != array[array.length-1]) {
					array.push(path[i], path[i+1])
				}
			}
			
			//implicitly close
			if (closed && (array[array.length-2] != array[0] || array[array.length-1] != array[1])) {
				array.push(array[0], array[1]);
			}

			var to_draw_or_not_to_draw;
			if (use_linedash) {
				var result = this._prepare_line_dash(array, closed, lineWidthDiv2);
				to_draw_or_not_to_draw = result[1];
				array = result[0];
			}
			
			var vertex_offset = vertices.length;	
			var vertex_progress = vertices.length;
			var to_draw_buffer = [];
			
			if (!closed) {
				var line = [array[2] - array[0], array[3] - array[1]]		
				
				var l = Math.sqrt(Math.pow(line[0],2) + Math.pow(line[1],2))
				line[0] /= l; line[1] /= l
				var normal = [-line[1], line[0]]
				
				var a = [array[0] + lineWidthDiv2 * normal[0], array[1] + lineWidthDiv2 * normal[1]]
				var b = [array[0] - lineWidthDiv2 * normal[0], array[1] - lineWidthDiv2 * normal[1]]
				
				if (this.lineCap == 'butt')	{	
					vertices.push(a[0], a[1], b[0], b[1]);
				} else if (this.lineCap == 'square') {
					vertices.push(a[0] - lineWidthDiv2 * line[0], a[1] - lineWidthDiv2 * line[1], 
										 b[0] - lineWidthDiv2 * line[0], b[1] - lineWidthDiv2 * line[1]);				
				} else { //round
					vertices.push(array[0], array[1], a[0], a[1]);
					var startAngle = Math.atan2(a[1] - array[1], a[0] - array[0])
					var endAngle = Math.atan2(b[1] - array[1], b[0] - array[0])					
					_add_arc(vertices, array[0], array[1], lineWidthDiv2, startAngle, endAngle);
					vertices.push(array[0], array[1], b[0], b[1]);
					vertices.push(a[0], a[1], b[0], b[1]);
				}
				
				if (use_linedash) {
					var to_draw = to_draw_or_not_to_draw[0];
					for (var j = vertex_progress; j < vertices.length; j+=2) {
						to_draw_buffer.push(to_draw);
					}
					vertex_progress = vertices.length;
				}			
			} else {
				array.push(array[2], array[3]);
			}

			
			for (var i = 2; i < array.length-2; i+=2) {
				var line = [array[i] - array[i-2], array[i+1] - array[i-1]];

				var normal = [-line[1], line[0]]
				var l = Math.sqrt(Math.pow(normal[0],2) + Math.pow(normal[1],2))
				normal[0] /= l
				normal[1] /= l
				
				var p2minp1 = [array[i+2] - array[i], array[i+3] - array[i+1]]
				l = Math.sqrt(Math.pow(p2minp1[0],2) + Math.pow(p2minp1[1],2))
				p2minp1[0] /= l; p2minp1[1] /= l; 				
				var p1minp0 = [array[i] - array[i-2], array[i+1] - array[i-1]]
				l = Math.sqrt(Math.pow(p1minp0[0],2) + Math.pow(p1minp0[1],2))
				p1minp0[0] /= l; p1minp0[1] /= l; 
				var tangent = [p1minp0[0] + p2minp1[0], p1minp0[1] + p2minp1[1]]
				var l = Math.sqrt(Math.pow(tangent[0],2) + Math.pow(tangent[1],2))
				
				var length, dot, miter;
				if (l > 0) {
					tangent[0] /= l; tangent[1] /= l
					miter = [-tangent[1], tangent[0]];
					dot = (miter[0]*normal[0] + miter[1]*normal[1]);
					length = lineWidthDiv2 / dot;
				} else {
					length = 0;
					miter = [-tangent[1], tangent[0]];
				}
					
				a = [array[i] + length * miter[0], array[i+1] + length * miter[1]]
				b = [array[i] - length * miter[0], array[i+1] - length * miter[1]]

				if (this.lineJoin == 'miter' && (1/dot) <= this.miterLimit) {
					//miter
					vertices.push(a[0], a[1], b[0], b[1]);
				} else {
					var sin_angle = p1minp0[1] * p2minp1[0] - p1minp0[0] * p2minp1[1];
					
					if (this.lineJoin == 'round') {
						//round
						if (sin_angle < 0) {
							var n1 = [array[i] + p1minp0[1] * lineWidthDiv2, array[i+1] - p1minp0[0] * lineWidthDiv2]
							var n2 = [array[i] + p2minp1[1] * lineWidthDiv2, array[i+1] - p2minp1[0] * lineWidthDiv2]
							vertices.push(a[0], a[1], n1[0], n1[1]);
							var startAngle = Math.atan2(n1[1] - array[i+1] , n1[0] - array[i])
							var endAngle = Math.atan2(n2[1] - array[i+1],  n2[0] - array[i])
							_add_arc(vertices, array[i], array[i+1], lineWidthDiv2, startAngle, endAngle)							
							vertices.push(a[0], a[1], n2[0], n2[1]);
						} else {
							var n1 = [array[i] - p1minp0[1] * lineWidthDiv2, array[i+1] + p1minp0[0] * lineWidthDiv2]
							var n2 = [array[i] - p2minp1[1] * lineWidthDiv2, array[i+1] + p2minp1[0] * lineWidthDiv2]	
							vertices.push(n1[0], n1[1], b[0], b[1]);
							var startAngle = Math.atan2(n2[1] - array[i+1] , n2[0] - array[i])
							var endAngle = Math.atan2(n1[1] - array[i+1],  n1[0] - array[i])
							_add_arc(vertices, array[i], array[i+1], lineWidthDiv2, startAngle, endAngle);
							vertices.push(n2[0], n2[1], b[0], b[1]);
						}
					} else {
						//bevel
						if (sin_angle < 0) { 
							var n1 = [array[i] + p1minp0[1] * lineWidthDiv2, array[i+1] - p1minp0[0] * lineWidthDiv2]
							var n2 = [array[i] + p2minp1[1] * lineWidthDiv2, array[i+1] - p2minp1[0] * lineWidthDiv2]
							vertices.push(a[0], a[1], n1[0], n1[1], a[0], a[1], n2[0], n2[1]);
						} else {
							var n1 = [array[i] - p1minp0[1] * lineWidthDiv2, array[i+1] + p1minp0[0] * lineWidthDiv2]
							var n2 = [array[i] - p2minp1[1] * lineWidthDiv2, array[i+1] + p2minp1[0] * lineWidthDiv2]	
							vertices.push(n1[0], n1[1], b[0], b[1], n2[0], n2[1], b[0], b[1]);
						}
					}
				}			
				if (use_linedash) {
					var to_draw =  to_draw_or_not_to_draw[i/2];
					for (var j = vertex_progress; j < vertices.length; j+=2) {
						to_draw_buffer.push(to_draw);
					}
					vertex_progress = vertices.length;
				}
			}
			
			if (!closed) {
				var line = [array[array.length-2] - array[array.length-4], array[array.length-1] - array[array.length-3]];	
				
				var l = Math.sqrt(Math.pow(line[0],2) + Math.pow(line[1],2))
				line[0] /= l; line[1] /= l;
				var normal = [-line[1], line[0]]
				
				var a = [array[array.length-2] + lineWidthDiv2 * normal[0], array[array.length-1] + lineWidthDiv2 * normal[1]]
				var b = [array[array.length-2] - lineWidthDiv2 * normal[0], array[array.length-1] - lineWidthDiv2 * normal[1]]
				
				if (this.lineCap == 'butt')	{	
					vertices.push(a[0], a[1], b[0], b[1]);
				} else if (this.lineCap == 'square') {
					vertices.push(a[0] + lineWidthDiv2 * line[0], a[1] + lineWidthDiv2 * line[1], 
										 b[0] + lineWidthDiv2 * line[0], b[1] + lineWidthDiv2 * line[1]);				
				} else { //round
					vertices.push(a[0], a[1], b[0], b[1]);				
					vertices.push(array[array.length-2], array[array.length-1], b[0], b[1]);
					var startAngle = Math.atan2(b[1] - array[array.length-1], b[0] - array[array.length-2])
					var endAngle = Math.atan2(a[1] - array[array.length-1], a[0] - array[array.length-2])	
					_add_arc(vertices, array[array.length-2], array[array.length-1], lineWidthDiv2, startAngle, endAngle);					
					vertices.push(array[array.length-2], array[array.length-1], a[0], a[1]);
				}
			} else {
				vertices.push(vertices.b[vertex_offset], vertices.b[vertex_offset+1], vertices.b[vertex_offset+2], vertices.b[vertex_offset+3])
			}
					
			if (use_linedash) {
				var to_draw =  to_draw_or_not_to_draw[to_draw_or_not_to_draw.length-1];
				for (var j = vertex_progress; j < vertices.length; j+=2) {
					to_draw_buffer.push(to_draw);
				}
				vertex_progress = vertices.length;
			}

			return 	to_draw_buffer;
		},
		__strokePath(array, closed, vertices, indices) {
			var vertex_offset = vertices.length;			
			var use_linedash = this.lineDash.length > 0;
			var lineWidthDiv2 = this.lineWidth / 2.0;

			var to_draw_buffer = this.__prepareStroke(array, closed, lineWidthDiv2, use_linedash, vertices);
						
			if (use_linedash) {
				for (var i = vertex_offset/2+2; i < vertices.length/2; i+=2) {
					if (to_draw_buffer[i-vertex_offset/2-1]) {
						indices.push(i-2, i , i-1, i, i+1, i-1);
					}
				}
			} else {							
				for (var i = vertex_offset/2+2; i < vertices.length/2; i+=2) {
					indices.push(i-2, i , i-1, i, i+1, i-1);
				}
			}
		},
		strokeRect(x, y, width, height) {
			var path = new Path2D();
			path.rect(x, y, width, height);
			this.stroke(path);
		},
		_prepareCanvas(_canvas, msg, maxlen) {
			// use canvas to draw text, I know it's dumb, but implementing canvas2d compatibletext
			// text rendering in webgl is somewhat beyond the scope of this project/
			// Text will probably never look good rendered this way anyway.
			var _ctx = _canvas.getContext("2d");
			_ctx.clearRect(0, 0, _canvas.width, _canvas.height);
			
			if (_ctx.font != this.font) _ctx.font = this.font;
			if (_ctx.strokeStyle != this.strokeStyle) _ctx.strokeStyle = this.strokeStyle;
			if (_ctx.fillStyle != this.fillStyle) _ctx.fillStyle = this.fillStyle;
			if (_ctx.lineWidth != this.lineWidth) _ctx.lineWidth = this.lineWidth;
			if (_ctx.direction != this.direction) _ctx.direction = this.direction;
			if (_ctx.textBaseline != this.textBaseline) _ctx.textBaseline = this.textBaseline;
			if (_ctx.globalAlpha != this.globalAlpha) _ctx.globalAlpha = this.globalAlpha;
									
			// _ctx.textBaseline = this.textBaseline;
			var dim = _ctx.measureText(msg);
			
			var height = parseFloat(this.font);
			height = height * 2;
			
			var width;
			if (maxlen)	{
				width = Math.min(dim.width, maxlen);
			} else {
				width = dim.width;
			}
			
			/*
			_canvas.height = height;
			_canvas.width = width;
			
			//changing canvas size resets everything, so here we go again
			_ctx.font = this.font;
			_ctx.strokeStyle = this.strokeStyle;
			_ctx.fillStyle = this.fillStyle;
			_ctx.lineWidth = this.lineWidth;
			_ctx.direction = this.direction;
			_ctx.textBaseline = this.textBaseline;	
			_ctx.globalAlpha = this.globalAlpha;
			*/
			
			return [_ctx, width, height];
		},
		strokeText(msg, x, y, maxlen) {
			if (!this.textRenderCanvas) {
				this.textRenderCanvas = document.createElement("canvas");
				this.textRenderCanvas.width = this.width;
				this.textRenderCanvas.height = this.height;
			}
			var _canvas = this.textRenderCanvas;
			
			var _ctx, width, height;
			[_ctx, width, height] = this._prepareCanvas(_canvas, msg, maxlen);
			
			_ctx.strokeText(msg, 0, height/2, maxlen);

			if (this.textAlign == "left" || this.textAlign == "start") {
				this.drawImage(_canvas, 0, 0, width, height, x, y-height/2, width, height);
			} else if (this.textAlign == "right" || this.textAlign == "end") {
				this.drawImage(_canvas, 0, 0, width, height, x - width, y-height/2, width, height);
			} else if (this.textAlign == "center") {
				this.drawImage(_canvas, 0, 0, width, height, x - width/2, y-height/2, width, height);
			}
		},
		fillText(msg, x, y, maxlen) {
			if (!this.textRenderCanvas) {
				this.textRenderCanvas = document.createElement("canvas");
				this.textRenderCanvas.width = this.width;
				this.textRenderCanvas.height = this.height;
			}
			var _canvas = this.textRenderCanvas;
			var _ctx = this._prepareCanvas(_canvas, msg, maxlen);
			
			var _ctx, width, height;
			[_ctx, width, height] = this._prepareCanvas(_canvas, msg, maxlen);
			
			_ctx.fillText(msg, 0, height/2, maxlen);
				
			if (this.textAlign == "left" || this.textAlign == "start") {
				this.drawImage(_canvas, 0, 0, width, height, x, y-height/2, width, height);
			} else if (this.textAlign == "right" || this.textAlign == "end") {
				this.drawImage(_canvas, 0, 0, width, height, x - width, y-height/2, width, height);
			} else if (this.textAlign == "center") {
				this.drawImage(_canvas, 0, 0, width, height, x - width/2, y-height/2, width, height);
			}
		},
		measureText(msg) {
			var _canvas = document.createElement("canvas");
			var _ctx = _canvas.getContext("2d");
			_ctx.lineWidth = this.lineWidth;
			_ctx.font = this.font;
			return _ctx.measureText(msg);
		},
		drawImage(img, srcX, srcY, srcWidth, srcHeight, dstX, dstY, dstWidth, dstHeight) {
			var gl = this.gl;

			if (!this.textureManager) {
				this.textureManager = new TextureManager(gl, MAX_TEXTURE_SIZE, MAX_TEXTURE_SIZE);
			}
			
			//we take z-index now as we're supposed to draw now
			var temp_z_index = this.currentZIndex; 			
			this.currentZIndex-=5*EPSILON;
			
			var _this = this;
			var image_loaded = function() {
				var img_width, img_height;
				if (img instanceof HTMLImageElement) {
					img_width = img.naturalWidth;
					img_height = img.naturalHeight;
				} else {
					img_width = img.width;
					img_height = img.height;					
				}			
				if (dstX === undefined) {
					dstX = srcX;
					srcX = 0;
				}
				if (dstY === undefined) {
					dstY = srcY;
					srcY = 0;
				}
				if (srcWidth === undefined) {
					srcWidth = img_width;
				}
				if (srcHeight === undefined) {
					srcHeight = img_height;
				}
				if (dstWidth === undefined) {
					dstWidth = srcWidth;
					srcWidth = img_width;
				}
				if (dstHeight === undefined) {
					dstHeight = srcHeight;
					srcHeight = img_height;
				}

				var scaleX = dstWidth / srcWidth;
				var scaleY = dstHeight / srcHeight;

				var points = new TypedArray(Float32Array);
				var texPoints = new TypedArray(Float32Array);
				var indices = new TypedArray(Uint16Array);

				var offset = 0;

				//use texture caching
				_this.textureManager.set_texture_from_img(img);
		
				for (var i in img.nodes) {
					var node = img.nodes[i];
					
					if (!node || srcX+srcWidth <= node.x || srcY+srcHeight <= node.y || srcX > node.x+node.rect.w || srcY > node.y+node.rect.h) continue;

					var x = Math.max(node.rect.x, node.rect.x + srcX - node.x);
					var y = Math.max(node.rect.y, node.rect.y + srcY - node.y);
					var w = Math.min(srcX + srcWidth - node.x, node.x + node.rect.w) - Math.max(0, srcX - node.x)
					var h = Math.min(srcY + srcHeight - node.y, node.y + node.rect.h) - Math.max(0, srcY - node.y)
		
					//texPoints.push((x+0.5)/MAX_TEXTURE_SIZE, (y+0.5)/MAX_TEXTURE_SIZE, (x+w+0.5)/MAX_TEXTURE_SIZE, (y+0.5)/MAX_TEXTURE_SIZE, (x+w+0.5)/MAX_TEXTURE_SIZE, (y+h+0.5)/MAX_TEXTURE_SIZE, (x+0.5)/MAX_TEXTURE_SIZE, (y+h+0.5)/MAX_TEXTURE_SIZE);
					texPoints.push((x)/MAX_TEXTURE_SIZE, (y)/MAX_TEXTURE_SIZE, (x+w)/MAX_TEXTURE_SIZE, (y)/MAX_TEXTURE_SIZE, (x+w)/MAX_TEXTURE_SIZE, (y+h)/MAX_TEXTURE_SIZE, (x)/MAX_TEXTURE_SIZE, (y+h)/MAX_TEXTURE_SIZE);
					
					var dx = dstX + Math.max(0, (node.x - srcX) * scaleX);
					var dy = dstY + Math.max(0, (node.y - srcY) * scaleY);
					var dw = w * scaleX;
					var dh = h * scaleY;
					
					points.push(dx, dy, dx+dw, dy, dx+dw, dy+dh, dx, dy+dh);
					
					indices.push(offset+0, offset+1, offset+2, offset+0, offset+2, offset+3);
					offset += 4;			
				}

				_this.__draw(points, indices, texPoints);
			}
			
			if (img.complete || (!(img instanceof HTMLImageElement))) {
				image_loaded();
			} else {
				img.addEventListener('load', image_loaded);
			}
		}
	}
		
	var orig_getContext = HTMLCanvasElement.prototype.getContext;
	HTMLCanvasElement.prototype.getContext = function(id) {	
		if (id == 'webgl-2d') {
			if (!this.__context2d) {
				this.__context2d = new CanvasRenderingContext2D(orig_getContext.apply(this, ['webgl', {preserveDrawingBuffer: true}]));
			}
			return this.__context2d;
		} else {
			return orig_getContext.apply(this, arguments);
		}
	};

	var color_table = {};
	function parseColor(css_str) {
		if (color_table[css_str]) return color_table[css_str];
		var temp = parseCSSColor(css_str);
		temp[0] /= 255; temp[1] /= 255; temp[2] /= 255; 
		color_table[css_str] = temp;
		return temp;
	}
	
	// (c) Dean McNamee <dean@gmail.com>, 2012.
	//
	// https://github.com/deanm/css-color-parser-js
	//
	// Permission is hereby granted, free of charge, to any person obtaining a copy
	// of this software and associated documentation files (the "Software"), to
	// deal in the Software without restriction, including without limitation the
	// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
	// sell copies of the Software, and to permit persons to whom the Software is
	// furnished to do so, subject to the following conditions:
	//
	// The above copyright notice and this permission notice shall be included in
	// all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
	// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
	// IN THE SOFTWARE.
	
	// http://www.w3.org/TR/css3-color/
	var kCSSColorTable = {
	  "transparent": [0,0,0,0], "aliceblue": [240,248,255,1],
	  "antiquewhite": [250,235,215,1], "aqua": [0,255,255,1],
	  "aquamarine": [127,255,212,1], "azure": [240,255,255,1],
	  "beige": [245,245,220,1], "bisque": [255,228,196,1],
	  "black": [0,0,0,1], "blanchedalmond": [255,235,205,1],
	  "blue": [0,0,255,1], "blueviolet": [138,43,226,1],
	  "brown": [165,42,42,1], "burlywood": [222,184,135,1],
	  "cadetblue": [95,158,160,1], "chartreuse": [127,255,0,1],
	  "chocolate": [210,105,30,1], "coral": [255,127,80,1],
	  "cornflowerblue": [100,149,237,1], "cornsilk": [255,248,220,1],
	  "crimson": [220,20,60,1], "cyan": [0,255,255,1],
	  "darkblue": [0,0,139,1], "darkcyan": [0,139,139,1],
	  "darkgoldenrod": [184,134,11,1], "darkgray": [169,169,169,1],
	  "darkgreen": [0,100,0,1], "darkgrey": [169,169,169,1],
	  "darkkhaki": [189,183,107,1], "darkmagenta": [139,0,139,1],
	  "darkolivegreen": [85,107,47,1], "darkorange": [255,140,0,1],
	  "darkorchid": [153,50,204,1], "darkred": [139,0,0,1],
	  "darksalmon": [233,150,122,1], "darkseagreen": [143,188,143,1],
	  "darkslateblue": [72,61,139,1], "darkslategray": [47,79,79,1],
	  "darkslategrey": [47,79,79,1], "darkturquoise": [0,206,209,1],
	  "darkviolet": [148,0,211,1], "deeppink": [255,20,147,1],
	  "deepskyblue": [0,191,255,1], "dimgray": [105,105,105,1],
	  "dimgrey": [105,105,105,1], "dodgerblue": [30,144,255,1],
	  "firebrick": [178,34,34,1], "floralwhite": [255,250,240,1],
	  "forestgreen": [34,139,34,1], "fuchsia": [255,0,255,1],
	  "gainsboro": [220,220,220,1], "ghostwhite": [248,248,255,1],
	  "gold": [255,215,0,1], "goldenrod": [218,165,32,1],
	  "gray": [128,128,128,1], "green": [0,128,0,1],
	  "greenyellow": [173,255,47,1], "grey": [128,128,128,1],
	  "honeydew": [240,255,240,1], "hotpink": [255,105,180,1],
	  "indianred": [205,92,92,1], "indigo": [75,0,130,1],
	  "ivory": [255,255,240,1], "khaki": [240,230,140,1],
	  "lavender": [230,230,250,1], "lavenderblush": [255,240,245,1],
	  "lawngreen": [124,252,0,1], "lemonchiffon": [255,250,205,1],
	  "lightblue": [173,216,230,1], "lightcoral": [240,128,128,1],
	  "lightcyan": [224,255,255,1], "lightgoldenrodyellow": [250,250,210,1],
	  "lightgray": [211,211,211,1], "lightgreen": [144,238,144,1],
	  "lightgrey": [211,211,211,1], "lightpink": [255,182,193,1],
	  "lightsalmon": [255,160,122,1], "lightseagreen": [32,178,170,1],
	  "lightskyblue": [135,206,250,1], "lightslategray": [119,136,153,1],
	  "lightslategrey": [119,136,153,1], "lightsteelblue": [176,196,222,1],
	  "lightyellow": [255,255,224,1], "lime": [0,255,0,1],
	  "limegreen": [50,205,50,1], "linen": [250,240,230,1],
	  "magenta": [255,0,255,1], "maroon": [128,0,0,1],
	  "mediumaquamarine": [102,205,170,1], "mediumblue": [0,0,205,1],
	  "mediumorchid": [186,85,211,1], "mediumpurple": [147,112,219,1],
	  "mediumseagreen": [60,179,113,1], "mediumslateblue": [123,104,238,1],
	  "mediumspringgreen": [0,250,154,1], "mediumturquoise": [72,209,204,1],
	  "mediumvioletred": [199,21,133,1], "midnightblue": [25,25,112,1],
	  "mintcream": [245,255,250,1], "mistyrose": [255,228,225,1],
	  "moccasin": [255,228,181,1], "navajowhite": [255,222,173,1],
	  "navy": [0,0,128,1], "oldlace": [253,245,230,1],
	  "olive": [128,128,0,1], "olivedrab": [107,142,35,1],
	  "orange": [255,165,0,1], "orangered": [255,69,0,1],
	  "orchid": [218,112,214,1], "palegoldenrod": [238,232,170,1],
	  "palegreen": [152,251,152,1], "paleturquoise": [175,238,238,1],
	  "palevioletred": [219,112,147,1], "papayawhip": [255,239,213,1],
	  "peachpuff": [255,218,185,1], "peru": [205,133,63,1],
	  "pink": [255,192,203,1], "plum": [221,160,221,1],
	  "powderblue": [176,224,230,1], "purple": [128,0,128,1],
	  "rebeccapurple": [102,51,153,1],
	  "red": [255,0,0,1], "rosybrown": [188,143,143,1],
	  "royalblue": [65,105,225,1], "saddlebrown": [139,69,19,1],
	  "salmon": [250,128,114,1], "sandybrown": [244,164,96,1],
	  "seagreen": [46,139,87,1], "seashell": [255,245,238,1],
	  "sienna": [160,82,45,1], "silver": [192,192,192,1],
	  "skyblue": [135,206,235,1], "slateblue": [106,90,205,1],
	  "slategray": [112,128,144,1], "slategrey": [112,128,144,1],
	  "snow": [255,250,250,1], "springgreen": [0,255,127,1],
	  "steelblue": [70,130,180,1], "tan": [210,180,140,1],
	  "teal": [0,128,128,1], "thistle": [216,191,216,1],
	  "tomato": [255,99,71,1], "turquoise": [64,224,208,1],
	  "violet": [238,130,238,1], "wheat": [245,222,179,1],
	  "white": [255,255,255,1], "whitesmoke": [245,245,245,1],
	  "yellow": [255,255,0,1], "yellowgreen": [154,205,50,1]}

	function clamp_css_byte(i) {  // Clamp to integer 0 .. 255.
	  i = Math.round(i);  // Seems to be what Chrome does (vs truncation).
	  return i < 0 ? 0 : i > 255 ? 255 : i;
	}

	function clamp_css_float(f) {  // Clamp to float 0.0 .. 1.0.
	  return f < 0 ? 0 : f > 1 ? 1 : f;
	}

	function parse_css_int(str) {  // int or percentage.
	  if (str[str.length - 1] === '%')
		return clamp_css_byte(parseFloat(str) / 100 * 255);
	  return clamp_css_byte(parseInt(str));
	}

	function parse_css_float(str) {  // float or percentage.
	  if (str[str.length - 1] === '%')
		return clamp_css_float(parseFloat(str) / 100);
	  return clamp_css_float(parseFloat(str));
	}

	function css_hue_to_rgb(m1, m2, h) {
	  if (h < 0) h += 1;
	  else if (h > 1) h -= 1;

	  if (h * 6 < 1) return m1 + (m2 - m1) * h * 6;
	  if (h * 2 < 1) return m2;
	  if (h * 3 < 2) return m1 + (m2 - m1) * (2/3 - h) * 6;
	  return m1;
	}

	function parseCSSColor(css_str) {
	  // Remove all whitespace, not compliant, but should just be more accepting.
	  var str = css_str.replace(/ /g, '').toLowerCase();

	  // Color keywords (and transparent) lookup.
	  if (str in kCSSColorTable) return kCSSColorTable[str].slice();  // dup.

	  // #abc and #abc123 syntax.
	  if (str[0] === '#') {
		if (str.length === 4) {
		  var iv = parseInt(str.substr(1), 16);  // TODO(deanm): Stricter parsing.
		  if (!(iv >= 0 && iv <= 0xfff)) return null;  // Covers NaN.
		  return [((iv & 0xf00) >> 4) | ((iv & 0xf00) >> 8),
				  (iv & 0xf0) | ((iv & 0xf0) >> 4),
				  (iv & 0xf) | ((iv & 0xf) << 4),
				  1];
		} else if (str.length === 7) {
		  var iv = parseInt(str.substr(1), 16);  // TODO(deanm): Stricter parsing.
		  if (!(iv >= 0 && iv <= 0xffffff)) return null;  // Covers NaN.
		  return [(iv & 0xff0000) >> 16,
				  (iv & 0xff00) >> 8,
				  iv & 0xff,
				  1];
		}

		return null;
	  }

	  var op = str.indexOf('('), ep = str.indexOf(')');
	  if (op !== -1 && ep + 1 === str.length) {
		var fname = str.substr(0, op);
		var params = str.substr(op+1, ep-(op+1)).split(',');
		var alpha = 1;  // To allow case fallthrough.
		switch (fname) {
		  case 'rgba':
			if (params.length !== 4) return null;
			alpha = parse_css_float(params.pop());
			// Fall through.
		  case 'rgb':
			if (params.length !== 3) return null;
			return [parse_css_int(params[0]),
					parse_css_int(params[1]),
					parse_css_int(params[2]),
					alpha];
		  case 'hsla':
			if (params.length !== 4) return null;
			alpha = parse_css_float(params.pop());
			// Fall through.
		  case 'hsl':
			if (params.length !== 3) return null;
			var h = (((parseFloat(params[0]) % 360) + 360) % 360) / 360;  // 0 .. 1
			// NOTE(deanm): According to the CSS spec s/l should only be
			// percentages, but we don't bother and let float or percentage.
			var s = parse_css_float(params[1]);
			var l = parse_css_float(params[2]);
			var m2 = l <= 0.5 ? l * (s + 1) : l + s - l * s;
			var m1 = l * 2 - m2;
			return [clamp_css_byte(css_hue_to_rgb(m1, m2, h+1/3) * 255),
					clamp_css_byte(css_hue_to_rgb(m1, m2, h) * 255),
					clamp_css_byte(css_hue_to_rgb(m1, m2, h-1/3) * 255),
					alpha];
		  default:
			return null;
		}
	  }

	  return null;
	}

}());