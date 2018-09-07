/**
 * Diff two list in O(N).
 * @param {Array} oldList - Original List
 * @param {Array} newList - List After certain insertions, removes, or moves
 * @return {Object} - {moves: <Array>}
 *                  - moves is a list of actions that telling how to remove and insert
 */
function diff (oldList, newList, key) {
    var oldMap = makeKeyIndexAndFree(oldList, key)
    var newMap = makeKeyIndexAndFree(newList, key)
  
    var newFree = newMap.free
  
    var oldKeyIndex = oldMap.keyIndex
    var newKeyIndex = newMap.keyIndex
  
    var moves = []
  
    // a simulate list to manipulate
    var children = []
    var i = 0
    var item
    var itemKey
    var freeIndex = 0
  
    // first pass to check item in old list: if it's removed or not
    // 遍历旧的集合
    while (i < oldList.length) {
      item = oldList[i]
      itemKey = getItemKey(item, key)//itemKey a
      // 是否可以取到
      if (itemKey) {
        // 判断新集合中是否有这个属性，如果没有则push null
        if (!newKeyIndex.hasOwnProperty(itemKey)) {
          children.push(null)
        } else {
          // 如果有 去除在新列表中的位置
          var newItemIndex = newKeyIndex[itemKey]
          children.push(newList[newItemIndex])
        }
      } else {
        var freeItem = newFree[freeIndex++]
        children.push(freeItem || null)
      }
      i++
    }

// children [{id:"a"},{id:"b"},{id:"c"},null,{id:"e"}]
  
    var simulateList = children.slice(0)//[{id:"a"},{id:"b"},{id:"c"},null,{id:"e"}]
  
    // remove items no longer exist
    i = 0
    while (i < simulateList.length) {
      if (simulateList[i] === null) {
        remove(i)
        removeSimulate(i)
      } else {
        i++
      }
    }
  
    // i is cursor pointing to a item in new list
    // j is cursor pointing to a item in simulateList
    var j = i = 0
    while (i < newList.length) {
      item = newList[i]
      itemKey = getItemKey(item, key)//c
  
      var simulateItem = simulateList[j] //{id:"a"}
      var simulateItemKey = getItemKey(simulateItem, key)//a
  
      if (simulateItem) {
        if (itemKey === simulateItemKey) {
          j++
        } else {
          // 新增项，直接插入
          if (!oldKeyIndex.hasOwnProperty(itemKey)) {
            insert(i, item)
          } else {
            // if remove current simulateItem make item in right place
            // then just remove it
            var nextItemKey = getItemKey(simulateList[j + 1], key)
            if (nextItemKey === itemKey) {
              remove(i)
              removeSimulate(j)
              j++ // after removing, current j is right, just jump to next one
            } else {
              // else insert item
              insert(i, item)
            }
          }
        }
      } else {
        insert(i, item)
      }
  
      i++
    }
  
    //if j is not remove to the end, remove all the rest item
    var k = simulateList.length - j
    while (j++ < simulateList.length) {
      k--
      remove(k + i)
    }
  
  
    // 记录旧的列表中移除项 {index:3,type:0}
    function remove (index) {
      var move = {index: index, type: 0}
      moves.push(move)
    }
  
    function insert (index, item) {
      var move = {index: index, item: item, type: 1}
      moves.push(move)
    }
  
    // 删除simulateList中null
    function removeSimulate (index) {
      simulateList.splice(index, 1)
    }
  
    return {
      moves: moves,
      children: children
    }
  }
  
  /**
   * Convert list to key-item keyIndex object.
   * 将列表转换为 key-item 的键值对象
   * [{id: "a"}, {id: "b"}, {id: "c"}, {id: "d"}, {id: "e"}] -> [a:0,b:1,c:2...]
   * @param {Array} list
   * @param {String|Function} key
   */
  function makeKeyIndexAndFree (list, key) {
    var keyIndex = {}
    var free = []
    for (var i = 0, len = list.length; i < len; i++) {
      var item = list[i]
      var itemKey = getItemKey(item, key)
      if (itemKey) {
        keyIndex[itemKey] = i
      } else {
        free.push(item)
      }
    }
    return {
      keyIndex: keyIndex,
      free: free
    }
  }
  
  // 获取置顶key的value
  function getItemKey (item, key) {
    if (!item || !key) return void 666
    return typeof key === 'string'
      ? item[key]
      : key(item)
  }
  
  exports.makeKeyIndexAndFree = makeKeyIndexAndFree 
  exports.diffList = diff