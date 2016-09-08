#import psyco
#psyco.full()

import html5lib
import html5lib.treebuilders.dom

def extract():
	parser = html5lib.html5parser.HTMLParser(tree=html5lib.treebuilders.dom.TreeBuilder)
	doc = parser.parse(open('current-work'), encoding='utf-8')

	head = doc.getElementsByTagName('head')[0]
	for n in head.childNodes:
		if n.tagName == 'script':
			head.removeChild(n)

	header = doc.getElementsByTagName('header')[0]
	#thecanvas = doc.getElementById('the-canvas') # doesn't work (?!)
	thecanvas = [ n for n in doc.getElementsByTagName('h4') if n.getAttribute('id') == 'the-canvas-element' ][0]
	
	keep = [header, thecanvas]
	node = thecanvas.nextSibling
	while node.nodeName != 'h4':
		keep.append(node)
		node = node.nextSibling
	p = thecanvas.parentNode
	for n in p.childNodes[:]:
		if n not in keep:
			p.removeChild(n)
	
	for n in header.childNodes[3:-4]:
		header.removeChild(n)
	
	def make_absolute(uri):
		if uri[0] == '/':
			return 'http://www.whatwg.org' + uri
		else:
			return 'http://www.whatwg.org/specs/web-apps/current-work/' + uri
	
	# Fix the stylesheet, icon and image references
	for e in doc.getElementsByTagName('link'):
		e.setAttribute('href', make_absolute(e.getAttribute('href')))
	for img in doc.getElementsByTagName('img'):
		img.setAttribute('src', make_absolute(img.getAttribute('src')))
	
	# Convert to XHTML5, because it's quicker to re-parse than HTML5
	doc.documentElement.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml')
	doc.documentElement.setAttribute('xml:lang', doc.documentElement.getAttribute('lang'))
	doc.removeChild(doc.firstChild) # remove the DOCTYPE
	
	open('current-work-canvas.xhtml', 'w').write(doc.toxml(encoding = 'UTF-8'))
	
extract()
