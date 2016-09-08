var test_ids;

function genreport(quiet)
{
	var r = "";
	var unknown = [];
	for (var i = 0; i < test_ids.length; ++i)
	{
		var id = test_ids[i];
		if (! document.getElementById(id))
			continue;
		var notes = document.getElementById('notes.' + id).value;
		var pass = (document.getElementById('status.' + id).value == 'y');
		var fail = (document.getElementById('status.' + id).value == 'n');
		if (! (pass || fail))
		{
			unknown.push(id);
			continue;
		}
		r += '  - id: ' + id + '\n    status: ' + (pass?'PASS':'FAIL') + '\n    notes: \'' + escape(notes) + '\'\n';
	}
	if (unknown.length && !quiet)
	{
		alert("Warning: Pass/fail unspecified for some tests - " + unknown.join(', '));
	}
	return '- ua: "' + navigator.userAgent + '"\n  results:\n' + r;
}

function submit()
{
	document.getElementsByTagName('form')[1].submit();
}
var submitTimer;

function loaded(frame, test)
{
	document.getElementById('loading').value = +document.getElementById('loading').value - 1;
	document.getElementById('status.'+test).value = 'l';
	function getResult()
	{
		var status = frame.contentWindow._testStatus;
		if (! status)
		{
			setTimeout(getResult, 1000); // Opera Mini doesn't like setInterval, so do repeated timeouts
			return;
		}

		document.getElementById('waiting').value = +document.getElementById('waiting').value - 1;

		var row = frame.parentNode.parentNode;

		document.getElementById('notes.'+test).value = status[1];

		if (status[0] == 'pass')
		{
			document.getElementById('passed').value = +document.getElementById('passed').value + 1;
			chosen('y', test);
			row.className = 'result pass';
		}
		else if (status[0] == 'fail')
		{
			document.getElementById('failed').value = +document.getElementById('failed').value + 1;
			chosen('n', test);
			row.className = 'result fail';
		}
		else
		{
			row.className = 'result unknown';
		}

		// XXX
		//document.getElementById('report').value = genreport(true);
		//if (document.getElementById('waiting').value == 300) submit();
	}
	setTimeout(getResult, 1000);
}

var next_selected = '';
function chosen(which, test, jump)
{
	document.getElementById('status.'+test).value = which;
	document.getElementById('status.y.'+test).className = (which == 'y' ? 'answer chosen' : 'answer');
	document.getElementById('status.n.'+test).className = (which == 'n' ? 'answer chosen' : 'answer');
	if (jump)
	{
		window.location.hash = test;
	
		var r = document.getElementById(test);
		while (r && document.getElementById('status.'+r.id).value != 'l')
			r = r.nextSibling;

		if (next_selected)
			document.getElementById('framecell.'+next_selected).className = '';
		if (r)
		{
			next_selected = r.id;
			document.getElementById('framecell.'+next_selected).className = 'highlight';
		}
	}
}

function createTable(tests)
{
	var args = location.search.substring(1).split(',');
	if (! (args[0] && args[1]))
	{
		alert("Please use this like reportgen.html?pagesize,pagenum");
		return;
	}
	var pagesize = +args[0];
	var page = +args[1];

	var first_test = page*pagesize;
	var total_tests = Math.min(tests.length, (page+1)*pagesize) - first_test;

	document.getElementById('loading').value = total_tests;
	document.getElementById('waiting').value = total_tests;
	document.getElementById('passed').value = 0;
	document.getElementById('failed').value = 0;
	test_ids = [];
	for (var i = 0; i < total_tests; ++i)
	{
		var item = tests[first_test + i];

		test_ids.push(item);
		document.write(
			'<tr class="result waiting" id="'+item+'"><td><a href="'+item+'.html">'+item+'</a>\n' +
			'<td id="framecell.'+item+'">' +
			    '<iframe width="200" height="200" id="frame.'+item+'" src="minimal.'+item+'.html" onload="loaded(this, \''+item+'\')"></iframe>\n' +
			    '<input type="hidden" id="status.'+item+'" value="">\n' +
			'<td><input type="button" class="answer" id="status.y.'+item+'" onclick="chosen(\'y\', \''+item+'\', 1)" value="PASS">\n' +
			'<td><input type="button" class="answer" id="status.n.'+item+'" onclick="chosen(\'n\', \''+item+'\', 1)" value="FAIL">\n' +
			'<td><input type="text" id="notes.'+item+'">\n'
		);
	}
}

function showUnfinished()
{
	document.body.className += ' showunfinished';
}

function showAll()
{
	document.body.className += ' showall';
}

function makeObjects()
{
	// This is needed in at least some versions of WebKit
	var frames = document.getElementsByTagName('iframe');
	for (var i = frames.length-1; i >= 0; --i) // go backwards to avoid suffering when 'frames' changes
	{
		var frame = frames[i];
		var obj = document.createElement('object');
		obj.setAttribute('width', frame.getAttribute('width'));
		obj.setAttribute('height', frame.getAttribute('height'));
		obj.setAttribute('id', frame.getAttribute('id'));
		obj.setAttribute('data', frame.getAttribute('src'));
		frame.parentNode.replaceChild(obj, frame);
	}
}

function reloadAll()
{
	var frames = document.getElementsByTagName('iframe');

	function f(i) {
		if (i >= frames.length) return;
		var frame = frames[i];
		var old = frame.onload;
		frame.onload = function() { old.call(frame); f(i+1) };
		frame.src = frame.src;
	}

	f(0);
}

function avoidFrameLimit()
{
	// WebKit limits to 200 frames (iframes+objects etc) per page, which
	// is irritating
	var frames = document.getElementsByTagName('iframe');
	for (var i = frames.length-1; i >= 0; --i) // go backwards to avoid suffering when 'frames' changes
	{
		var frame = frames[i];
		var id = frame.id.replace(/^frame\./, "");
		var status = document.getElementById('status.' + id).value;
		if (status == 'y' || status == 'n')
			frame.parentNode.removeChild(frame);
	}

	var frames = document.getElementsByTagName('iframe');
	for (var i = 0; i < frames.length; ++i)
	{
		var frame = frames[i];
		var id = frame.id.replace(/^frame\./, "");
		var status = document.getElementById('status.' + id).value;
		if (status == '')
			frame.setAttribute('src', frame.getAttribute('src'));
	}
}

document.onkeypress = function (e)
{
	var key;
	if (e)
		key = e.which;
	else
		key = window.event.keyCode;

	var status;
	if (key == 121)
		status = 'y';
	else if (key == 110)
		status = 'n';
	else
		return;
	
	if (next_selected)
		chosen(status, next_selected, 1);

};
