/*
 * @Author: 一凨 
 * @Date: 2018-07-25 10:01:10 
 * @Last Modified by: 一凨
 * @Last Modified time: 2018-07-25 17:25:56
 */
// $(function() {

//     var input = $('#J_input');

//     //用来获取字数
//     function value(){
//       return input.val();
//     }

//     //渲染元素
//     function render(){
//       var num = value();
//       //没有字数的容器就新建一个
//       if ($('#J_input_text').length == 0) {
//         input.after('<p id="J_input_text"></p>');
//       };

//       $('#J_input_text').html(num);
//     }

//     //监听事件
//     input.on('keyup',function(){
//       render();
//     });

//     //初始化，第一次渲染
//     render();
//   })


// 单变量模拟命名空间

// const bindValue = {
//   input: null,
//   init(config) {
//     this.input = $(config.id);
//     this.addListener();
//     return this;
//   },
//   addListener() {
//     let self = this;
//     this.input.on('keyup', () => {
//       self.render();
//     })
//   },
//   getValue() {
//     return this.input.val();
//   },
//   render() {
//     let value = this.getValue();
//     if ($('#J_input_text').length == 0) {
//       this.input.after('<p id="J_input_text"></p>');
//     };

//     $('#J_input_text').html(value);
//   }
// }
// $(function () {
//   bindValue.init({id:'#J_input'}).render()
// })

// 闭包

const BindValue = (function () {
  // 私有方法
  const _addListener = that => {
    that.input.on('keyup', () => {
      that.render();
    });
  }

  const _getValue = that => {
    return that.input.val();
  }

  const ValueFunc = function (config) {};
  ValueFunc.prototype.init = function (config) {
    this.input = $(config.id);
    _addListener(this);
    return this;
  }
  ValueFunc.prototype.render = function () {
    let value = _getValue(this);
    if ($('#J_input_text').length == 0) {
      this.input.after('<p id="J_input_text"></p>');
    };

    $('#J_input_text').html(value);
  }

  return ValueFunc;
})();

$(function () {
  new BindValue().init({
    id: '#J_input'
  }).render();
})