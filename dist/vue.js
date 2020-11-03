(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.Vue = {}));
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
      //options默认没有用,但是在写计算属性时会用上
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
                  //计算属性有返回值,所以需要return
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
          //在调用effect()时,会将effect中使用到的属性添加对应的effect方法
          //个人理解的操作就是,收集每一个使用到该属性(比如name)的effect函数(比如将这个name属性赋值给页面上某个div中innerHTML的函数)给收集起来
          //因为在这个函数中使用到了name属性,所以name属性变化时,需要重新执行该函数
          //最后会生成一个map  {Object:{name:[effect1,effect2],age:[...]} 
          //effect1操作比如就是把name属性赋值给页面上div1的内容中  
          //effect2就是比如把name属性赋值给页面上div2的内容中
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

  /*! *****************************************************************************
  Copyright (c) Microsoft Corporation.

  Permission to use, copy, modify, and/or distribute this software for any
  purpose with or without fee is hereby granted.

  THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
  REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
  AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
  INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
  LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
  OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
  PERFORMANCE OF THIS SOFTWARE.
  ***************************************************************************** */

  var __assign = function() {
      __assign = Object.assign || function __assign(t) {
          for (var s, i = 1, n = arguments.length; i < n; i++) {
              s = arguments[i];
              for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
          }
          return t;
      };
      return __assign.apply(this, arguments);
  };

  var nodeOps = {
      createElement: function (type) {
          return document.createElement(type);
      },
      setElementText: function (el, text) {
          el.textContent = text;
      },
      insert: function (child, parent, anchor) {
          if (anchor === void 0) { anchor = null; }
          parent.insertBefore(child, anchor);
      },
      remove: function (child) {
          var parent = child.parentNode;
          if (parent)
              parent.removeChild(child);
      }
  };

  function createRenderer(options) {
      return {
          createApp: function (rootComponent) {
              var app = {
                  mount: function (container) {
                  }
              };
              return app;
          }
      };
  }

  var renderOptions = __assign({}, nodeOps);
  function ensureRenderer() {
      return createRenderer();
  }
  function createApp(rootComponent) {
      //1、根据组件创建一个渲染器
      var app = ensureRenderer().createApp(rootComponent);
      var mount = app.mount;
      app.mount = function (container) {
          //1、挂载时需要先将容器清空 再进行挂载
          container.innerHTML = '';
          mount(container);
      };
      return app;
  }

  exports.computed = computed;
  exports.createApp = createApp;
  exports.effect = effect;
  exports.reactive = reactive;
  exports.ref = ref;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=vue.js.map
