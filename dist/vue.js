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
  var isString = function (value) { return typeof value == 'string'; };
  var isFunction = function (value) { return typeof value == 'function'; };

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

  function createVnode(type, props, children) {
      if (props === void 0) { props = {}; }
      if (children === void 0) { children = null; }
      //type 可能是对象 也有可能是字符串
      var shapeFlag = isString(type) ? 1 /* ELEMENT */ : isObject(type) ? 4 /* STATEFUL_COMPONENT */ : 0;
      var vnode = {
          type: type,
          props: props,
          children: children,
          component: null,
          el: null,
          key: props.key,
          shapeFlag: shapeFlag //用来标识当前虚拟节点的类型  元素、组件....
      };
      console.log("shapeFlag:", shapeFlag);
      if (isArray(children)) {
          //或操作不仅可以表示当前节点的类型,还能表示儿子组件的类型
          // 00000001 元素
          // 00010000 儿子组件
          // 00010001 代表两者都有
          vnode.shapeFlag |= 16 /* ARRAY_CHILDREN */;
      }
      else {
          //00000100
          //00001000
          //00001100
          vnode.shapeFlag |= 8 /* TEXT_CHILDREN */;
      }
      return vnode;
  }

  function createAppAPI(render) {
      return function (rootComponent) {
          var app = {
              mount: function (container) {
                  var vnode = createVnode(rootComponent);
                  render(vnode, container);
              }
          };
          return app;
      };
  }

  function createComponentInstance(vnode) {
      var instance = {
          type: vnode.type,
          props: {},
          vnode: vnode,
          render: null,
          isMounted: false,
          setupState: null
      };
      // console.log('instance.type:',instance.type)
      return instance;
  }
  var setupComponent = function (instance) {
      //1、源码中会对属性初始化
      //2、会对插槽进行初始化
      //3、调用setup方法
      setupStatefulComponent(instance);
  };
  function setupStatefulComponent(instance) {
      var Component = instance.type; //组件的虚拟节点
      var setup = Component.setup;
      console.log("setup:", setup);
      if (setup) {
          var setUpResult = setup(); //获取setup返回的值
          console.log("setupReasult:", setUpResult);
          //判断返回值类型
          handleSetupResult(instance, setUpResult);
      }
  }
  function handleSetupResult(instance, setUpResult) {
      if (isFunction(setUpResult)) {
          instance.render = setUpResult;
      }
      else {
          instance.setupState = setUpResult;
      }
      finishComponentSetup(instance);
  }
  function finishComponentSetup(instance) {
      var Component = instance.type;
      // console.log('instance.type::',Component)
      if (Component.render) {
          instance.render = Component.render;
      }
      else if (!instance.render) ;
  }

  function createRenderer(options) {
      return baseCreateRenderer(options);
  }
  function baseCreateRenderer(options) {
      var hostCreateElement = options.createElement, hostPatchProp = options.patchProp, hostSetElementText = options.setElementText, hostInsert = options.insert, hostRemove = options.remove;
      var mountElement = function (vnode, container) {
          //n2是虚拟节点,container是容器
          var shapeFlag = vnode.shapeFlag, props = vnode.props;
          var el = vnode.el = hostCreateElement(vnode.type);
          //创建儿子节点 
          if (shapeFlag & 1 /* ELEMENT */) {
              hostSetElementText(el, vnode.children);
          }
          else if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
              mountChildren(vnode.children, el);
          }
          if (props) {
              for (var key in props) {
                  hostPatchProp(el, key, null, props[key]);
              }
          }
          hostInsert(el, container);
      };
      var mountChildren = function (children, container) {
          for (var i = 0; i < children.length; i++) {
              patch(null, children[i], container);
          }
      };
      var patchProps = function (oldProps, newProps, el) {
          if (oldProps !== newProps) {
              //1.新的属性需要覆盖掉老的属性
              for (var key in newProps) {
                  var prev = oldProps[key];
                  var next = newProps[key];
                  if (prev !== next) {
                      hostPatchProp(el, key, prev, next);
                  }
              }
              //2.老的有的属性   新的没有  需要将老的删除掉
              for (var key in oldProps) {
                  if (!(key in newProps)) {
                      hostPatchProp(el, key, oldProps[key], key);
                  }
              }
          }
      };
      var patchChildren = function (n1, n2, el) {
          var c1 = n1.children; //获取所有老的子节点
          var c2 = n2.children; //获取所有新的子节点
          var prevShapeFlag = n1.shapeFlag; //上一次的元素类型
          var shapeFlag = n2.shapeFlag; //本次的元素类型
          if (shapeFlag & 8 /* TEXT_CHILDREN */) { //文本元素
              //1、老的是文本 && 新的是文本 =>  新的覆盖掉老的
              //2、老的是数组 && 新的是文本 =>  覆盖掉老的即可
              if (c2 !== c1) {
                  hostSetElementText(el, c2);
              }
          }
          else {
              //新的是数组
              if (prevShapeFlag & 16 /* ARRAY_CHILDREN */) {
                  //新的是数组 老的是数组 => diff算法
                  console.log('diff 算法');
              }
              else {
                  //新的是数组 老的是文本 => 
                  if (prevShapeFlag & 8 /* TEXT_CHILDREN */) {
                      //移除老的文本
                      hostSetElementText(el, '');
                  }
                  if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
                      //把新的元素进行挂载,并生成新的节点塞进去
                      for (var i = 0; i < c2.length; i++) {
                          patch(null, c2[i], el);
                      }
                  }
              }
          }
      };
      var patchElement = function (n1, n2, container) {
          //如果n1和n2的类型一样
          var el = (n2.el = n1.el);
          var oldProps = n1.props || {};
          var newProps = n2.props || {};
          patchProps(oldProps, newProps, el); //比对前后属性的元素差异
          patchChildren(n1, n2, el);
      };
      var mountComponent = function (initialVnode, container) {
          //组件挂载  1、创建组件的实例  2、初始化组件(找到组件的render方法)  3、执行render
          //组件的实例要记住组件的状态
          var instance = initialVnode.component = createComponentInstance(initialVnode);
          setupComponent(instance);
          //调用render方法,如果render方法中数据变了 会重新渲染
          setupRenderEffect(instance, initialVnode, container); //给组件创建一个effect,用于渲染
      };
      var setupRenderEffect = function (instance, initialVnode, container) {
          //组件的effect
          effect(function componentEffect() {
              if (!instance.isMounted) {
                  //渲染组件中的内容
                  var subTree = instance.subTree = instance.render(); //组件对应渲染的结果
                  console.log('subTree:', subTree);
                  patch(null, subTree, container);
                  instance.isMounted = true;
              }
              else {
                  //更新逻辑
                  var prev = instance.subTree; //上一次的渲染结果
                  var next = instance.render();
                  // console.log(prev, next) //接下来就是做dom diff 操作
                  patch(prev, next, container);
              }
          });
      };
      var processComponent = function (n1, n2, container) {
          if (n1 == null) {
              mountComponent(n2, container);
          }
      };
      var processElement = function (n1, n2, container) {
          if (n1 == null) {
              mountElement(n2, container);
          }
          else { //比较两个虚拟节点
              patchElement(n1, n2);
          }
      };
      var isSameVnodeType = function (n1, n2) {
          return n1.type == n2.type && n1.key === n2.key;
      };
      var patch = function (n1, n2, container) {
          var shapeFlag = n2.shapeFlag;
          //先判断是否有上一次节点,再判断上次节点和本次节点是否是相同
          if (n1 && !isSameVnodeType(n1, n2)) {
              //删除老节点 老节点的虚拟节点上对应着真实节点
              hostRemove(n1.el);
              n1 = null;
          }
          if (shapeFlag & 1 /* ELEMENT */) {
              processElement(n1, n2, container);
          }
          else if (shapeFlag & 4 /* STATEFUL_COMPONENT */) {
              processComponent(n1, n2, container);
          }
      };
      var render = function (vnode, container) {
          //首次render是挂载,所以n1(上一次的vnode)是null
          patch(null, vnode, container);
      };
      return {
          createApp: createAppAPI(render)
      };
  }

  function h(type, props, children) {
      if (props === void 0) { props = {}; }
      if (children === void 0) { children = null; }
      return createVnode(type, props, children);
  }

  function patchClass(el, value) {
      if (value == null) {
          value = '';
      }
      el.className = value;
  }
  function patchStyle(el, prev, next) {
      //{color:red}  {background:red}
      var style = el.style;
      if (!next) {
          el.removeAttribute('style');
      }
      else {
          for (var key in next) {
              style[key] = next[key];
          }
          if (prev) {
              for (var key in prev) {
                  if (next[key] == null) {
                      style[key] = '';
                  }
              }
          }
      }
  }
  function patchAttr(el, key, value) {
      if (value == null) {
          el.removeAttribute(key);
      }
      else {
          el.setAttribute(key, value);
      }
  }
  function patchProp(el, key, prevValue, nextValue) {
      switch (key) {
          case 'class':
              patchClass(el, nextValue);
              break;
          case 'style':
              patchStyle(el, prevValue, nextValue);
              break;
          default:
              patchAttr(el, key, nextValue);
              break;
      }
  }

  var renderOptions = __assign(__assign({}, nodeOps), { patchProp: patchProp });
  function ensureRenderer() {
      return createRenderer(renderOptions);
  }
  function createApp(rootComponent) {
      //1、根据组件创建一个渲染器
      var app = ensureRenderer().createApp(rootComponent);
      var mount = app.mount;
      app.mount = function (container) {
          container = document.querySelector(container);
          //1、挂载时需要先将容器清空 再进行挂载
          container.innerHTML = '';
          console.log('mount:', mount);
          mount(container);
      };
      return app;
  }

  exports.computed = computed;
  exports.createApp = createApp;
  exports.createRenderer = createRenderer;
  exports.effect = effect;
  exports.h = h;
  exports.reactive = reactive;
  exports.ref = ref;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=vue.js.map
