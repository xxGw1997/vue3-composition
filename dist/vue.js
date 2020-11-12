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
      //type 可能是对象(组件) 也有可能是字符串
      //设置vnode 代表的类型
      var shapeFlag = isString(type) ? //先判断type是否是字符串
          1 /* ELEMENT */ : //是字符串 则代表是 元素
          isObject(type) ? //不是字符串,再判断是否是对象类型
              4 /* STATEFUL_COMPONENT */ : //是对象 则代表是 状态组件
              0; //不是对象  置为空
      var vnode = {
          type: type,
          props: props,
          children: children,
          component: null,
          el: null,
          key: props.key,
          shapeFlag: shapeFlag //用来标识当前虚拟节点的类型  元素、组件....
      };
      console.log("type:", vnode.type);
      if (isArray(children)) { //判断儿子是否是数组类型
          //或操作不仅可以表示当前节点的类型,还能表示儿子组件的类型
          // 00000001 元素
          // 00010000 儿子组件
          // 00010001 代表两者都有
          //  使用或等操作把vnode的类型设置为 既可以表示vnode 的类型又可以表示vnode的children的类型
          //如果儿子 是数组类型  则把vnode类型设置为儿子节点是数组
          vnode.shapeFlag |= 16 /* ARRAY_CHILDREN */;
      }
      else {
          //00000100
          //00001000
          //00001100
          //如果儿子不是数组类型  则把vnode 类型设置为儿子节点是文本类型
          vnode.shapeFlag |= 8 /* TEXT_CHILDREN */;
      }
      return vnode;
  }

  function createAppAPI(render) {
      return function (rootComponent) {
          var app = {
              mount: function (container) {
                  //用户调用的mount方法   
                  //当用户 调用createApp(App).mount('#app')这个时
                  //会走到这
                  //创建 将用户传入的rootComponent(App对象)转换成一个vnode对象
                  //创建组件的虚拟节点
                  var vnode = createVnode(rootComponent);
                  //根据虚拟节点 和 容器进行渲染
                  //具体的内部渲染逻辑以及需要做的事情在renderer文件中,其实就是调用patch方法
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
      var setup = Component.setup; //将setup方法获取
      console.log("setup:", setup);
      if (setup) {
          var setUpResult = setup(); //获取setup返回的值
          console.log("setupReasult:", setUpResult);
          //判断返回值类型
          handleSetupResult(instance, setUpResult);
      }
  }
  function handleSetupResult(instance, setUpResult) {
      if (isFunction(setUpResult)) { //判断这个setup返回值是否是一个函数
          //是函数,将该返回值赋值给实例的render属性
          instance.render = setUpResult;
      }
      else {
          //不是函数,把该返回值赋值给setup返回的state
          instance.setupState = setUpResult;
      }
      //对当前的render和状态进行合并
      finishComponentSetup(instance);
  }
  function finishComponentSetup(instance) {
      //将组件实例的setup方法拿到
      var Component = instance.type;
      //用户可能在setup中自己手写一个render方法
      if (Component.render) { //判断组件是否有render方法
          //有自己有render方法,则把用户自己写的覆盖setup函数返回的render方法
          //默认render的优先级高于setup返回的render
          instance.render = Component.render;
      }
      else if (!instance.render) ;
      //TODO  vue3 兼容vue2 的一些操作
  }

  function createRenderer(options) {
      return baseCreateRenderer(options);
  }
  function baseCreateRenderer(options) {
      //平台相关的操作方法
      var hostCreateElement = options.createElement, hostPatchProp = options.patchProp, hostSetElementText = options.setElementText, hostInsert = options.insert, hostRemove = options.remove;
      var mountElement = function (vnode, container, anchor) {
          //vnode是元素虚拟节点,container是容器
          //获取vnode的类型和属性
          var shapeFlag = vnode.shapeFlag, props = vnode.props;
          //创建对应vnode的dom节点并且保存到vnode 的el上
          var el = vnode.el = hostCreateElement(vnode.type);
          //创建儿子节点 
          if (shapeFlag & 8 /* TEXT_CHILDREN */) { //判断儿子节点的类型是否是文本节点
              //单个文本儿子节点,直接将对应节点的children(就是节点的文本)插入到指定el中
              hostSetElementText(el, vnode.children);
          }
          else if (shapeFlag & 16 /* ARRAY_CHILDREN */) { //判断儿子节点的类型是否是数组
              //处理儿子们的逻辑
              mountChildren(vnode.children, el);
          }
          if (props) { //判断当前vnode 是否有props属性
              for (var key in props) {
                  //循环遍历每一个props属性,并且进行设置属性的操作
                  hostPatchProp(el, key, null, props[key]);
              }
          }
          //最后将处理完的el插入到对应容器中
          hostInsert(el, container, anchor);
      };
      var mountChildren = function (children, container) {
          //将儿子们进行遍历,并且将每一个子元素进行patch操作
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
      var patchKeyChildren = function (c1, c2, el) {
          //内部有优化策略
          //abc   i = 0
          //abde  先从头开始比
          var i = 0;
          var e1 = c1.length - 1; //老 儿子中最后一项索引
          var e2 = c2.length - 1; //新 儿子中最后一项索引
          while (i <= e1 && i <= e2) {
              var n1 = c1[i];
              var n2 = c2[i];
              if (isSameVnodeType(n1, n2)) {
                  patch(n1, n2, el); //会递归比对子元素
              }
              else {
                  break;
              }
              i++;
          }
          //abc   //e1=2
          //eabc  //e2=3    再从后开始比
          while (i <= e1 && i <= e2) {
              var n1 = c1[e1];
              var n2 = c2[e2];
              if (isSameVnodeType(n1, n2)) {
                  patch(n1, n2, el);
              }
              else {
                  break;
              }
              e1--;
              e2--;
          }
          //只考虑 元素新增和删除的情况 
          // abc => abcd    (i=3   e1=2  e2=3)    abc  =>  dabc(i=0  e1=-1  e2=0)
          // 只要i大于 e1 表示新增属性
          if (i > e1) { //说明有新增
              if (i <= e2) { //表示有新增的部分
                  // 先根据e2 取他的下一个元素 和 数组长度进行比较
                  var nextPos = e2 + 1;
                  var anchor = nextPos < c2.length ? c2[nextPos].el : null;
                  while (i <= e2) {
                      patch(null, c2[i], el, anchor);
                      i++;
                  }
                  console.log(i, e1, e2);
              }
          }
          else if (i > e2) { //abcd => abc (i=3   e1=3   e2=2)
              //删除
              while (i <= e1) {
                  hostRemove(c1[i].el);
                  i++;
              }
          }
          else {
              //无规律的情况,  diff 算法核心
              //ab  [cde]   fg    //s1=2     e1=4
              //ab  [edch]  fg    //s2=2     e2=5
              var s1 = i;
              var s2 = i;
              //新的索引和key做成一个映射表
              var keyToNewIndexMap = new Map();
              for (var i_1 = s2; i_1 <= e2; i_1++) {
                  var nextChild = c2[i_1];
                  keyToNewIndexMap.set(nextChild.key, i_1);
              }
              var toBePatched = e2 - s2 + 1;
              var newIndexToOldMapIndex = new Array(toBePatched).fill(0);
              //只是做相同属性的diff,但是位置还没有更换
              for (var i_2 = s1; i_2 <= e1; i_2++) {
                  var prevChild = c1[i_2];
                  var newIndex = keyToNewIndexMap.get(prevChild.key); //获取新的索引
                  if (newIndex == undefined) {
                      hostRemove(prevChild.el); //老的有 新的没有直接删除
                  }
                  else {
                      newIndexToOldMapIndex[newIndex - s2] = i_2 + 1;
                      patch(prevChild, c2[newIndex], el);
                  }
              }
              //最长增长序列  [0,1]
              var increasingIndexSequence = getSequence(newIndexToOldMapIndex);
              var j = increasingIndexSequence.length - 1;
              for (var i_3 = toBePatched - 1; i_3 >= 0; i_3--) {
                  var nextIndex = s2 + i_3; // [edch]  先找到h的索引
                  var nextChild = c2[nextIndex]; // 找到h
                  var anchor = nextIndex + 1 < c2.length ? c2[nextIndex + 1].el : null; //找到当前元素的下一个元素
                  if (newIndexToOldMapIndex[i_3] == 0) { //这个是一个新元素  直接创建插入到当前元素的下一个即可
                      patch(null, nextChild, el, anchor);
                  }
                  else {
                      //根据参照物 依次将节点直接移动过去 =>  所有节点都要移动(但是有些节点可以不动)
                      if (j < 0 || i_3 != increasingIndexSequence[j]) {
                          hostInsert(nextChild.el, el, anchor);
                      }
                      else {
                          j--;
                      }
                  }
              }
          }
      };
      function getSequence(arr) {
          var p = arr.slice();
          var result = [0];
          var i, j, u, v, c;
          var len = arr.length;
          for (i = 0; i < len; i++) {
              var arrI = arr[i];
              if (arrI !== 0) {
                  j = result[result.length - 1];
                  if (arr[j] < arrI) {
                      p[i] = j;
                      result.push(i);
                      continue;
                  }
                  u = 0;
                  v = result.length - 1;
                  while (u < v) {
                      c = ((u + v) / 2) | 0;
                      if (arr[result[c]] < arrI) {
                          u = c + 1;
                      }
                      else {
                          v = c;
                      }
                  }
                  if (arrI < arr[result[u]]) {
                      if (u > 0) {
                          p[i] = result[u - 1];
                      }
                      result[u] = i;
                  }
              }
          }
          u = result.length;
          v = result[u - 1];
          while (u-- > 0) {
              result[u] = v;
              v = p[v];
          }
          return result;
      }
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
                  patchKeyChildren(c1, c2, el);
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
          //创建组件的示例
          var instance = initialVnode.component = createComponentInstance(initialVnode);
          console.log("instance:", instance);
          //初始化组件,即找到组件的setup方法,并赋值给instance上的render属性
          setupComponent(instance);
          //调用render方法,如果render方法中数据变了 会重新渲染
          setupRenderEffect(instance, initialVnode, container); //给组件创建一个effect,用于渲染
      };
      var setupRenderEffect = function (instance, initialVnode, container) {
          //组件的effect
          effect(function componentEffect() {
              if (!instance.isMounted) { //判断组件实例是否已经渲染
                  //渲染组件中的内容并且将结果保存到subTree
                  var subTree = instance.subTree = instance.render(); //组件对应渲染的结果
                  console.log('subTree:', subTree);
                  //渲染子树的节点
                  patch(null, subTree, container);
                  //渲染完后将挂载状态置为true
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
              //n1为空,做组件的挂载操作
              mountComponent(n2, container);
          }
      };
      var processElement = function (n1, n2, container, anchor) {
          if (n1 == null) {
              //n1为空,做元素的挂载操作
              mountElement(n2, container, anchor);
          }
          else { //比较两个虚拟节点
              //n1不为空,做元素的更新操作
              patchElement(n1, n2);
          }
      };
      var isSameVnodeType = function (n1, n2) {
          return n1.type == n2.type && n1.key === n2.key;
      };
      var patch = function (n1, n2, container, anchor) {
          if (anchor === void 0) { anchor = null; }
          var shapeFlag = n2.shapeFlag;
          //先判断是否有上一次节点,再判断上次节点和本次节点是否是相同
          if (n1 && !isSameVnodeType(n1, n2)) {
              //删除老节点 老节点的虚拟节点上对应着真实节点
              hostRemove(n1.el);
              n1 = null;
          }
          //元素的创建方式和创建的创建方式不同
          //使用& 与操作可以得到vnode的type的类型
          if (shapeFlag & 1 /* ELEMENT */) {
              //如果是元素类型,则去处理元素逻辑
              processElement(n1, n2, container, anchor);
          }
          else if (shapeFlag & 4 /* STATEFUL_COMPONENT */) {
              //如果是组件类型,则去处理组件的逻辑
              processComponent(n1, n2, container);
          }
      };
      var render = function (vnode, container) {
          //首次渲染render是挂载,所以n1(上一次的vnode)是null
          patch(null, vnode, container);
      };
      return {
          createApp: createAppAPI(render)
      };
  }

  function h(type, props, children) {
      if (props === void 0) { props = {}; }
      if (children === void 0) { children = null; }
      //创建元素的虚拟节点
      return createVnode(type, props, children);
  }

  function patchClass(el, value) {
      //class 属性直接覆盖之前的即可
      if (value == null) {
          //如果需要更新的class 是null,将需要修改的class的值清空即可
          value = '';
      }
      //将要更新的类名覆盖之前的即可
      el.className = value;
  }
  function patchStyle(el, prev, next) {
      //{color:red}  {background:red}
      //获取当前元素的style属性
      var style = el.style;
      if (!next) { //判断需要更新的style 是否有值,如果没有值,则说明不需要有样式
          //直接将style 移除掉即可
          el.removeAttribute('style');
      }
      else { //如果有值
          for (var key in next) { //先遍历新的style中的属性,并且把新的属性更新到style中
              style[key] = next[key];
          }
          if (prev) { //判断之前style 属性 是否有值  如果有值
              for (var key in prev) { //遍历 之前style中的属性
                  if (next[key] == null) { //如果之前的style有该属性,但是在新的中没有,则需要把这个属性给移除掉
                      style[key] = '';
                  }
              }
          }
      }
  }
  function patchAttr(el, key, value) {
      if (value == null) { //如果需要更新的值为空,则直接移除之前的属性就可
          el.removeAttribute(key);
      }
      else { // 否者设置对应属性即可
          el.setAttribute(key, value);
      }
  }
  function patchProp(el, key, prevValue, nextValue) {
      switch (key) {
          case 'class':
              //修改class 
              patchClass(el, nextValue);
              break;
          case 'style':
              //修改style 
              patchStyle(el, prevValue, nextValue);
              break;
          default:
              //修改属性
              patchAttr(el, key, nextValue);
              break;
      }
  }

  //平台相关的操作
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
