/**
 * @class
 * @classdesc Acts as an intermediate controller between [Workspace]{@link Syntree.Workspace} and elements of the tree.
 */
Syntree.Page = function() {

    var wWidth = $('#workspace').width();
    var wHeight = $('#workspace').height();
    this.background = Syntree.snap.rect(
        -1 * wWidth,
        -1 * wHeight,
        wWidth * 4,
        wHeight * 4
    );
    this.background.attr({
        fill:'white',
        id:'page-background',
    });

    this.group = Syntree.snap.g();

    // Multi-tree support: each entry = { tree, elements, group }
    this.trees = [];
    this.treeIndex = -1;

    this.allElements = {};
    this.selectedElement = undefined;

    this._enablePanning();
}

/**
 * Get the panning transform matrix.
 *
 * @returns {object} - deltax, deltay, and the global transform matrix
 *
 * @see Syntree.Page#_enablePanning
 * @see Syntree.Page#pan
 */
Syntree.Page.prototype.getTransform = function() {
    var t = this.group.transform().globalMatrix;
    var dx = t.e;
    var dy = t.f;
    return {
        dx: dx,
        dy: dy,
        globalMatrix: t,
    }
}

/**
 * Add an Element to the list of all elements.
 *
 * @param {Syntree.Element} element - the element to register
 *
 * @see Syntree.Page#allElements
 */
Syntree.Page.prototype.register = function(element) {
    element = Syntree.Lib.checkArg(element, element.isElement);

    this.allElements[element.getId()] = element;
    // Also register in active tree's element map
    if (this.treeIndex >= 0) {
        this.trees[this.treeIndex].elements[element.getId()] = element;
    }
    var targetGroup = (this.treeIndex >= 0) ? this.trees[this.treeIndex].group : this.group;
    for (l in element.graphic.getAllEls()) {
        var el = element.graphic.getAllEls()[l];
        var el_obj = el.el_obj;
        if (typeof el_obj.paper !== 'undefined') {
            targetGroup.add(el_obj);
        }
    }
}

/**
 * Remove the specified Element from the list of all elements.
 *
 * @param {Syntree.Element} element - the element to deregister
 *
 * @see Syntree.Page#register
 */
Syntree.Page.prototype.deregister = function(element) {
    element = Syntree.Lib.checkArg(element, element.isElement);
    delete this.allElements[element.getId()];
}

/**
 * Select the given Element. (And deselect the previous Element.)
 *
 * @param {Syntree.Element} element - the element to select
 *
 * @see Syntree.Page#selectedElement
 */
Syntree.Page.prototype.select = function(element) {
    element = Syntree.Lib.checkArg(element, element.isSelectable);

    if (!Syntree.Lib.checkType(this.selectedElement, 'undefined')) {
        this.deselect();
    }

    this.selectedElement = element;
    element.select();

    new Syntree.Action('select', {
        selected_obj: element,
    });
}

/**
 * Deselect the currently selected Element.
 *
 * @see Syntree.Page#select
 */
Syntree.Page.prototype.deselect = function() {
    if (Syntree.Lib.checkType(this.selectedElement, this.selectedElement.isSelectable)) {
        this.selectedElement.deselect();
        this.selectedElement = undefined;
    }
}

/**
 * A wrapper function around Node.delete, allowing us to easily delete a whole subtree.
 *
 * @see Syntree.Element#delete
 */
Syntree.Page.prototype.deleteTree = function(tree) {
    tree = Syntree.Lib.checkArg(tree, ['tree', 'node']);
    if (Syntree.Lib.checkType(tree, 'node')) {
        tree = new Syntree.Tree({
            root: this.allElements[tree.id],
        });
    }

    var treestring = tree.getTreestring();
    var parent = tree.getRoot().getParent();
    var index = parent.getChildren().indexOf(tree.getRoot());
    tree.delete();
    if (Syntree.Lib.checkType(parent, 'node')) {
        temptree = new Syntree.Tree({
            root: parent,
        });
        temptree.distribute();
    }
    new Syntree.Action('delete', {
        deleted_obj: tree,
        treestring: treestring,
        parent: parent,
        index: index,
    });
}

/**
 * Check if given Element is registered with Page.
 *
 * @param {Syntree.Element} element - the element to check
 *
 * @returns {boolean} - whether or not the element is registered
 */
Syntree.Page.prototype.isRegistered = function(element) {
    element = Syntree.Lib.checkArg(element, element.isElement);
    return !Syntree.Lib.checkType(this.allElements[element.getId()], 'undefined');
}

/**
 * Accessor function for Page.selectedElement.
 *
 * @see Syntree.Page#selectedElement
 */
Syntree.Page.prototype.getSelected = function() {
    return this.selectedElement;
}

/**
 * Get all Elements, filtered by given type.
 *
 * @param {string} type - a string representing the Element type to filter by
 *
 * @returns {object} - all matching Elements, referenced by id
 */
Syntree.Page.prototype.getElementsByType = function(type) {
    type = Syntree.Lib.checkArg(type,'string');

    var res = {};
    for (id in this.allElements) {
        if (Syntree.Lib.checkType(this.allElements[id], type)) {
            res[id] = this.allElements[id];
        }
    }
    return res;
}

/**
 * Create a movement arrow from the selected [Node]{@link Syntree.Node} to the clicked [Node]{@link Syntree.Node}.
 *
 * @param {Syntree.Node} node - the node that was clicked
 *
 * @returns {Syntree.Arrow} - the new Arrow
 */
Syntree.Page.prototype.createMovementArrow = function(node) {
    if (Syntree.Lib.checkType(this.getSelected(), 'node')) {
        var a = new Syntree.Arrow({
            fromNode: this.getSelected(),
            toNode: node,
        });
        return a;
    }
}

/**
 * Add a tree to the page.
 * If you do not provide a parent [Node]{@link Syntree.Node}, the main tree will be replaced.
 *
 * @param {Syntree.Tree} [tree] - the Tree object to add.
 * @param {Syntree.Node} [parent] - the Node to which the root of the Tree will be added
 * @param {number} [index=0] - the index at which to add the root of Tree
 */
Syntree.Page.prototype.addTree = function(tree, parent, index) {
    tree = Syntree.Lib.checkArg(tree, 'tree', '#undefined');
    parent = Syntree.Lib.checkArg(parent, 'node', '#undefined');
    index = Syntree.Lib.checkArg(index, 'number', 0);

    // Create a new per-tree group
    var treeGroup = Syntree.snap.g();
    this.group.add(treeGroup);

    var slot = { tree: null, elements: {}, group: treeGroup };
    this.trees.push(slot);
    this.treeIndex = this.trees.length - 1;
    this.allElements = slot.elements;

    if (!Syntree.Lib.checkType(tree, 'tree')) {
        var root = new Syntree.Node({
            x: $('#workspace').width() / 2,
            y: $('#toolbar').height() + 20,
            labelContent: 'S',
        });
        this.tree = new Syntree.Tree({ root: root });
        this.tree.root.editingAction('save');
    } else {
        if (!Syntree.Lib.checkType(parent, 'node')) {
            this.tree = tree;
            tree.distribute();
        } else {
            index = Syntree.Lib.checkArg(index, 'number', 0);
            parent.addChild(tree.root, index);
            var temp = new Syntree.Tree({ root: parent });
            temp.distribute();
        }
    }
    slot.tree = this.tree;
    Syntree.Workspace.updateSidebar();
}

Syntree.Page.prototype.switchTree = function(index) {
    if (index < 0 || index >= this.trees.length || index === this.treeIndex) return;
    // Hide current
    if (this.treeIndex >= 0) {
        this.trees[this.treeIndex].group.attr({ display: 'none' });
    }
    this.treeIndex = index;
    var slot = this.trees[index];
    slot.group.attr({ display: '' });
    this.tree = slot.tree;
    this.allElements = slot.elements;
    this.selectedElement = undefined;
    this.select(this.tree.getRoot());
    Syntree.Workspace.updateSidebar();
}

Syntree.Page.prototype.removeTree = function(index) {
    if (this.trees.length <= 1) return; // keep at least one
    var slot = this.trees[index];
    slot.tree.delete();
    slot.group.remove();
    this.trees.splice(index, 1);
    var newIndex = Math.min(index, this.trees.length - 1);
    this.treeIndex = -1; // force switch
    this.switchTree(newIndex);
}

/**
 * Create a [Tree]{@link Syntree.Tree} from a treestring, and then add it to the page.
 * If you do not provide a parent [Node]{@link Syntree.Node}, the main tree will be replaced.
 *
 * @param {Syntree.Tree} treestring - the treestring which the Tree will build from
 * @param {Syntree.Node} [parent] - the Node to which the root of the Tree will be added
 * @param {number} [index=0] - the index at which to add the root of Tree
 */
Syntree.Page.prototype.openTree = function(treestring,parent,index) {
    treestring = Syntree.Lib.checkArg(treestring, 'string');
    parent = Syntree.Lib.checkArg(parent, 'node', '#undefined');
    index = Syntree.Lib.checkArg(index, 'number', 0);

    var newTree = new Syntree.Tree({
        build_treestring: treestring,
    });
    this.addTree(newTree,parent,index);
}

/**
 * Get a string of SVG markup representing all marked objects on the page.
 *
 * @returns {string} - the SVG string
 */
Syntree.Page.prototype.getSVGString = function() {
    var selected = this.getSelected();
    this.deselect();
    var bgsvg = this.background.node.outerHTML;
    var elementssvg = '';
    var elements = this.allElements;
    for (id in elements) {
        elementssvg += elements[id].graphic.getSVGString();
    }
    var style = '<style type="text/css">text{font-family:sans-serif;font-size:14px;}</style>';
    var marker = $('marker')[0].outerHTML;
    this.select(selected);
    return style + marker + bgsvg + elementssvg;
}

/**
 * Get the Node nearest to the given coordinates or Element.
 *
 * @param {number|Syntree.Element} a - x coordinate or Element to search from
 * @param {number} [b] - if a is a an x coordinate, the corresponding y coordinate
 * @param {function} [condition] - function that must return true for a Node to be considered in the search
 *
 * @returns {object|boolean} - data object on success, false on failure
 */
Syntree.Page.prototype.getNearestNode = function(a,b,condition) {
    condition = Syntree.Lib.checkArg(condition, 'function', function(){return true;});

    if (Syntree.Lib.checkType(a, 'number')) {
        var x = a;
        var y = Syntree.Lib.checkType(b, 'number');
    } else {
        a = Syntree.Lib.checkArg(a, a.isElement);
        var x = a.getPosition().x;
        var y = a.getPosition().y;
        var ignoreNode = a;
    }

    var allNodes = this.getElementsByType('node');
    var nearestNode;
    var leastDist = Number.POSITIVE_INFINITY;
    for (id in allNodes) {
        var node = allNodes[id];
        if (ignoreNode && node === ignoreNode) {
            continue;
        }
        var pos = node.getPosition();
        var distance = Syntree.Lib.distance({
            x1: pos.x,
            y1: pos.y,
            x2: x,
            y2: y,
        })
        if (distance < leastDist && condition(x, y, node)) {
            leastDist = distance;
            nearestNode = node;
        }
    }
    if (Syntree.Lib.checkType(nearestNode, 'node')) {
        return {
            node: nearestNode,
            dist: leastDist,
            deltaX: x - nearestNode.getPosition().x,
            deltaY: y - nearestNode.getPosition().y,
        }
    } else {
        return false;
    }
}

/**
 * Select the node in the specified direction, or create a node there if one does not exist.
 *
 * @param {string} direction - 'left' or 'right'
 * @param {boolean} [fcreate=false] - force create instead of navigate
 *
 * @see Syntree.Workspace._eventRight
 * @see Syntree.Workspace._eventLeft
 */
Syntree.Page.prototype.navigateHorizontal = function(direction, fcreate) {
    direction = Syntree.Lib.checkArg(direction, 'string');
    fcreate = Syntree.Lib.checkArg(fcreate, 'boolean', false);

    if (direction === 'left') {
        var left = true;
        var right = false;
        var n = 0;
    } else if (direction === 'right') {
        var right = true;
        var left = false;
        var n = 1;
    } else {
        return;
    }

    if (!Syntree.Lib.checkType(this.getSelected(), 'node')) {
        this.select(this.tree.getRoot);
    }

    if (Syntree.Lib.checkType(this.getSelected(), 'node') && Syntree.Lib.checkType(this.getSelected().getParent(), 'node')) {
        var off = this.tree.getNodeOffset(this.tree.getRoot(), this.getSelected());
        var rowNodes = this.tree.getNodesByOffset(off);
        var selectedIndex = rowNodes.indexOf(this.getSelected());
        var real = this.getSelected().getState('real');

        if (right) {
            if (selectedIndex === rowNodes.length - 1 || fcreate) {
                if (real) {
                    var siblingIndex = this.getSelected().getParent().getChildren().indexOf(this.getSelected());
                    var newNode = new Syntree.Node({});
                    this.getSelected().getParent().addChild(newNode,siblingIndex + 1);
                    var tree = new Syntree.Tree({
                        root:this.getSelected().getParent(),
                    });
                    tree.distribute();
                    this.select(newNode);
                    this.nodeEditing('init');
                } else {
                    return;
                }
            } else {
                this.select(rowNodes[selectedIndex + 1]);
            }
        } else {
            if (selectedIndex === 0 || fcreate) {
                if (real) {
                    var siblingIndex = this.getSelected().getParent().getChildren().indexOf(this.getSelected());
                    var newNode = new Syntree.Node({});
                    this.getSelected().getParent().addChild(newNode, siblingIndex);
                    var tree = new Syntree.Tree({
                        root:this.getSelected().getParent(),
                    });
                    tree.distribute();
                    this.select(newNode);
                    this.nodeEditing('init');
                } else {
                    return;
                }
            } else {
                this.select(rowNodes[selectedIndex - 1]);
            }
        }

    }
}

/**
 * Select the parent of the currently selected Node
 */
Syntree.Page.prototype.navigateUp = function() {
    if (!Syntree.Lib.checkType(this.getSelected(), 'node')) {
        this.select(this.tree.getRoot);
    }

    if (Syntree.Lib.checkType(this.getSelected(), 'node') && Syntree.Lib.checkType(this.getSelected().getParent(), 'node')) {
        this.select(this.getSelected().getParent());
    }
}

/**
 * Select the most recently selected child of the currently selected node, or creates a child if one does not exist.
 * Defaults to the left-most child if no most recently selected.
 *
 * @param {boolean} [fcreate=false] - force creation instead of navigation
 */
Syntree.Page.prototype.navigateDown = function(fcreate) {
    fcreate = Syntree.Lib.checkArg(fcreate, 'boolean', false);

    if (!Syntree.Lib.checkType(this.getSelected(), 'node')) {
        this.select(this.tree.getRoot());
    }

    if (Syntree.Lib.checkType(this.getSelected(), 'node')) {
        if (this.getSelected().getChildren().length > 0 && !fcreate) {
            var possibleSelects = this.getSelected().getChildren();
            var selectHistory = Syntree.History.getNodeSelects();
            for (i = 0; i < selectHistory.length; i++) {
                if (possibleSelects.indexOf(selectHistory[i].selected_obj) >= 0) {
                    this.select(this.allElements[selectHistory[i].selected_obj.id]);
                    return;
                }
            }
            this.select(this.getSelected().getChildren()[0]);
        } else if (this.getSelected().getState('real')) {
            var newNode = new Syntree.Node({
                x: 0,
                y: 0,
                labelContent: '',
            });
            this.getSelected().addChild(newNode);
            var tree = new Syntree.Tree({
                root: this.getSelected(),
            });
            tree.distribute();
            this.select(newNode);
            this.nodeEditing('init');
        }
    }
}

/**
 * Execute an editing action on given Node.
 *
 * @param {string} type - 'init', 'update', 'toggle', 'save', 'cancel'
 * @param {Syntree.Node} [node=Syntree.Page.selectedNode] - the node to target
 * @param
 */
Syntree.Page.prototype.nodeEditing = function(type, node) {
    type = Syntree.Lib.checkArg(type, 'string');
    node = Syntree.Lib.checkArg(node, 'node', this.getSelected());
    node = Syntree.Lib.checkArg(node, 'node');

    if (type === 'init') {
        node.editingAction('init');
    } else if (type === 'update') {
        node.editingAction('update');
    } else if (type === 'toggle') {
        if (node.getState('editing')) {
            this.nodeEditing('save');
        } else {
            this.nodeEditing('init');
        }
    } else if (type === 'save') {
        if (node.getState('real')) {
            var pre = node.beforeEditLabelContent;
            var post = node.getLabelContent();
            new Syntree.Action('save', {
                node: node,
                pre: pre,
                post: post,
            });
        } else {
            new Syntree.Action('create', {
                created_obj: node,
            });
        }
        node.editingAction('save');
        if (this.getSelected().getParent()) {
            var tree = new Syntree.Tree({
                root:this.getSelected().getParent(),
            });
            tree.distribute();
        }
    } else if (type === 'cancel') {
        if (node.getState('editing')) {
            node.editingAction('cancel');
            if (!node.getState('real')) {
                this.nodeDelete(node);
            }
        }
    }
}

Syntree.Page.prototype.toString = function() {
    return '[object Page]'
}

/**
 * Make custom handlers and attach them for panning functionality.
 */
Syntree.Page.prototype._enablePanning = function() {
    this._move = function(dx,dy) {

        this.attr({
                    transform: this.data('origTransform') + (this.data('origTransform') ? 'T' : 't') + [dx, dy],
                });
        // This allows us to make page elements pan as well, but still make panning happen only on background click.
        Syntree.Workspace.page.group.attr({
                    transform: this.data('origTransform') + (this.data('origTransform') ? 'T' : 't') + [dx, dy],
                });

        this.data('oldDX', dx);
        this.data('oldDY', dy);
    }

    this._end = function(dx,dy) {
        var t = Syntree.Workspace.page.getTransform();
        var top = $('.editor_container').position().top;
        var left = $('.editor_container').position().left;
        $('.editor_container').css({
            'top': t.dy + 'px',
            'left': t.dx + 'px',
        });
    }

    this._start = function() {
        this.data('origTransform', this.transform().local);
    }

    this.background.drag(this._move, this._start, this._end);
}