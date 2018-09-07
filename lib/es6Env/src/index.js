import {diffList as diff} from './lib/diffList';

var oldList = [{id: "a"}, {id: "b"}, {id: "c"}, {id: "d"}, {id: "e"}]
var newList = [{id: "c"}, {id: "a"}, {id: "b"}, {id: "e"}, {id: "f"}]

var moves = diff(oldList, newList, "id")
// `moves` is a sequence of actions (remove or insert): 
// type 0 is removing, type 1 is inserting
// moves: [
//   {index: 3, type: 0},
//   {index: 0, type: 1, item: {id: "c"}}, 
//   {index: 3, type: 0}, 
//   {index: 4, type: 1, item: {id: "f"}}
//  ]
console.log(moves)
moves.moves.forEach(function(move) {
  if (move.type === 0) {
    oldList.splice(move.index, 1) // type 0 is removing
  } else {
    oldList.splice(move.index, 0, move.item) // type 1 is inserting
  }
})

// now `oldList` is equal to `newList`
// [{id: "c"}, {id: "a"}, {id: "b"}, {id: "e"}, {id: "f"}]
console.log(oldList) 