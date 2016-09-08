var tests = new Object();
tests["rnd_fillRect"] = { testFunction: renderRandomFillRect };
tests["rnd_imagedata"] = { testFunction: renderRandomImageData };
tests["precomp_rnd_fillRect"] = { testFunction: renderPrecomputed2DFillRect, initFunction: precomputeRandomFillForRGBAString };
tests["precomp_rnd_imagedata"] = { testFunction: renderPrecomputed2DImageData, initFunction: precomputeRandomFillForRGBAValues };
tests["precomp_seq_rnd_fillRect"] = { testFunction: renderPrecomputedSeqFillRect, initFunction: precomputeRandomSeqFillForRGBAValues };
tests["precomp_seq_rnd_imagedata"] = { testFunction: renderPrecomputedSeqImageData, initFunction: precomputeRandomSeqFillForRGBAValues };

function doAllPerformanceTests( exectionsPerTest = 1 ){
  var canvas = $( "#main_canvas" );
  var context = canvas.get(0).getContext("webgl-2d");
  var canvasDimension = {
    width: canvas.width(),
    height: canvas.height()
  };
  for(var testId in tests){
    performRenderTest( "result_"+testId, context, canvasDimension, exectionsPerTest, tests[testId].testFunction, tests[testId].initFunction )
  }
}

function performRenderTest( resultId, ctx, canvasDimension, numExecutions, testFunction, initFunction ){
  var result = 0;
  for( var i = 0; i < numExecutions; i++ ){
    var initParams;
    if( typeof initFunction === "function"){
      initParams = initFunction( ctx, canvasDimension );
    }
    var startTime = new Date();
    testFunction( ctx, canvasDimension, initParams );
    result += new Date().getTime() - startTime;
  }
  result = result / numExecutions;
  setPerformanceResult( resultId, result );
}

function setPerformanceResult( id, result ){
  $( "#" + id + "_ms" ).text(result);
  $( "#" + id + "_fps" ).text(1000/result);
}

function toRGBAString( r, g, b, a ){
  return "rgba(" + r + "," + g + "," + b + "," + a + ")";
}

function random( min, max ){
  return Math.floor( Math.random() * (max - min) ) + min;
}

function renderRandomFillRect( ctx, canvasDimension, params ){
  for(var x = 0; x < canvasDimension.width; x++){
    for(var y = 0; y < canvasDimension.width; y++){
      ctx.fillStyle = toRGBAString( random(0,256), random(0,256), random(0,256), 1 );
      ctx.fillRect( x, y, 1, 1);
    }
  }
}

function renderRandomImageData( ctx, canvasDimension, params ){
  var imageData = ctx.getImageData( 0, 0, canvasDimension.width, canvasDimension.height );
  var rawData = imageData.data;
  var totalPixels = canvasDimension.width * canvasDimension.height;
  var index = 0;
  for( var pixelIndex = 0; pixelIndex < totalPixels; pixelIndex++ ){
    rawData[index++] = random( 0, 256 );
    rawData[index++] = random( 0, 256 );
    rawData[index++] = random( 0, 256 );
    rawData[index++] = 256;
  }
  ctx.putImageData(imageData, 0, 0);
}

function precomputeRandomFillForRGBAString ( ctx, canvasDimension ){
  var pixels = []
  for(var x = 0; x < canvasDimension.width; x++){
    pixels[x] = [];
    for(var y = 0; y < canvasDimension.height; y++){
      pixels[x][y] = {
        r: random( 0, 256 ),
        g: random( 0, 256 ),
        b: random( 0, 256 ),
        a: 1,
      }
    }
  }
  return pixels;
}

function precomputeRandomFillForRGBAValues ( ctx, canvasDimension ){
  var pixels = []
  for(var x = 0; x < canvasDimension.width; x++){
    pixels[x] = [];
    for(var y = 0; y < canvasDimension.height; y++){
      pixels[x][y] = {
        r: random( 0, 256 ),
        g: random( 0, 256 ),
        b: random( 0, 256 ),
        a: 255,
      }
    }
  }
  return pixels;
}

function renderPrecomputed2DFillRect( ctx, canvasDimension, params ){
  for(var x = 0; x < canvasDimension.width; x++){
    for(var y = 0; y < canvasDimension.height; y++){
      ctx.fillStyle = toRGBAString( params[x][y].r, params[x][y].g, params[x][y].b, params[x][y].a );
      ctx.fillRect( x, y, 1, 1);
    }
  }
}

function renderPrecomputed2DImageData( ctx, canvasDimension, params ){
  var imageData = ctx.getImageData( 0, 0, canvasDimension.width, canvasDimension.height );
  var rawData = imageData.data;
  var totalPixels = canvasDimension.width * canvasDimension.height;
  var index = 0;
  
  for(var y = 0; y < canvasDimension.height; y++){
    for(var x = 0; x < canvasDimension.width; x++){
      rawData[index++] = params[x][y].r;
      rawData[index++] = params[x][y].g;
      rawData[index++] = params[x][y].b;
      rawData[index++] = params[x][y].a;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}



function precomputeRandomSeqFillForRGBAString ( ctx, canvasDimension ){
  var pixels = []
  var index = 0;
  for(var y = 0; y < canvasDimension.width; y++){
    for(var x = 0; x < canvasDimension.height; x++){
      pixels[index++] = random( 0, 256 );
      pixels[index++] = random( 0, 256 );
      pixels[index++] = random( 0, 256 );
      pixels[index++] = 1;
    }
  }
  return pixels;
}

function precomputeRandomSeqFillForRGBAValues ( ctx, canvasDimension ){
  var pixels = []
  var index = 0;
  for(var y = 0; y < canvasDimension.width; y++){
    for(var x = 0; x < canvasDimension.height; x++){
      pixels[index++] = random( 0, 256 );
      pixels[index++] = random( 0, 256 );
      pixels[index++] = random( 0, 256 );
      pixels[index++] = 255;
    }
  }
  return pixels;
}

function renderPrecomputedSeqFillRect( ctx, canvasDimension, params ){
  var index = 0;
  var count = 0;
  for(var y = 0; y < canvasDimension.height; y++){
    for(var x = 0; x < canvasDimension.width; x++){
      ctx.fillStyle = toRGBAString( params[index++], params[index++], params[index++], params[index++] );
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function renderPrecomputedSeqImageData( ctx, canvasDimension, params ){
  var imageData = ctx.getImageData( 0, 0, canvasDimension.width, canvasDimension.height );
  imageData.data = params;
  ctx.putImageData(imageData, 0, 0);
}
$("td > section").hide();
$("tr").click( 
  function(event){
    if($(event.target).prop('tagName').toLowerCase() != "button"){
      $( this ).find("section").slideToggle();
    }
  });

for( var testId in tests ){
  var calcButton = $("#calc_"+testId);
  if (calcButton.length > 0){
    (function(testId, tests) {
      calcButton.click( function (){
        var canvas = $( "#main_canvas" );
        var context = canvas.get(0).getContext("webgl-2d");
        var canvasDimension = {
          width: canvas.width(),
          height: canvas.height()
        };
        performRenderTest( "result_"+testId, context, canvasDimension, 1, tests[testId].testFunction, tests[testId].initFunction );
      });
    })(testId, tests);
  }
}