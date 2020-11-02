(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.VueReactivity = {}));
}(this, (function (exports) { 'use strict';

  function computed() {
  }

  function effect() {
  }

  var isObject = function (val) { return typeof val === 'object' && val !== null; };

  function createGetter() {
      return function get(target, key, receiver) {
      };
  }
  //为了预先放参数
  var get = createGetter();
  var set = createGetter();
  var mutableHandlers = {
      get: get,
      set: set
  };

  function reactive(target) {
      //将目标对象变成响应式对象,Proxy
      return createReactiveObject(target, mutableHandlers); //核心操作就是当读取文件时做依赖收集,当数据变化时重新执行effect函数
  }
  var proxyMap = new WeakMap();
  function createReactiveObject(target, baseHandlers) {
      //如果目标不是对象,则直接返回
      if (!isObject(target))
          return target;
      var existingProxy = proxyMap.get(target);
      if (existingProxy)
          return existingProxy; //如果存在,则表示之前代理过,直接返回
      //只对最外层对象做代理,默认不会递归,而且不会重新重写对象中的属性
      var proxy = new Proxy(target, baseHandlers);
      proxyMap.set(target, proxy); //将需要代理的对象和代理的结果做成一个映射表
      return proxy;
  }

  function ref() {
  }

  exports.computed = computed;
  exports.effect = effect;
  exports.reactive = reactive;
  exports.ref = ref;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=vue.js.map
