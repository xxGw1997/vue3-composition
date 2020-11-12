import { createAppAPI } from "./apiCreateApp"
import { ShapeFlags } from "../shared/index"
import { createComponentInstance, setupComponent } from "./component"
import { effect } from "../reactivity/index"
import { patchProp } from "../runtime-dom/patchProp"

export function createRenderer(options) {
  return baseCreateRenderer(options)
}

function baseCreateRenderer(options) {

  //平台相关的操作方法
  const {
    createElement: hostCreateElement,
    patchProp: hostPatchProp,
    setElementText: hostSetElementText,
    insert: hostInsert,
    remove: hostRemove
  } = options

  const mountElement = (vnode, container, anchor) => {
    //vnode是元素虚拟节点,container是容器

    //获取vnode的类型和属性
    let { shapeFlag, props } = vnode
    //创建对应vnode的dom节点并且保存到vnode 的el上
    let el = vnode.el = hostCreateElement(vnode.type)
    //创建儿子节点 
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) { //判断儿子节点的类型是否是文本节点
      //单个文本儿子节点,直接将对应节点的children(就是节点的文本)插入到指定el中
      hostSetElementText(el, vnode.children)
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {//判断儿子节点的类型是否是数组
      //处理儿子们的逻辑
      mountChildren(vnode.children, el)
    }
    if (props) { //判断当前vnode 是否有props属性
      for (let key in props) {
        //循环遍历每一个props属性,并且进行设置属性的操作
        hostPatchProp(el, key, null, props[key])
      }
    }
    //最后将处理完的el插入到对应容器中
    hostInsert(el, container, anchor)

  }

  const mountChildren = (children, container) => {
    //将儿子们进行遍历,并且将每一个子元素进行patch操作
    for (let i = 0; i < children.length; i++) {
      patch(null, children[i], container)
    }
  }

  const patchProps =
    (oldProps, newProps, el) => {
      if (oldProps !== newProps) {
        //1.新的属性需要覆盖掉老的属性
        for (let key in newProps) {
          const prev = oldProps[key]
          const next = newProps[key]
          if (prev !== next) {
            hostPatchProp(el, key, prev, next)
          }
        }
        //2.老的有的属性   新的没有  需要将老的删除掉
        for (const key in oldProps) {
          if (!(key in newProps)) {
            hostPatchProp(el, key, oldProps[key], key)
          }
        }
      }
    }

  const patchKeyChildren = (c1, c2, el) => {
    //内部有优化策略
    //abc   i = 0
    //abde  先从头开始比
    let i = 0
    let e1 = c1.length - 1  //老 儿子中最后一项索引
    let e2 = c2.length - 1  //新 儿子中最后一项索引
    while (i <= e1 && i <= e2) {
      const n1 = c1[i]
      const n2 = c2[i]
      if (isSameVnodeType(n1, n2)) {
        patch(n1, n2, el) //会递归比对子元素
      } else {
        break
      }
      i++
    }
    //abc   //e1=2
    //eabc  //e2=3    再从后开始比
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1]
      const n2 = c2[e2]
      if (isSameVnodeType(n1, n2)) {
        patch(n1, n2, el)
      } else {
        break
      }
      e1--
      e2--
    }

    //只考虑 元素新增和删除的情况 
    // abc => abcd    (i=3   e1=2  e2=3)    abc  =>  dabc(i=0  e1=-1  e2=0)

    // 只要i大于 e1 表示新增属性
    if (i > e1) { //说明有新增
      if (i <= e2) {  //表示有新增的部分
        // 先根据e2 取他的下一个元素 和 数组长度进行比较
        const nextPos = e2 + 1
        const anchor = nextPos < c2.length ? c2[nextPos].el : null
        while (i <= e2) {
          patch(null, c2[i], el, anchor)
          i++
        }
        console.log(i, e1, e2)
      }
    } else if (i > e2) {  //abcd => abc (i=3   e1=3   e2=2)
      //删除
      while (i <= e1) {
        hostRemove(c1[i].el)
        i++
      }
    } else {
      //无规律的情况,  diff 算法核心
      //ab  [cde]   fg    //s1=2     e1=4
      //ab  [edch]  fg    //s2=2     e2=5
      const s1 = i
      const s2 = i
      //新的索引和key做成一个映射表
      const keyToNewIndexMap = new Map()
      for (let i = s2; i <= e2; i++) {
        const nextChild = c2[i]
        keyToNewIndexMap.set(nextChild.key, i)
      }
      const toBePatched = e2 - s2 + 1
      const newIndexToOldMapIndex = new Array(toBePatched).fill(0)
      //只是做相同属性的diff,但是位置还没有更换
      for (let i = s1; i <= e1; i++) {
        const prevChild = c1[i]
        let newIndex = keyToNewIndexMap.get(prevChild.key)   //获取新的索引
        if (newIndex == undefined) {
          hostRemove(prevChild.el)    //老的有 新的没有直接删除
        } else {
          newIndexToOldMapIndex[newIndex - s2] = i + 1
          patch(prevChild, c2[newIndex], el)
        }
      }

      //最长增长序列  [0,1]
      let increasingIndexSequence = getSequence(newIndexToOldMapIndex)

      let j = increasingIndexSequence.length - 1

      for (let i = toBePatched - 1; i >= 0; i--) {
        const nextIndex = s2 + i    // [edch]  先找到h的索引
        const nextChild = c2[nextIndex]   // 找到h
        let anchor = nextIndex + 1 < c2.length ? c2[nextIndex + 1].el : null    //找到当前元素的下一个元素
        if (newIndexToOldMapIndex[i] == 0) {  //这个是一个新元素  直接创建插入到当前元素的下一个即可
          patch(null, nextChild, el, anchor)
        } else {
          //根据参照物 依次将节点直接移动过去 =>  所有节点都要移动(但是有些节点可以不动)
          if (j < 0 || i != increasingIndexSequence[j]) {
            hostInsert(nextChild.el, el, anchor)
          } else {
            j--
          }
        }
      }
    }

  }

  function getSequence(arr) {
    const p = arr.slice()
    const result = [0]
    let i, j, u, v, c
    const len = arr.length
    for (i = 0; i < len; i++) {
      const arrI = arr[i]
      if (arrI !== 0) {
        j = result[result.length - 1]
        if (arr[j] < arrI) {
          p[i] = j
          result.push(i)
          continue
        }
        u = 0
        v = result.length - 1
        while (u < v) {
          c = ((u + v) / 2) | 0
          if (arr[result[c]] < arrI) {
            u = c + 1
          } else {
            v = c
          }
        }
        if (arrI < arr[result[u]]) {
          if (u > 0) {
            p[i] = result[u - 1]
          }
          result[u] = i
        }
      }
    }
    u = result.length
    v = result[u - 1]
    while (u-- > 0) {
      result[u] = v
      v = p[v]
    }
    return result
  }


  const patchChildren = (n1, n2, el) => {
    const c1 = n1.children  //获取所有老的子节点
    const c2 = n2.children  //获取所有新的子节点
    const prevShapeFlag = n1.shapeFlag  //上一次的元素类型
    const shapeFlag = n2.shapeFlag  //本次的元素类型

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) { //文本元素
      //1、老的是文本 && 新的是文本 =>  新的覆盖掉老的
      //2、老的是数组 && 新的是文本 =>  覆盖掉老的即可
      if (c2 !== c1) {
        hostSetElementText(el, c2)
      }
    } else {
      //新的是数组
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        //新的是数组 老的是数组 => diff算法
        console.log('diff 算法')
        patchKeyChildren(c1, c2, el)
      } else {
        //新的是数组 老的是文本 => 
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          //移除老的文本
          hostSetElementText(el, '')
        }
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          //把新的元素进行挂载,并生成新的节点塞进去
          for (let i = 0; i < c2.length; i++) {
            patch(null, c2[i], el)
          }
        }
      }
    }

  }

  const patchElement = (n1, n2, container) => {
    //如果n1和n2的类型一样
    let el = (n2.el = n1.el)
    const oldProps = n1.props || {}
    const newProps = n2.props || {}
    patchProps(oldProps, newProps, el)  //比对前后属性的元素差异

    patchChildren(n1, n2, el)

  }

  const mountComponent = (initialVnode, container) => {
    //组件挂载  1、创建组件的实例  2、初始化组件(找到组件的render方法)  3、执行render
    //组件的实例要记住组件的状态
    //创建组件的示例
    const instance = initialVnode.component = createComponentInstance(initialVnode)
    console.log("instance:", instance)
    //初始化组件,即找到组件的setup方法,并赋值给instance上的render属性
    setupComponent(instance)
    //调用render方法,如果render方法中数据变了 会重新渲染
    setupRenderEffect(instance, initialVnode, container)   //给组件创建一个effect,用于渲染
  }

  const setupRenderEffect = (instance, initialVnode, container) => {
    //组件的effect
    effect(function componentEffect() {
      if (!instance.isMounted) {//判断组件实例是否已经渲染
        //渲染组件中的内容并且将结果保存到subTree
        const subTree = instance.subTree = instance.render()    //组件对应渲染的结果
        console.log('subTree:', subTree)
        //渲染子树的节点
        patch(null, subTree, container)
        //渲染完后将挂载状态置为true
        instance.isMounted = true
      } else {
        //如果依赖的属性改变,会执行再次执行这个方法,并且是走更新逻辑
        //更新逻辑
        let prev = instance.subTree   //先把上一次的渲染结果保存
        let next = instance.render()  //再执行一次render组件实例的render函数得到这一次的渲染结果
        patch(prev, next, container)  //接下来就是做diff操作,两棵渲染树的比对
      }
    })
  }


  const updateComponent = (n1, n2, container) => {

  }

  const processComponent = (n1, n2, container) => {
    if (n1 == null) {
      //n1为空,做组件的挂载操作
      mountComponent(n2, container)
    } else {
      //n1不为空,做组件的更新操作
      updateComponent(n1, n2, container)
    }
  }

  const processElement = (n1, n2, container, anchor) => {
    if (n1 == null) {
      //n1为空,做元素的挂载操作
      mountElement(n2, container, anchor)
    } else {  //比较两个虚拟节点
      //n1不为空,做元素的更新操作
      patchElement(n1, n2, container)
    }
  }

  const isSameVnodeType = (n1, n2) => {
    return n1.type == n2.type && n1.key === n2.key
  }

  const patch = (n1, n2, container, anchor = null) => {
    let { shapeFlag } = n2

    //先判断是否有上一次节点,再判断上次节点和本次节点是否是相同
    if (n1 && !isSameVnodeType(n1, n2)) {
      //删除老节点 老节点的虚拟节点上对应着真实节点
      hostRemove(n1.el)
      n1 = null

    }

    //元素的创建方式和创建的创建方式不同
    //使用& 与操作可以得到vnode的type的类型
    if (shapeFlag & ShapeFlags.ELEMENT) {
      //如果是元素类型,则去处理元素逻辑
      processElement(n1, n2, container, anchor)
    } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
      //如果是组件类型,则去处理组件的逻辑
      processComponent(n1, n2, container)
    }
  }

  const render = (vnode, container) => {
    //首次渲染render是挂载,所以n1(上一次的vnode)是null
    patch(null, vnode, container)
  }

  return {
    createApp: createAppAPI(render)
  }
}