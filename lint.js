var fs = require('fs');

var data = fs.readFileSync(__dirname+'/test6.less').toString();

var tree = {data:'', children:[]};
tree.parent = tree;
var cur = tree.children[0] = {parent:tree};
var siblingContext = false;
var newAttribute = false;
var isSingleComment = false;
var emptyLine = true;

// split data into blocks
for (var i=0; i<data.length; i++) {
  if (emptyLine && clean(data[i]) != '') emptyLine = false;
  if (data[i] == '/' && (data[i+1] == '/' || i>0 && data[i-1] == '/')) {
    isSingleComment = true;
  }
  if (isSingleComment) {
    if (data[i] == '\n') isSingleComment = false;
  }
  if (isSingleComment) continue;

  if (data[i] == '\n' || data[i] == '\r') emptyLine = true;

  if (data[i] == '{') {
    cur.children = [];
    cur.children.push({parent:cur});
    cur = cur.children[0];
  } else if (data[i] == '}') {
    if (siblingContext) cur = cur.parent;
    siblingContext = true;
    newAttribute = false;
  } else if (data[i] == ';') {
    newAttribute = true;
  } else if (!emptyLine && data[i] != '\n' && data[i] != '\r' && data[i] != '\t') {
    if (siblingContext) {
      cur.parent.parent.children.push({parent:cur.parent.parent});
      cur = cur.parent.parent.children[cur.parent.parent.children.length-1];
      siblingContext = false;
    }
    if (newAttribute && clean(data[i]) != '' && !emptyLine) {
      cur.parent.children.push({parent:cur.parent});
      cur = cur.parent.children[cur.parent.children.length-1];
      newAttribute = false;
    }

    cur.data = cur.data || '';
    cur.data += data[i];
  }
}

// console.log('\nparsed\n');
// console.log(tree);

// (function clean(tree) {
//   if (tree.data) tree.data = clean(tree.data);
//   if (!tree.children) return;
//   for (var i=0; i<tree.children.length; i++) clean(tree.children[i]);
// })(tree);

(function annotate(tree) {
  if (tree.data) {
    tree.data = clean(tree.data);
    if (tree.data[0] == '@') tree.type = 'variable';
  }
  if (tree.children && tree.children.length) tree.type = 'block';
  if (tree.type != 'block' && tree.type != 'variable') tree.type = 'attribute';

  if (!tree.children) return;
  for (var i=0; i<tree.children.length; i++) annotate(tree.children[i]);
})(tree);

(function reorder(tree) {
  if (tree.type != 'block') return;
  var node;
  for (var i=0; i<tree.children.length; i++) {
    node = tree.children[i];

    if (node.type == 'variable') {
      var b = 0;
      var appendBefore = node.parent.children[b];

      while(appendBefore.type == 'variable' && appendBefore.data < node.data) {
        appendBefore = node.parent.children[++b];
      }

      node.parent.children.splice(i, 1);
      node.parent.children.splice(b, 0, node);
    }

    if (node.type == 'attribute') {
      var b = 0;
      var appendBefore = node.parent.children[b];

      while (appendBefore.type == 'variable' || appendBefore.type == 'attribute' &&
        appendBefore.data < node.data
      ) {
        appendBefore = node.parent.children[++b];
      }

      node.parent.children.splice(i, 1);
      node.parent.children.splice(b, 0, node);
    }

    if (node.type == 'block') reorder(node);
  }
})(tree);

// console.log('\nreordered\n');
// console.log(tree.children[0].children[1]);

function generateLess(tree, nest) {
  nest = nest || '';
  var buf = '';
  var newLine = false;
  if (tree.type != 'block') return nest+buf+';\n';
  var node;
  var lastType;
  for (var i=0; i<tree.children.length; i++) {
    if (newLine) {
      buf += '\n';
      newLine = false;
    }
    node = tree.children[i];

    if (node.data) {
      if (lastType == 'variable' && node.type != lastType) buf += '\n';
      if (lastType == 'attribute' && node.type == 'block') buf += '\n';

      buf += nest+node.data;
    }

    lastType = node.type;

    if (node.type != 'block') {
      if (node.data) buf += ';';
      buf += '\n';
      continue;
    }
    buf += ' {\n';
    if (node.type == 'block') buf += generateLess(node, nest+'  ');
    buf += nest+'}\n';
    newLine = true;
  }
  return buf;
};

console.log('');
console.log(generateLess(tree));

function clean(str) {
  return str.replace(/^\s+|\s+$/g, '');
}