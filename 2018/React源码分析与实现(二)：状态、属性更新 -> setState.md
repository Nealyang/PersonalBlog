# React源码分析与实现(二)：状态、属性更新 -> setState

> 原文链接地址：[https://github.com/Nealyang](https://github.com/Nealyang/PersonalBlog/blob/master/2018/React%E6%BA%90%E7%A0%81%E5%88%86%E6%9E%90%E4%B8%8E%E5%AE%9E%E7%8E%B0(%E4%BA%8C)%EF%BC%9A%E7%8A%B6%E6%80%81%E3%80%81%E5%B1%9E%E6%80%A7%E6%9B%B4%E6%96%B0%20-%3E%20setState.md) 转载请注明出处

## 状态更新

> 此次分析setState基于0.3版本，实现比较简单，后续会再分析目前使用的版本以及事务机制。

流程图大概如下

![IMAGE](https://img.alicdn.com/tfs/TB1kznQrIUrBKNjSZPxXXX00pXa-180-499.jpg)


setState的源码比较简单，而在执行更新的过程比较复杂。我们直接跟着源码一点一点屡清楚。

- ReactCompositeComponent.js

```
  /**
   * Sets a subset of the state. Always use this or `replaceState` to mutate
   * state. You should treat `this.state` as immutable.
   *
   * There is no guarantee that `this.state` will be immediately updated, so
   * accessing `this.state` after calling this method may return the old value.
   *
   * @param {object} partialState Next partial state to be merged with state.
   * @final
   * @protected
   */
  setState: function(partialState) {
    // Merge with `_pendingState` if it exists, otherwise with existing state.
    this.replaceState(merge(this._pendingState || this.state, partialState));
  },
```
注释部分说的很明确，setState后我们不能够立即拿到我们设置的值。

而这段代码也非常简单，就是将我们传入的state和this._pendingState做一次merge，merge的代码在util.js下
```
var merge = function(one, two) {
  var result = {};
  mergeInto(result, one);
  mergeInto(result, two);
  return result;
};

function mergeInto(one, two) {
  checkMergeObjectArg(one);
  if (two != null) {
    checkMergeObjectArg(two);
    for (var key in two) {
      if (!two.hasOwnProperty(key)) {
        continue;
      }
      one[key] = two[key];
    }
  }
}

  checkMergeObjectArgs: function(one, two) {
    mergeHelpers.checkMergeObjectArg(one);
    mergeHelpers.checkMergeObjectArg(two);
  },

  /**
   * @param {*} arg
   */
  checkMergeObjectArg: function(arg) {
    throwIf(isTerminal(arg) || Array.isArray(arg), ERRORS.MERGE_CORE_FAILURE);
  },
  
  var isTerminal = function(o) {
  return typeof o !== 'object' || o === null;
};

var throwIf = function(condition, err) {
  if (condition) {
    throw new Error(err);
  }
};
```

诊断代码的逻辑非常简单，其实功能就是```Object.assign()``` ,但是从上面代码我们可以看出react源码中的function大多都具有小而巧的特点。


最终，将merge后的结果传递给```replaceState ```

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

撇开50% 判断warning代码不说，从上面代码我们可以看出，只有在componsiteLifeState不等于mounting和receiving_props 时，才会调用 _receivePropsAndState函数来更新组件。

我们可以演示下：
```
var ExampleApplication = React.createClass({
      getInitialState() {
        return {}
      },
      componentWillMount() {
        this.setState({
          a: 1,
        })
        console.log('componentWillMount', this.state.a)
        this.setState({
          a: 2,
        })
        console.log('componentWillMount', this.state.a)
        this.setState({
          a: 3,
        })
        console.log('componentWillMount', this.state.a)
        setTimeout(() => console.log('a5'), 0)
        setTimeout(() => console.log(this.state.a,'componentWillMount'))

        Promise.resolve('a4').then(console.log)
      },

      componentDidMount() {
        this.setState({
          a: 4,
        })
        console.log('componentDidMount', this.state.a)
        this.setState({
          a: 5,
        })
        console.log('componentDidMount', this.state.a)
        this.setState({
          a: 6,
        })
        console.log('componentDidMount', this.state.a)
      },
      render: function () {
        var elapsed = Math.round(this.props.elapsed / 100);
        var seconds = elapsed / 10 + (elapsed % 10 ? '' : '.0');
        var message =
          'React has been successfully running for ' + seconds + ' seconds.';
        return React.DOM.p(null, message);
      }
    });
```
![IMAGE](https://img.alicdn.com/tfs/TB1RXCYr77mBKNjSZFyXXbydFXa-274-180.jpg)

所以以上结果我们可以看出，在componentWillMount生命周期内setState后this.state不会改变，在componentDidMount是正常的。因为在上一篇文章中我们也有说到，在mountComponent过程中，会把compositeLifeCycleState设置为MOUNTING状态，在这个过程中，是不会执行receivePropsAndState的，所以this.state也就不会更新，同理，在receivePropsAndState的过程中，会把compositeLifeCycleState置成RECEIVING_PROPS状态，也不会执行state更新以及render执行，在updateComponent过程中又执行了mountComponent函数，mountComponent函数调用了render函数。

而在现在我们使用16或者15版本中，我们发现：

```
componentDidMount() {
    this.setState({val: this.state.val + 1});
    console.log(this.state.val);    // 第 1 次 log

    this.setState({val: this.state.val + 1});
    console.log(this.state.val);    // 第 2 次 log

    setTimeout(() => {
      this.setState({val: this.state.val + 1});
      console.log(this.state.val);  // 第 3 次 log

      this.setState({val: this.state.val + 1});
      console.log(this.state.val);  // 第 4 次 log
    }, 0);
  }
```
最后打印的结果为：0，0，2，3

![IMAGE](https://img.alicdn.com/tfs/TB1kGMlrSMmBKNjSZTEXXasKpXa-1798-872.jpg)

为什么有这样呢？其实源于源码中的这段代码：

```
function enqueueUpdate(component) {
  ensureInjected();

  // Various parts of our code (such as ReactCompositeComponent's
  // _renderValidatedComponent) assume that calls to render aren't nested;
  // verify that that's the case. (This is called by each top-level update
  // function, like setProps, setState, forceUpdate, etc.; creation and
  // destruction of top-level components is guarded in ReactMount.)

  if (!batchingStrategy.isBatchingUpdates) {
    batchingStrategy.batchedUpdates(enqueueUpdate, component);
    return;
  }

  dirtyComponents.push(component);
}
```
因为这里涉及到事务的概念、批量更新以及benchUpdate等，在我们目前分析的版本中还未迭代上去，后面我们会跟着版本升级慢慢说道。

![img](https://i03picsos.sogoucdn.com/470b8a2361ac370e)

## 属性更新

首先我们知道，属性的更新必然是由于state的更新，所以其实组件属性的更新流程就是setState执行更新的延续，换句话说，也就是setState才能出发组件属性的更新，源码里就是我在处理state更新的时候，顺带检测了属性的更新。所以这段源码的开始，还是从setState中看

```
  _receivePropsAndState: function(nextProps, nextState, transaction) {
    if (!this.shouldComponentUpdate ||
        this.shouldComponentUpdate(nextProps, nextState)) {
      this._performComponentUpdate(nextProps, nextState, transaction);
    } else {
      this.props = nextProps;
      this.state = nextState;
    }
  },
```
代码非常的简单，一句话解释：当shouldComponentUpdate为true时，则执行更新操作。

```
  _performComponentUpdate: function(nextProps, nextState, transaction) {
    var prevProps = this.props;
    var prevState = this.state;

    if (this.componentWillUpdate) {
      this.componentWillUpdate(nextProps, nextState, transaction);
    }

    this.props = nextProps;
    this.state = nextState;

    this.updateComponent(transaction);

    if (this.componentDidUpdate) {
      transaction.getReactOnDOMReady().enqueue(
        this,
        this.componentDidUpdate.bind(this, prevProps, prevState)
      );
    }
  },
```
这段代码的核心就是调用```this.updateComponent```，然后对老的属性和状态存一下，新的更新一下而已。如果存在componentWillUpdate就执行一下，然后走更新流程。最后是把执行componentDidUpdate推入getReactOnDOMReady的队列中，等待组件的更新。
```
  _renderValidatedComponent: function() {
    ReactCurrentOwner.current = this;
    var renderedComponent = this.render();
    ReactCurrentOwner.current = null;
    return renderedComponent;
  },
  ...
  ...
  updateComponent: function(transaction) {
    var currentComponent = this._renderedComponent;
    var nextComponent = this._renderValidatedComponent();
    if (currentComponent.constructor === nextComponent.constructor) {
      if (!nextComponent.props.isStatic) {
        currentComponent.receiveProps(nextComponent.props, transaction);
      }
    } else {
      var thisID = this._rootNodeID;
      var currentComponentID = currentComponent._rootNodeID;
      currentComponent.unmountComponent();
      var nextMarkup = nextComponent.mountComponent(thisID, transaction);
      ReactComponent.DOMIDOperations.dangerouslyReplaceNodeWithMarkupByID(
        currentComponentID,
        nextMarkup
      );
      this._renderedComponent = nextComponent;
    }
  },
```
这里我们直接看```updateComponent```更新流程，首先获取当前render函数的组件，然后获取下一次render函数的组件，```_renderValidatedComponent```就是获取下一次的render组件。 通过Constructor来判断组件是否相同，如果相同且组件为非静态，则更新组件的属性，否则卸载当前组件，然后重新mount下一个render组件并且直接暴力更新。

接着会调用render组件的receiveProps方法，其实一开始这个地方我也是非常困惑的，this指向傻傻分不清楚，后来经过各种查阅资料知道，它其实是一个多态方法，如果是复合组件，则执行ReactCompositeComponent.receiveProps，如果是原生组件，则执行ReactNativeComponent.receiveProps。源码分别如下：

```
  receiveProps: function(nextProps, transaction) {
    if (this.constructor.propDeclarations) {
      this._assertValidProps(nextProps);
    }
    ReactComponent.Mixin.receiveProps.call(this, nextProps, transaction);

    this._compositeLifeCycleState = CompositeLifeCycle.RECEIVING_PROPS;
    if (this.componentWillReceiveProps) {
      this.componentWillReceiveProps(nextProps, transaction);
    }
    this._compositeLifeCycleState = CompositeLifeCycle.RECEIVING_STATE;
    var nextState = this._pendingState || this.state;
    this._pendingState = null;
    this._receivePropsAndState(nextProps, nextState, transaction);
    this._compositeLifeCycleState = null;
  },
```

有人可能注意到这里的this._receivePropsAndState函数，这不是刚才调用过么？怎么又调用一遍？没错，调用这个的this已经是currentComponent了，并不是上一个this。currentComponent是当前组件的render组件，也就是当前组件的子组件。子组件同样也可能是复合组件或者原生组件。正式通过这种多态的方式，递归的解析每级嵌套组件。最终完成从当前组件到下面的所有叶子节点的树更新。

其实话说回来，compositeComponent最终还是会遍历递归到解析原生组件，通过我们整体浏览下ReactNativeComponent.js代码可以看出。

![IMAGE](https://img.alicdn.com/tfs/TB1G5eJr8smBKNjSZFsXXaXSVXa-490-930.jpg)

我们先从 receiveProps方法开始看
```
  receiveProps: function(nextProps, transaction) {
    assertValidProps(nextProps);
    ReactComponent.Mixin.receiveProps.call(this, nextProps, transaction);
    this._updateDOMProperties(nextProps);
    this._updateDOMChildren(nextProps, transaction);
    this.props = nextProps;
  },
  
  function assertValidProps(props) {
  if (!props) {
    return;
  }
  var hasChildren = props.children != null ? 1 : 0;
  var hasContent = props.content != null ? 1 : 0;
  var hasInnerHTML = props.dangerouslySetInnerHTML != null ? 1 : 0;
}
```
删除安全警告和注释其实代码非常简答，首先assertValidProps就是校验props是否合法的，更新属性的方法就是```_updateDOMProperties```

```
_updateDOMProperties: function(nextProps) {
    var lastProps = this.props;
    for (var propKey in nextProps) {
      var nextProp = nextProps[propKey];
      var lastProp = lastProps[propKey];
      //判断新老属性中的值是否相等
      if (!nextProps.hasOwnProperty(propKey) || nextProp === lastProp) {
        continue;
      }
      //如果是style样式，遍历新style，如果去旧style不相同，则把变化的存入styleUpdates对象中。最后调用 updateStylesByID 统一修改dom的style属性。
      if (propKey === STYLE) {
        if (nextProp) {
          nextProp = nextProps.style = merge(nextProp);
        }
        var styleUpdates;
        for (var styleName in nextProp) {
          if (!nextProp.hasOwnProperty(styleName)) {
            continue;
          }
          if (!lastProp || lastProp[styleName] !== nextProp[styleName]) {
            if (!styleUpdates) {
              styleUpdates = {};
            }
            styleUpdates[styleName] = nextProp[styleName];
          }
        }
        if (styleUpdates) {
          ReactComponent.DOMIDOperations.updateStylesByID(
            this._rootNodeID,
            styleUpdates
          );
        }
      } else if (propKey === DANGEROUSLY_SET_INNER_HTML) {
        var lastHtml = lastProp && lastProp.__html;
        var nextHtml = nextProp && nextProp.__html;
        if (lastHtml !== nextHtml) {
          ReactComponent.DOMIDOperations.updateInnerHTMLByID(//注意这里是innerHtml，所以dangerouslyInnerHTML会展示正常的HTML
            this._rootNodeID,
            nextProp
          );
        }
      } else if (propKey === CONTENT) {
        ReactComponent.DOMIDOperations.updateTextContentByID(//这里是innerText，所以content与children原封不动的把HTML代码打印到页面上
          this._rootNodeID,
          '' + nextProp
        );
      } else if (registrationNames[propKey]) {
        putListener(this._rootNodeID, propKey, nextProp);
      } else {
        ReactComponent.DOMIDOperations.updatePropertyByID(
          this._rootNodeID,
          propKey,
          nextProp
        );
      }
    }
  },
```
这里面方法没有太多的hack技巧，非常的简单直白，不单独拧出来说，我直接写到注释里面了。

最后直接更新组件的属性
```
  setValueForProperty: function(node, name, value) {
    if (DOMProperty.isStandardName[name]) {
      var mutationMethod = DOMProperty.getMutationMethod[name];
      if (mutationMethod) {
        mutationMethod(node, value);
      } else if (DOMProperty.mustUseAttribute[name]) {
        if (DOMProperty.hasBooleanValue[name] && !value) {
          node.removeAttribute(DOMProperty.getAttributeName[name]);
        } else {
          node.setAttribute(DOMProperty.getAttributeName[name], value);
        }
      } else {
        var propName = DOMProperty.getPropertyName[name];
        if (!DOMProperty.hasSideEffects[name] || node[propName] !== value) {
          node[propName] = value;
        }
      }
    } else if (DOMProperty.isCustomAttribute(name)) {
      node.setAttribute(name, value);
    }
  }
```

整体属性更新的流程图大概如下：

![IMAGE](https://img.alicdn.com/tfs/TB1OcyJr8jTBKNjSZFwXXcG4XXa-969-659.jpg)

## 结束语

通篇读完，是不是有种

![img](https://i04picsos.sogoucdn.com/b1b82a553c2140fe)

react源码中包含很多的点的知识，比如我们之前说的VDOM、包括后面要去学习dom-diff、事务、缓存等等，都是一个点，而但从一个点来切入难免有的会有些枯燥没卵用，别急别急~

![img](https://i01picsos.sogoucdn.com/0c8d1671214af44d)