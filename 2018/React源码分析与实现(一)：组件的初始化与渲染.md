# React源码分析与实现(一)：组件的初始化与渲染

> 原文链接地址：[https://github.com/Nealyang](https://github.com/Nealyang/PersonalBlog/blob/master/2018/React%E6%BA%90%E7%A0%81%E5%88%86%E6%9E%90%E4%B8%8E%E5%AE%9E%E7%8E%B0(%E4%B8%80)%EF%BC%9A%E7%BB%84%E4%BB%B6%E7%9A%84%E5%88%9D%E5%A7%8B%E5%8C%96%E4%B8%8E%E6%B8%B2%E6%9F%93.md) 转载请注明出处

## 前言

战战兢兢写下开篇...也感谢小蘑菇大神以及网上各路大神的博客资料参考~

阅读源码的方式有很多种，广度优先法、调用栈调试法等等，此系列文章，采用基线法，顾名思义，就是以低版本为基线，逐渐了解源码的演进过程和思路。

react最初的设计灵感来源于游戏渲染的机制：当数据变化时，界面仅仅更新变化的部分而形成新的一帧渲染。所以设计react的核心就是认为UI只是把数据通过映射关系变换成另一种形式的数据，也就是展示方式。传统上，web架构使用模板或者HTML指令构造页面。react则处理构建用户界面通过将他们份极为virtual dom，当然这也是react的核心，整个react架构的设计理念也是为此展开的。

## 准备工作

我们采用基线法去学习react源码，所以目前基于的版本为stable-0.3,后面我们在逐步分析学习演变的版本。

### clone代码

```
git clone https://github.com/facebook/react.git

git checkout 0.3-stable
```
![IMAGE](https://img.alicdn.com/tfs/TB1zYHiJqmWBuNjy1XaXXXCbXXa-508-1248.png)

React源代码都在src目录中，src包含了8个目录，其主要内容描述见下表。

| 目 录| 内容 |
|:--:|:--:|
| core | React 核心类 |
| domUtil | Dom操作和CSS操作的相关工具类 |
| environment | 当前JS执行环境的基本信息 |
| event | React事件机制的核心类 |
| eventPlugins | React事件机制的事件绑定插件类 |
| test | 测试目录 |
| utils | 各种工具类 |
| vendor | 可替换模块存放目录 |

![IMAGE](https://img.alicdn.com/tfs/TB1mMgPJXOWBuNjy0FiXXXFxVXa-2408-1558.png)

我们将该版本编译后的代码放到example下，引入到basic/index.html中运行调试。

## 组件初始化

### 使用

这里还是以basic.html中的代码为例

```
<script>
      var ExampleApplication = React.createClass({
        render: function() {
          var elapsed = Math.round(this.props.elapsed  / 100);
          var seconds = elapsed / 10 + (elapsed % 10 ? '' : '.0' );
          var message =
            'React has been successfully running for ' + seconds + ' seconds.';

          return React.DOM.p(null, message);
        }
      });
      var start = new Date().getTime();
      setInterval(function() {
        React.renderComponent(
          ExampleApplication({elapsed: new Date().getTime() - start}),
          document.getElementById('container')
        );
      }, 50);
    </script>
```
回到我们说的组件初始化，抽离下上面的代码就是：

```
var ExampleApplication = React.createClass({render:function(){ return <div>Nealyang</div> }})
```
熟悉react使用的人都知道，render方法不能为空，当然，createClass中我们也可以去写一写生命周期的钩子函数，这里我们暂且省略，毕竟目前我们更加的关注react组建的初始化过程。

同样，熟悉react使用方法的人也会有疑惑了，怎么实例代码中的render最后return的是```React.DOM.p(null,message)```

所以到这里，就不得不说一下react的编译阶段了

### 编译阶段

我们都知道，在js中直接编写html代码，或者。。。jsx语法这样的AST，在js词法分析阶段就会抛出异常的。

对的，所以我们在编写react代码的时候都会借助babel去转码

从babel官网上写个例子即可看出：

![IMAGE](https://img.alicdn.com/tfs/TB1DxQgJkyWBuNjy0FpXXassXXa-2220-1348.png)

对呀！明明人家用的是react.createElement方法，我们怎么出现个React.DOM.p...

OK，历史原因：


![IMAGE](https://img.alicdn.com/tfs/TB1UAJZJr9YBuNjy0FgXXcxcXXa-1374-604.png)

- react现在版本中，使用babel-preset-react来编译jsx，这个preset又包含了4个插件，其中transform-react-jsx负责编译jsx，调用了React.createElement函数生成虚拟组件
- 在react-0.3里，编译结果稍稍有些不同，官方给出的示例文件，使用JSXTransformer.js编译jsx（也就是```<script src="../source/JSXTransformer.js"></script>```），对于native组件和composite组件编译的方式也不一致。也就是我们看到的React.DOM.p or ReactComponsiteComponent
  - native组件：编译成React.DOM.xxx(xxx如div)，函数运行返回一个ReactNativeComponent实例。
  - composite组件：编译成createClass返回的函数调用，函数运行返回一个ReactCompositeComponent实例


题外话，不管用什么框架，到浏览器这部分的，什么花里胡哨的都不复存在。我这就是js、css、html。所以我们这里的ReactCompositeComponent最终其实还是需要转成原生元素的 。\

### 组件创建

从React.js中我们可以找到createClass的出处：

```

"use strict";

var ReactCompositeComponent = require('ReactCompositeComponent');

...

var React = {
...
  createClass: ReactCompositeComponent.createClass,
...
};

module.exports = React;
```

- createClass 代码

```
  var ReactCompositeComponentBase = function() {};
  
  function mixSpecIntoComponent(Constructor, spec) {
  var proto = Constructor.prototype;
  for (var name in spec) {
    if (!spec.hasOwnProperty(name)) {
      continue;
    }
    var property = spec[name];
    var specPolicy = ReactCompositeComponentInterface[name];


    if (RESERVED_SPEC_KEYS.hasOwnProperty(name)) {
      RESERVED_SPEC_KEYS[name](Constructor, property);
    } else if (property && property.__reactAutoBind) {
      if (!proto.__reactAutoBindMap) {
        proto.__reactAutoBindMap = {};
      }
      proto.__reactAutoBindMap[name] = property.__reactAutoBind;
    } else if (proto.hasOwnProperty(name)) {
      // For methods which are defined more than once, call the existing methods
      // before calling the new property.
      proto[name] = createChainedFunction(proto[name], property);
    } else {
      proto[name] = property;
    }
  }
}

         createClass: function (spec) {
            var Constructor = function (initialProps, children) {
              this.construct(initialProps, children);
            };
            // ReactCompositeComponentBase是React复合组件的原型函数
            Constructor.prototype = new ReactCompositeComponentBase();
            Constructor.prototype.constructor = Constructor;
            // 把消费者声明配置spec合并到Constructor.prototype中
            mixSpecIntoComponent(Constructor, spec);
            // 判断合并后的结果有没有render，如果没有 render，抛出一个异常
            invariant(
              Constructor.prototype.render,
              'createClass(...): Class specification must implement a `render` method.'
            );

            //工厂
            var ConvenienceConstructor = function (props, children) {
              return new Constructor(props, children);
            };
            ConvenienceConstructor.componentConstructor = Constructor;
            ConvenienceConstructor.originalSpec = spec;
            return ConvenienceConstructor;
          },
```
- mixSpecIntoComponent 方法就是讲spec的属性赋值给Constructor的原型上
- createClass返回一个ConvenienceConstructor构造函数，构造函数接受props、children 构造函数的静态方法componentConstructor和originalSpec分别指向Constructor和spec。
- 有种类似于寄生组合式继承的写法，Constructor为每一个组件实例的原型（```var instance = new Constructor();
      instance.construct.apply(instance, arguments);```）。Constructor原型指向ReactCompositeComponentBase，又把构造器指向Constructor自己。然后把传入的spec合并到Constructor.prototype中。判断合并后的结果有没有render，如果没有 render，抛出一个异常

其实很多人看到这估计都会很疑惑，为毛这样搞？？？直接返回个构造函数不就可以了嘛。

其实react在后面做diff算法的时候，是采用组件的Constructor来判断组件是否相同的。如此可以保证每个createClass创建出来的组件都是一个新的Constructor。

ok，那么我直接用寄生继承呀
```
// 写法1
const createClass = function(spec) { 
    var Constructor = function (initialProps, children) {
      this.construct(initialProps, children);
    };
    Constructor.prototype = new ReactCompositeComponentBase();
    Constructor.prototype.constructor = Constructor;
    mixSpecIntoComponent(ReactCompositeComponentBase, spec)
    return Constructor
}
const Table1 = new createClass(spec)(props, children);
//console.log(Table1.constructor)
```
为什么还需要ConvenienceConstructor呢？说实话，我也不知道，然后看了在网上查到相关信息说道：

上面写法在大多数情况下并不会产生什么问题，但是，当团队里的人无意中修改错点什么，比如：
```
Table1.prototype.onClick = null
```
这样，所有Table1实例化的组件，onClick全部为修改后的空值
```
<Table1 />
<Table1 />
```
我们知道，js是动态解释型语言，函数可以运行时被随意篡改。而静态编译语言在运行时期间，函数不可修改（某些静态语言也可以修改）。所以采用这种方式防御用户对代码的篡改。

### 组件实例化

既然createClass返回的是一个构造函数，那么我们就来看看他的实例化吧

```
          /**
           * Base constructor for all React component.
           *
           * Subclasses that override this method should make sure to invoke
           * `ReactComponent.Mixin.construct.call(this, ...)`.
           *
           * @param {?object} initialProps
           * @param {*} children
           * @internal
           */
          construct: function (initialProps, children) {
            this.props = initialProps || {};
            if (typeof children !== 'undefined') {
              this.props.children = children;
            }
            // Record the component responsible for creating this component.
            this.props[OWNER] = ReactCurrentOwner.current;
            // All components start unmounted.
            this._lifeCycleState = ComponentLifeCycle.UNMOUNTED;
          },
```
其实也就是将props、children挂载到this.props上 以及生命周期的设置。这里暂且不说，因为我也正在看。。。哇咔咔

这里的
```
this.props[OWNER] = ReactCurrentOwner.current;
```
this.props[OWNER]指的是当前组件的容器（父）组件实例

如果我们直接在basic.html中打印就直接出来的是null，但是如果像如下的方式书写：

```
const Children = React.createClass({
    componentDidMount = () => console.log(this.props["{owner}"]),
    render = () => null
})  

const Parent = React.createClass({
    render: () => <Children />
})  
```

这里输出的就是Parent组件实例。

再看看ReactCurrentOwner.current的赋值就明白了

```
_renderValidatedComponent: function () {
    ReactCurrentOwner.current = this;
    var renderedComponent = this.render();
    ReactCurrentOwner.current = null;
    invariant(
      ReactComponent.isValidComponent(renderedComponent),
      '%s.render(): A valid ReactComponent must be returned.',
      this.constructor.displayName || 'ReactCompositeComponent'
    );
    return renderedComponent;
}
```
可以看出来，在执行render前后，分别设置了ReactCurrentOwner.current的值，这样就能保证render函数内的子组件能赋上当前组件的实例，也就是this。

## 组件渲染

我们先撇开事务、事件池、生命周期、diff当然也包括fiber 等，先不谈，其实渲染就是将经过babel编译后的，当然这里是JSXTransformer.js编译后的Ojb给写入到HTML中而已。

```
export default function render(vnode, parent) {
    let dom;
    if (typeof vnode === 'string') {
        dom = document.createTextNode(vnode);
        // let span_dom = document.createElement('span')
        // span_dom.appendChild(dom);
        // parent.appendChild(span_dom);
        parent.appendChild(dom);
    } else if (typeof vnode.nodeName === 'string') {
        dom = document.createElement(vnode.nodeName);
        setAttrs(dom, vnode.props);
        parent.appendChild(dom)
        for(let i = 0; i < vnode.children.length; i++) {
             render(vnode.children[i], dom)
        }
    }else if(typeof vnode.nodeName === 'function'){
        let innerVnode = vnode.nodeName.prototype.render();
        render(innerVnode,parent)
    }
}

function setAttrs(dom, props) {
    const ALL_KEYS = Object.keys(props);

    ALL_KEYS.forEach(k =>{
        const v = props[k];

        // className
        if(k === 'className'){
            dom.setAttribute('class',v);
            return;
        }
        if(k == "style") {
            if(typeof v == "string") {
                dom.style.cssText = v
            }

            if(typeof v == "object") {
                for (let i in v) {
                    dom.style[i] =  v[i]
                }
            }
            return

        }

        if(k[0] == "o" && k[1] == "n") {
            const capture = (k.indexOf("Capture") != -1)
            dom.addEventListener(k.substring(2).toLowerCase(),v,capture)
            return
        }

        dom.setAttribute(k, v)
    })
}
```
是的，就这样
![img](https://upfile.asqql.com/2009pasdfasdfic2009s305985-ts/2018-4/20184219353572690.gif)

OK，回到源码~

![img](http://img.soogif.com/GeE4VTi6QQgOgqdSYPUyA07I8PCSsExq.gif)

在我们目前使用的react版本中，渲染调用的是ReactDOM.render方法，这里ReactMount.renderComponent为我们的入口方法。

ReactMount.renderComponent在react初探章节讲过。如果组件渲染过，就更新组件属性，如果组件没有渲染过，挂载组件事件，并把虚拟组件渲染成真实组件插入container内。通常，我们很少去调用两次renderComponent，所以大多数情况下不会更新组件属性而是新创建dom节点并插入到container中。

ReactComponent.mountComponentIntoNode之内开启了一个事务，事务保证渲染阶段不会有任何事件触发，并阻断的componentDidMount事件，待执行后执行等，事务在功能一章我们会详细讲解，这里不细讨论。
ReactComponent._mountComponentIntoNode这个函数调用mountComponent获得要渲染的innerHTML，然后更新container的innerHTML。
ReactCompositeComponent.mountComponent是最主要的逻辑方法。这个函数内处理了react的生命周期以及componentWillComponent和componentDidMount生命周期钩子函数，调用render返回实际要渲染的内容，如果内容是复合组件，仍然会调用mountComponent，复合组件最终一定会返回原生组件， 并且最终调用ReactNativeComponent的mountComponent函数生成要渲染的innerHTML。

![IMAGE](https://img.alicdn.com/tfs/TB1cfoYJhSYBuNjSspjXXX73VXa-890-1360.png)

```
  renderComponent: function(nextComponent, container) {
    var prevComponent = instanceByReactRootID[getReactRootID(container)];
    if (prevComponent) {
      var nextProps = nextComponent.props;
      ReactMount.scrollMonitor(container, function() {
        prevComponent.replaceProps(nextProps);
      });
      return prevComponent;
    }

    ReactMount.prepareTopLevelEvents(ReactEventTopLevelCallback);

    var reactRootID = ReactMount.registerContainer(container);
    instanceByReactRootID[reactRootID] = nextComponent;
    nextComponent.mountComponentIntoNode(reactRootID, container);
    return nextComponent;
  },
```
这段代码逻辑大概就是上面的流程图，这里不再赘述。
- mountComponentIntoNode
从debugger中，可以看出mountComponentIntoNode第一个参数其实传入的是react分配给组件的一个唯一标识
![IMAGE](https://img.alicdn.com/tfs/TB1QQ79Jf5TBuNjSspmXXaDRVXa-575-202.png)
```
    mountComponentIntoNode: function(rootID, container) {
      var transaction = ReactComponent.ReactReconcileTransaction.getPooled();
      transaction.perform(
        this._mountComponentIntoNode,
        this,
        rootID,
        container,
        transaction
      );
      ReactComponent.ReactReconcileTransaction.release(transaction);
    },
```
源码中，这里跟事务扯到了关系，其实我们只要关注渲染本身，所以这里我们直接看this._mountComponentIntoNode的方法实现

- _mountComponentIntoNode

```
    _mountComponentIntoNode: function(rootID, container, transaction) {
      var renderStart = Date.now();
      var markup = this.mountComponent(rootID, transaction);
      ReactMount.totalInstantiationTime += (Date.now() - renderStart);

      var injectionStart = Date.now();
      // Asynchronously inject markup by ensuring that the container is not in
      // the document when settings its `innerHTML`.
      var parent = container.parentNode;
      if (parent) {
        var next = container.nextSibling;
        parent.removeChild(container);
        container.innerHTML = markup;
        if (next) {
          parent.insertBefore(container, next);
        } else {
          parent.appendChild(container);
        }
      } else {
        container.innerHTML = markup;
      }
      ReactMount.totalInjectionTime += (Date.now() - injectionStart);
    },
```
上述代码流程大概如下：

![IMAGE](https://img.alicdn.com/tfs/TB1nHk9JkCWBuNjy0FaXXXUlXXa-1296-1062.png)

流程的确如上，作为一个初探源码者，我当然不关心你到底是在哪innerHTML的，我想知道你是肿么把jsx编译后的Obj转成HTML的哇~

![IMAGE](https://img.alicdn.com/tfs/TB1B3lbJAOWBuNjSsppXXXPgpXa-777-161.png)

- ReactCompositeComponent.mountComponent

这里类变成了ReactCompositeComponent（debugger可以跟踪每一个函数）

![IMAGE](https://img.alicdn.com/tfs/TB1wiaicjfguuRjSspkXXXchpXa-1201-439.png)

源码中的this.mountComponent，为什么不是调用ReactComponent.mountComponent呢？这里主要使用了多重继承机制(Mixin，后续讲解)。
```
  mountComponent: function(rootID, transaction) {
  // 挂在组件ref(等于当前组件实例)到this.refs上
    ReactComponent.Mixin.mountComponent.call(this, rootID, transaction);

    // Unset `this._lifeCycleState` until after this method is finished.
    // 这是生命周期
    this._lifeCycleState = ReactComponent.LifeCycle.UNMOUNTED;
    this._compositeLifeCycleState = CompositeLifeCycle.MOUNTING;

    // 组件声明有props，执行校验
    if (this.constructor.propDeclarations) {
      this._assertValidProps(this.props);
    }
    // 为组件声明时间绑定this
    if (this.__reactAutoBindMap) {
      this._bindAutoBindMethods();
    }
    //获取state
    this.state = this.getInitialState ? this.getInitialState() : null;
    this._pendingState = null;

    // 如果组件声明componentWillMount函数，执行并把setState的结果更新到this.state上
    if (this.componentWillMount) {
      this.componentWillMount();
      // When mounting, calls to `setState` by `componentWillMount` will set
      // `this._pendingState` without triggering a re-render.
      if (this._pendingState) {
        this.state = this._pendingState;
        this._pendingState = null;
      }
    }
    // 如果声明了componentDidMount，则把其加入到ReactOnDOMReady队列中
    if (this.componentDidMount) {
      transaction.getReactOnDOMReady().enqueue(this, this.componentDidMount);
    }
    
    // 调用组件声明的render函数，并返回ReactComponent抽象类实例（ReactComponsiteComponent或
    // ReactNativeComponent)，调用相应的mountComponent函数
    this._renderedComponent = this._renderValidatedComponent();

    // Done with mounting, `setState` will now trigger UI changes.
    this._compositeLifeCycleState = null;
    this._lifeCycleState = ReactComponent.LifeCycle.MOUNTED;

    return this._renderedComponent.mountComponent(rootID, transaction);
  },
```

这个函数式VDom中最为重要的函数，操作也最为复杂，执行操作大概如下：
![IMAGE](https://img.alicdn.com/tfs/TB1oQsxJb5YBuNjSspoXXbeNFXa-535-619.png)

如上，很多内容跟我们这part有点超纲。当然，后面都会说道，关于react的渲染，其实我们的工作很简单，不关于任何，在拿到render的东西后，如何解析，其实就是最后一行代码：```this._renderedComponent.mountComponent(rootID, transaction);```

```
  mountComponent: function(rootID, transaction) {
    ReactComponent.Mixin.mountComponent.call(this, rootID, transaction);
    assertValidProps(this.props);
    return (
      this._createOpenTagMarkup() +
      this._createContentMarkup(transaction) +
      this._tagClose
    );
  },
  _createOpenTagMarkup: function() {
    var props = this.props;
    var ret = this._tagOpen;

    for (var propKey in props) {
      if (!props.hasOwnProperty(propKey)) {
        continue;
      }
      var propValue = props[propKey];
      if (propValue == null) {
        continue;
      }
      if (registrationNames[propKey]) {
        putListener(this._rootNodeID, propKey, propValue);
      } else {
        if (propKey === STYLE) {
          if (propValue) {
            propValue = props.style = merge(props.style);
          }
          propValue = CSSPropertyOperations.createMarkupForStyles(propValue);
        }
        var markup =
          DOMPropertyOperations.createMarkupForProperty(propKey, propValue);
        if (markup) {
          ret += ' ' + markup;
        }
      }
    }

    return ret + ' id="' + this._rootNodeID + '">';
  },

  /**
   * Creates markup for the content between the tags.
   *
   * @private
   * @param {ReactReconcileTransaction} transaction
   * @return {string} Content markup.
   */
  _createContentMarkup: function(transaction) {
    // Intentional use of != to avoid catching zero/false.
    var innerHTML = this.props.dangerouslySetInnerHTML;
    if (innerHTML != null) {
      if (innerHTML.__html != null) {
        return innerHTML.__html;
      }
    } else {
      var contentToUse = this.props.content != null ? this.props.content :
        CONTENT_TYPES[typeof this.props.children] ? this.props.children : null;
      var childrenToUse = contentToUse != null ? null : this.props.children;
      if (contentToUse != null) {
        return escapeTextForBrowser(contentToUse);
      } else if (childrenToUse != null) {
        return this.mountMultiChild(
          flattenChildren(childrenToUse),
          transaction
        );
      }
    }
    return '';
  },
  function ReactNativeComponent(tag, omitClose) {
  this._tagOpen = '<' + tag + ' ';
  this._tagClose = omitClose ? '' : '</' + tag + '>';
  this.tagName = tag.toUpperCase();
}
```

代码稍微多一点，但是工作目标很单一，就是为了将描述jsx的obj解析成HTML string。其实可以参照我上面直接亮出来的自己写的代码部分。

如上，其实我们已经完成了组件的初始化、渲染~

![img](https://i04picsos.sogoucdn.com/4c5797bf21477c38)

好吧，我们一直说的渲染的核心部分还没有细说~~~


### 挂载组件ref到this.refs上，设置生命周期、状态和rootID
```
    mountComponent: function(rootID, transaction) {
      invariant(
        this._lifeCycleState === ComponentLifeCycle.UNMOUNTED,
        'mountComponent(%s, ...): Can only mount an unmounted component.',
        rootID
      );
      var props = this.props;
      if (props.ref != null) {
        ReactOwner.addComponentAsRefTo(this, props.ref, props[OWNER]);
      }
      this._rootNodeID = rootID;
      this._lifeCycleState = ComponentLifeCycle.MOUNTED;
      // Effectively: return '';
    },
```
如果组件ref属性为空，则为组件的this.refs上挂在当前组件，也就是this，实现如下：
```
  addComponentAsRefTo: function(component, ref, owner) {
    owner.attachRef(ref, component);
  }
```
```
    attachRef: function(ref, component) {
      var refs = this.refs || (this.refs = {});
      refs[ref] = component;
    },
```
上述代码我删除了相关的判断警告。

### 设置组件生命状态

组件的生命状态和生命周期钩子函数是react的两个概念，在react中存在两种生命周期
- 主：组件生命周期：_lifeCycleState,用来校验react组件在执行函数时状态值是否正确
- 辅：复合组件生命周期：_componsiteLifeCycleState,用来保证setState流程不受其他行为影响

#### _lifeCycleState

```
var ComponentLifeCycle = keyMirror({
  /**
   * Mounted components have a DOM node representation and are capable of
   * receiving new props.
   */
  MOUNTED: null,
  /**
   * Unmounted components are inactive and cannot receive new props.
   */
  UNMOUNTED: null
});
```
组件生命周期非常简单，就枚举了两种，MOUNTED and UNMOUNTED

在源码中使用其只是为了在相应的阶段触发时候校验，并且给出错误提示
```
    getDOMNode: function() {
      invariant(
        ExecutionEnvironment.canUseDOM,
        'getDOMNode(): The DOM is not supported in the current environment.'
      );
      invariant(
        this._lifeCycleState === ComponentLifeCycle.MOUNTED,
        'getDOMNode(): A component must be mounted to have a DOM node.'
      );
      var rootNode = this._rootNode;
      if (!rootNode) {
        rootNode = document.getElementById(this._rootNodeID);
        if (!rootNode) {
          // TODO: Log the frequency that we reach this path.
          rootNode = ReactMount.findReactRenderedDOMNodeSlow(this._rootNodeID);
        }
        this._rootNode = rootNode;
      }
      return rootNode;
    },
```
#### _compositeLifeCycleState
复合组件的生命周期只在一个地方使用:setState
```
var CompositeLifeCycle = keyMirror({
  /**
   * Components in the process of being mounted respond to state changes
   * differently.
   */
  MOUNTING: null,
  /**
   * Components in the process of being unmounted are guarded against state
   * changes.
   */
  UNMOUNTING: null,
  /**
   * Components that are mounted and receiving new props respond to state
   * changes differently.
   */
  RECEIVING_PROPS: null,
  /**
   * Components that are mounted and receiving new state are guarded against
   * additional state changes.
   */
  RECEIVING_STATE: null
});
```

```
  replaceState: function(completeState) {
    var compositeLifeCycleState = this._compositeLifeCycleState;
    invariant(
      this._lifeCycleState === ReactComponent.LifeCycle.MOUNTED ||
      compositeLifeCycleState === CompositeLifeCycle.MOUNTING,
      'replaceState(...): Can only update a mounted (or mounting) component.'
    );
    invariant(
      compositeLifeCycleState !== CompositeLifeCycle.RECEIVING_STATE &&
      compositeLifeCycleState !== CompositeLifeCycle.UNMOUNTING,
      'replaceState(...): Cannot update while unmounting component or during ' +
      'an existing state transition (such as within `render`).'
    );

    this._pendingState = completeState;

    // Do not trigger a state transition if we are in the middle of mounting or
    // receiving props because both of those will already be doing this.
    if (compositeLifeCycleState !== CompositeLifeCycle.MOUNTING &&
        compositeLifeCycleState !== CompositeLifeCycle.RECEIVING_PROPS) {
      this._compositeLifeCycleState = CompositeLifeCycle.RECEIVING_STATE;

      var nextState = this._pendingState;
      this._pendingState = null;

      var transaction = ReactComponent.ReactReconcileTransaction.getPooled();
      transaction.perform(
        this._receivePropsAndState,
        this,
        this.props,
        nextState,
        transaction
      );
      ReactComponent.ReactReconcileTransaction.release(transaction);

      this._compositeLifeCycleState = null;
    }
  },
```
setState会调用replaceState ,然后调用_receivePropsAndState来更新界面

如果组件正处在mounting的过程或者接受props的过程中，那么将state缓存在_pendingState中，并不会更新界面的值。

### 校验props

```
  _assertValidProps: function(props) {
    var propDeclarations = this.constructor.propDeclarations;
    var componentName = this.constructor.displayName;
    for (var propName in propDeclarations) {
      var checkProp = propDeclarations[propName];
      if (checkProp) {
        checkProp(props, propName, componentName);
      }
    }
  }
```

this.constructor.propDeclarations 就是组件声明的props属性，由于props是运行时传入的属性。我们可以看到声明props的属性值即为checkProp

## 结束语

其实至此，关于本篇组件的初始化、渲染已经介绍完毕，由于代码中关于太多后续章节，生命周期、props、state、对象缓冲池、事务等，所以暂时都先略过，后续学习到的时候再回头查阅。


