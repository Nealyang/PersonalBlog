## 开篇说明

> 对的，让你所见，又开始造轮子了。哈哈，造轮子我们是认真的~

源码阅读是必须的，Underscore是因为刚刚学习整理了一波函数式编程，加上自己曾经没有太多阅读源码的经验，先拿Underscore练练手，跟着前辈们走一走，学一学。也相同时能够夯实js基础，从源码中学习到更多的编码技巧

Underscore源码阅读大致按照[官方文档](http://www.css88.com/doc/underscore/#collections)来编写.尽量的说明每一个函数的写法，希望自己可以从中可以收获大神的编码功力。 


[github:Personal_Blog](https://github.com/Nealyang/PersonalBlog/)


## 阅读目录

- [窥探Underscore源码系列-开篇](https://github.com/Nealyang/PersonalBlog/blob/master/201804/%E7%AA%A5%E6%8E%A2Underscore%E6%BA%90%E7%A0%81%E7%B3%BB%E5%88%97-%E5%BC%80%E7%AF%87%E4%BB%8B%E7%BB%8D.md)
- [窥探Underscore源码系列-工具](#)
- [窥探Underscore源码系列-集合](#)
- [窥探Underscore源码系列-数组](#)
- [窥探Underscore源码系列-函数](#)
- [窥探Underscore源码系列-对象](#)
- [窥探Underscore源码系列-感悟](#)

> [Underscore源码+注释地址](https://github.com/Nealyang/PersonalBlog/blob/master/lib/underscore/underscore.js)
## 源码阅读


### 整体结构、变量介绍

```
(function(){}())
```

常规操作哈，跟jQuery一毛一样，通过IIFE来包裹业务逻辑，目的简单：1、避免全局污染。2、保护隐私

```
  var root = typeof self == 'object' && self.self === self && self ||
            typeof global == 'object' && global.global === global && global ||
            this ||
            {};
  var previousUnderscore = root._;
```
通过global和self来判断是node环境还是window环境，说白了，就是为了拿到全局变量。因为我们需要一个全局的变量_,所以为了防止冲突，我们这里拿到root后，先暂存下之前的root._

```
  var ArrayProto = Array.prototype, ObjProto = Object.prototype;
  var SymbolProto = typeof Symbol !== 'undefined' ? Symbol.prototype : null;

  var push = ArrayProto.push,
      slice = ArrayProto.slice,
      toString = ObjProto.toString,
      hasOwnProperty = ObjProto.hasOwnProperty;

  var nativeIsArray = Array.isArray,
      nativeKeys = Object.keys,
      nativeCreate = Object.create;

  var Ctor = function(){};

  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  if (typeof exports != 'undefined' && !exports.nodeType) {
    if (typeof module != 'undefined' && !module.nodeType && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  _.VERSION = '1.8.3';
```
由于Underscore本身依赖很多原生js的方法，所以这里为了避免原型链的查找性能消耗，Underscore通过局部变量来保存一些常用的对象和方法。既可以提升性能，减少对象成员访问深度也可以减少代码的冗长。

下面的Ctor和_ 是为了面向对象而准备的。

### 迭代

```
  var optimizeCb = function(func, context, argCount) {
    if (context === void 0) return func;
    switch (argCount == null ? 3 : argCount) {
      case 1: return function(value) {
        return func.call(context, value);
      };
      case 3: return function(value, index, collection) {
        return func.call(context, value, index, collection);
      };
      case 4: return function(accumulator, value, index, collection) {
        return func.call(context, accumulator, value, index, collection);
      };
    }
    return function() {
      return func.apply(context, arguments);
    };
  };

  var builtinIteratee;

  var cb = function(value, context, argCount) {
    if (_.iteratee !== builtinIteratee) return _.iteratee(value, context);
    if (value == null) return _.identity;
    if (_.isFunction(value)) return optimizeCb(value, context, argCount);
    if (_.isObject(value) && !_.isArray(value)) return _.matcher(value);
    return _.property(value);
  };

  _.iteratee = builtinIteratee = function(value, context) {
    return cb(value, context, Infinity);
  };
```

这里的迭代，我们需要理清楚一个概念，在Underscore中，我们需要改变那种命令式的编程方式，具体的可以看我之前写的关于函数式编程的文章哈。

所以这里想说的就是关于遍历迭代的东西。

```
var results = _.map([1,2,3],function(elem){
  return elem*2;
}); // => [2,4,6]

_.map = _.collect = function (obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length,
        results = Array(length); // 定长初始化数组
    for (var index = 0; index < length; index++) {
        var currentKey = keys ? keys[index] : index;
        results[index] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
};
```
我们传递给的 _.map 的第二个参数就是一个 iteratee，他可能是函数，对象，甚至是字符串。

- value 为 null。则 iteratee 的行为只是返回当前迭代元素自身
- value 为一个函数。那么通过内置函数 optimizeCb 对其进行优化
- value 为一个对象。那么返回的 iteratee（_.matcher）的目的是想要知道当前被迭代元素是否匹配给定的这个对象
- value 是字面量，如数字，字符串等。他指示了一个对象的属性 key，返回的 iteratee（_.property）将用来获得该属性对应的值

#### optimizeCb()

在上面的分析中，我们知道，当传入的 value 是一个函数时，value 还要经过一个叫 optimizeCb 的内置函数才能获得最终的 iteratee：
```
var cb = function (value, context, argCount) {
  // ...
  if (_.isFunction(value)) return optimizeCb(value, context, argCount);
  // ...
};
```

所以此处的optimizeCb必然是优化回调的作用了。
```

  // 优化回调的函数，遍历
  var optimizeCb = function(func, context, argCount) {
    // void 0 会返回真正的undefined 此处确保上下文的存在
    if (context === void 0) return func;
    switch (argCount == null ? 3 : argCount) {
      case 1: return function(value) {
        // argCount为0时候，迭代过程中，我们只需要这个value就可以了
        return func.call(context, value);
      };
      // The 2-parameter case has been omitted only because no current consumers
      //  3个参数(值,索引,被迭代集合对象).
      case 3: return function(value, index, collection) {
        return func.call(context, value, index, collection);
      };
      // 4个参数(累加器(比如reducer需要的), 值, 索引, 被迭代集合对象)
      case 4: return function(accumulator, value, index, collection) {
        return func.call(context, accumulator, value, index, collection);
      };
    }
    return function() {
      return func.apply(context, arguments);
    };
  };
```

整体的代码非常清晰，待优化的回调函数func，上下文context以及迭代回调需要的参数个数。

上面的这个优化的回调涉及到不同地方使用的不同迭代。这里暂时 先放一放。等过了一遍源码后，看到每一个用到迭代的地方，在回头来看，就会明白很多。

### rest参数
在 ES6中，我们定义不定参方法的时候可以这么写
```
let a = (b,...c)=>{
console.log(b,c);
}
```
但是在此之前，Underscore实现了自己的reset，使用如下：
```
  function a(a,b,c,d,e){
      console.log(a,b,c,d,e)
  }
  let aa = restArgs(a);//let aa = restArgs(a,4)
  aa(1,2,3,4,5,6,7,8,8)
```

看下restArgs的实现：

```
var restArgs = function(func, startIndex) {
    //未传则取形参个数减一

    startIndex = startIndex == null ? func.length - 1 : +startIndex;

    return function() {
      //  多传了几个参数
      //length为多传了几个参数
      var length = Math.max(arguments.length - startIndex, 0),
          rest = Array(length),
          index = 0;
      for (; index < length; index++) {
        rest[index] = arguments[index + startIndex];
      }
      
      //优化。注意rest参数总是最后一个参数, 否则会有歧义
      switch (startIndex) {
        case 0: return func.call(this, rest);
        case 1: return func.call(this, arguments[0], rest);
        case 2: return func.call(this, arguments[0], arguments[1], rest);
      }
      //撇去常用的startIndex，这里循环
      //先拿到前面参数
      var args = Array(startIndex + 1);
      for (index = 0; index < startIndex; index++) {
        args[index] = arguments[index];
      }
      //拿到后面的数组
      args[startIndex] = rest;
      return func.apply(this, args);
    };
  };  
```

### 面向对象

关于面向对象，这里不做过多解释了，可以参考我的另一篇文章：
[javasript设计模式之面向对象](https://juejin.im/post/5a252382518825293b50276e)。

我们直接看他的继承实现吧

```
  var Ctor = function(){};
  
  // 定义了一个用于继承的内部方法
  var baseCreate = function(prototype) {
    if (!_.isObject(prototype)) return {};
    // nativeCreate = Object.create;
    if (nativeCreate) return nativeCreate(prototype);
    Ctor.prototype = prototype;
    var result = new Ctor;
    Ctor.prototype = null;
    return result;
  };
```

es5 中，我们有一种创建对象的方式，Object.create 。

```
function Animal(name){
  this.name = name;
}
Animal.prototype.eat = function(){
  console.log(this.name,'鸟为食亡');
}
var dog = Object.create(Animal.prototype);
dog.name = "毛毛";
dog.eat();
```
ok,大概从上大家就看出来create的作用了。

baseCrate中，首先判断是否为对象，否则退出。浏览器能力检测是否具备Object.create方法，具备则用。否则采用寄生式继承创建对象。需要注意的是，baseCreate仅仅支持原型继承，而不能像Object.create那样传递属性列表。

### 结束语

开篇简单的介绍Collection Functions上面的代码部分。在介绍Collection Function每个方法实现之前，我们将在下一篇看一下一些工具方法的编写方式。



> 的确在造造轮子，只是更想自己撸一遍优秀代码。



