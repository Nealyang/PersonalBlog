
import {Element as el} from '../test-diff/element';
import {patch} from '../test-diff/patch';
import {diff} from '../test-diff/diff';
var count = 0
function renderTree () {
    console.log(1)
    debugger
  count++
  var items = []
  var color = (count % 2 === 0)
    ? 'blue'
    : 'red'
  for (var i = 0; i < count; i++) {
    items.push(el('li', ['Item #' + i]))
  }
  return el('div', {'id': 'container'}, [
    el('h1', {style: 'color: ' + color}, ['simple virtal dom']),
    el('p', ['the count is :' + count]),
    el('ul', items)
  ])
}
var tree = renderTree()
// var root = tree.render()
document.body.appendChild(root)
// setInterval(function () {
//   var newTree = renderTree()
//   var patches = diff(tree, newTree)
//   console.log(patches)
//   patch(root, patches)
//   tree = newTree
// }, 1000)