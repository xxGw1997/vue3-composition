(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.VueReactivity = {}));
}(this, (function (exports) { 'use strict';

  function computed() {
  }

  var isObject = function (val) { return typeof val == 'object' && val !== null; };
  var isSymbol = function (val) { return typeof val == 'symbol'; };
  var isArray = Array.isArray;
  var isInteger = function (key) { return '' + parseInt(key, 10) === key; };
  var hasOwnProperty = Object.prototype.hasOwnProperty;
  var hasOwn = function (val, key) { return hasOwnProperty.call(val, key); };
  var hasChanged = function (value, oldValue) { return value !== oldValue; };

  function effect(fn, options) {
      if (options === void 0) { options = {}; }
      var effect = createReactiveEffect(fn, options);
      if (!options.lazy) {
          effect();
      }
      return effect;
  }
  var activeEffect; //用来存储当前的effect函数
  var uid = 0;
  var effectStack = [];
  function createReactiveEffect(fn, options) {
      var effect = function () {
          if (!effectStack.includes(effect)) { //防止递归执行
              try {
                  activeEffect = effect;
                  effectStack.push(activeEffect);
                  return fn(); //需要执行的逻辑,内部会对依赖的数据进行取值get()操作,在取值时可以拿到activeEffects
              }
              finally {
                  effectStack.pop();
                  activeEffect = effectStack[effectStack.length - 1];
              }
          }
      };
      effect.id = uid++;
      effect.deps = []; //用来表示effect中依赖了哪些属性
      effect.options = options;
      return effect;
  }
  //{object:{key:[effect1,effect2]}}
  var targetMap = new WeakMap();
  //将属性和effect做一个关联
  function track(target, key) {
      if (activeEffect == undefined) {
          return;
      }
      var depsMap = targetMap.get(target);
      if (!depsMap) {
          targetMap.set(target, (depsMap = new Map()));
      }
      var dep = depsMap.get(key);
      if (!dep) {
          depsMap.set(key, (dep = new Set()));
      }
      if (!dep.has(activeEffect)) {
          dep.add(activeEffect);
          activeEffect.deps.push(dep); //双向绑定
      }
  }
  //触发更新
  function trigger(target, type, key, value, oldValue) {
      var depsMap = targetMap.get(target);
      if (!depsMap)
          return;
      var run = function (effects) {
          if (effects)
              effects.forEach(function (effect) { return effect(); });
      };
      //数组有特殊情况
      if (key === 'length' && isArray(target)) {
          depsMap.forEach(function (dep, key) {
              if (key == 'length' || key >= value) { //在数组中如果修改的长度小于原有数组的长度时，也要更新视图
                  run(dep);
              }
              switch (type) {
                  case 'add':
                      if (isArray(target)) { //给数组如果通过索引增加选项
                          //如果页面中直接使用了数组,也会对数组进行取值操作,
                          //对length进行收集,新增属性时,直接触发length即可
                          if (isInteger(key))
                              run(depsMap.get('length'));
                      }
                      break;
              }
          });
      }
      else {
          //对象的处理
          if (key != void 0) { //说明修改了key
              run(depsMap.get(key));
          }
      }
  }

  function createGetter() {
      return function get(target, key, receiver) {
          var res = Reflect.get(target, key, receiver); //相当于target[key]
          //如果取值是symbol类型 则需要忽略
          if (isSymbol(key)) {
              return res;
          }
          //依赖收集
          track(target, key);
          console.log('数据get');
          if (isObject(res)) { //取值是对象 再进行递归代理->懒递归
              return reactive(res);
          }
          return res;
      };
  }
  function createSetter() {
      return function set(target, key, value, receiver) {
          //新增还是修改
          var oldValue = target[key];
          //看一下有没有这个属性
          //1、数组新增属性     2、对象新增属性
          var hadKey = isArray(target) && isInteger(key) ? Number(key) < target.length : hasOwn(target, key);
          var res = Reflect.set(target, key, value, receiver);
          if (!hadKey) {
              trigger(target, 'add', key, value);
          }
          else if (hasChanged(value, oldValue)) {
              trigger(target, 'set', key, value);
          }
          return res;
      };
  }
  //为了预先放参数
  var get = createGetter();
  var set = createSetter();
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
