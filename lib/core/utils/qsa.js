// Recursively collect all shadowRoots in the document
function collectShadowRoots(root = document) {
	const roots = Array.from(root.querySelectorAll('*')).map(el => el.shadowRoot).filter(Boolean);
	const childRoots = roots.map(collectShadowRoots);
	return roots.concat(...childRoots);
}

// Collect all slots and content elements
function collectDistributedNodes(root){
	const nodes = Array.from(root.querySelectorAll('content, slot')).map(node => {
		// handle the other slot case from axe.utils.getFlattenedTree ?
		return Array.from(
			node.nodeName === 'CONTENT' ? node.getDistributedNodes()
				: node.nodeName === 'SLOT' ? node.assignedNodes()
				: new Error('Unknown insertion point')
		);
	});
	return [].concat(...nodes);
}

/* <3 */
function deepQSA(root, selector) {
	const shadowRoots = collectShadowRoots(root);
	const roots = [root].concat(...shadowRoots);
	// exclude text nodes
	const distributedNodes = [].concat(...roots.map(collectDistributedNodes)).filter(node => !!node.querySelectorAll);
	const allRoots = roots.concat(...distributedNodes);
	// Fire off qSA from all shadowRoots and concat the results
	return [].concat(...allRoots.map(root => Array.from(root.querySelectorAll(selector))));
}

// these are hacks
Object.defineProperty(Node.prototype, 'actualNode', { get: function() { return this; }});
Object.defineProperty(Element.prototype, 'children', { get: function() {
	if (!this.shadowRoot) {
		return Array.from(this.childNodes);
	}
	const distribChildren = this.shadowRoot.childNodes;
	return [].concat(...this.childNodes).concat(...distribChildren);
}});

/**
 * querySelectorAll implementation that operates on the flattened tree (supports shadow DOM)
 * @method querySelectorAll
 * @memberof axe.utils
 * @instance
 * @param  {NodeList} domTree flattened tree collection to search
 * @param  {String} selector String containing one or more CSS selectors separated by commas
 * @return {NodeList} Elements matched by any of the selectors
 */
axe.utils.querySelectorAll = function (domTree, selector) {
	const trees = Array.isArray(domTree) ? domTree : [domTree];
	const results = trees.map(tree => deepQSA(tree.actualNode, selector));

	return [].concat(...results).map(actualNode => ({
		actualNode: actualNode,
	}));
};
