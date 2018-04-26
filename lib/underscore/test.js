var restArgs = function(func, startIndex) {
    //未传则取形参个数减一

    startIndex = startIndex == null ? func.length - 1 : +startIndex;

    return function() {
      //  多传了几个参数

      var length = Math.max(arguments.length - startIndex, 0),
          rest = Array(length),
          index = 0;
      for (; index < length; index++) {
        rest[index] = arguments[index + startIndex];
      }
      switch (startIndex) {
        case 0: return func.call(this, rest);
        case 1: return func.call(this, arguments[0], rest);
        case 2: return func.call(this, arguments[0], arguments[1], rest);
      }
      var args = Array(startIndex + 1);
      for (index = 0; index < startIndex; index++) {
        args[index] = arguments[index];
      }
      args[startIndex] = rest;
      return func.apply(this, args);
    };
  };    

  function a(a,b,c,d,e){
      console.log(a,b,c,d,e)
  }
  let aa = restArgs(a);
  aa(1,2,3,4,5,6,7,8,8)