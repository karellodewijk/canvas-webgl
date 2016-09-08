# canvas-webgl
A canvas2d api implementation using webgl and javascript

Currently it supports most features, but many of them have bugs. 

Check out the status:

http://karellodewijk.github.io/canvas-webgl/test/canvas_tests1.html

http://karellodewijk.github.io/canvas-webgl/test/canvas_tests2.html

http://karellodewijk.github.io/canvas-webgl/test/canvas_tests3.html

And CanvasMark:

http://karellodewijk.github.io/canvas-webgl/CanvasMark/

Caveats:

- Text rendering basically uses Canvas2D to render and then copies the result over to the webgl context, which is mostly an excercice in futility. But truly implementing text rendering in webgl would be a huge undertaking.
- Webgl can not put images with width or height directly into a texture, so I use canvas2D to carve them up at a big performance hit.

Missing features:

- globalCompositeOperation
- hit regions
- drawFocusIfNeeded, scrollPathIntoView
- ellipse support in arcTo

Used libraries:

Major ones are:
	- I use https://github.com/deanm/css-color-parser-js to parse css color strings. 
	- https://github.com/mapbox/earcut for triangulation.

There are some smaller bits, attribuited in the source code