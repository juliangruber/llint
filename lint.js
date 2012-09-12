var fs = require('fs');

var data = fs.readFileSync(__dirname+'/test.less').toString();

var tree = {data:'', children:[]};
tree.parent = tree;
var cur = tree.children[0] = {parent:tree};

// split data into blocks
for (var i=0; i<data.length; i++) {
  if (data[i] == '{') {
    cur.children = [];
    cur.children.push({parent:cur});
    cur = cur.children[cur.children.length-1];
  } else if (data[i] == '}') {
    cur.parent.parent.children.push({parent:cur.parent.parent});
    cur = cur.parent.parent.children[cur.parent.parent.children.length-1];
  } else if (data[i] == '\r' || data[i] == '\n') {
    cur.parent.children.push({parent:cur.parent});
    cur = cur.parent.children[cur.parent.children.length-1]
  } else {
    cur.data = cur.data || '';
    cur.data += data[i];
  }
}

console.log('\nparsed\n');
console.log(tree);

(function filter(tree) {
  if (!tree.children) return tree;
  var node;
  for (var i=0; i<tree.children.length; i++) {
    node = tree.children[i];
    if (!node.data) {
      tree.children.splice(i, 1);
      i--;
    }
    if (!node.children) continue;
    for (var j=0; j<node.children.length; j++) filter(node.children[j]);
  }
})(tree)

console.log('\nfiltered\n');
console.log(tree);

(function reorder(tree) {
  if (!tree.children) return tree;
  var node;
  for (var i=0; i<tree.children.length; i++) {
    node = tree.children[i];
    if (node.data.replace(/^[ \s]+/g, '')[0] == '@') {
      var b = 0;
      var appendBefore = node.parent.children[b];
      while (appendBefore.data.replace(/^[ \s]+/g, '')[0] == '@' &&
        appendBefore.data.replace(/^[ \s]+/g, '')[1] < node.data.replace(/^[ \s]+/g, '')[1]
      ) {
        appendBefore = node.parent.children[++b];
      }
      node.parent.children.splice(i, 1);
      node.parent.children.splice(b, 0, node);
    }
    if (!node.children) continue;
    for (var j=0; j<node.children.length; j++) reorder(node.children[j]);
  }
})(tree);

console.log('\nreordered\n');
console.log(tree);