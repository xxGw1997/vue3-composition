import { createAppAPI } from "./apiCreateApp"
import { ShapeFlags } from "../shared/index"
import { createComponentInstance, setupComponent } from "./component"
import { effect } from "../reactivity/index"

export function createRenderer(options) {
  return baseCreateRenderer(options)
}

function baseCreateRenderer(options) {

  const {
    createElement: hostCreateElement,
    patchProp: hostPatchProp,
    setElementText: hostSetElementText,
    insert: hostInsert,
    remove: hostRemove
  } = options

  const mountElement = (vnode, container) => {
    //n2是虚拟节点,container是容器
    let { shapeFlag, props } = vnode
    console.log('aaa')
    let el = vnode.el = hostCreateElement(vnode.type)
    console.log('bbb')
    //创建儿子节点
    if (shapeFlag & ShapeFlags.ELEMENT) {
      hostSetElementText(el, vnode.children)
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(vnode.children, el)
    }
    if (props) {
      for (let key in props) {
        hostPatchProp(el, key, null, props[key])
      }
    }

    hostInsert(el, container)

  }

  const mountChildren = (children, container) => {
    for (let i = 0; i < children.length; i++) {
      patch(null, children[i], container)
    }
  }

  const patchElement = (n1, n2, container) => {

  }

  const mountComponent = (initialVnode, container) => {
    //组件挂载  1、创建组件的实例  2、初始化组件(找到组件的render方法)  3、执行render
    //组件的实例要记住组件的状态
    const instance = initialVnode.component = createComponentInstance(initialVnode)

    setupComponent(instance)
    // console.log(instance.render)
    //调用render方法,如果render方法中数据变了 会重新渲染
    setupRenderEffect(instance, initialVnode, container)   //给组件创建一个effect,用于渲染
  }

  const setupRenderEffect = (instance, initialVnode, container) => {
    //组件的effect
    effect(function () {
      if (!instance.isMounted) {
        //渲染组件中的内容
        const subTree = instance.subTree = instance.render()    //组件对应渲染的结果
        patch(null, subTree, container)

        instance.isMounted = true
      } else {
        //更新逻辑
        let prev = instance.subTree   //上一次的渲染结果
        let next = instance.render()
        console.log(prev, next)
      }
    })
  }


  const updateComponent = (n1, n2, container) => {

  }

  const processComponent = (n1, n2, container) => {
    if (n1 == null) {
      mountComponent(n2, container)
    } else {
      updateComponent(n1, n2, container)
    }
  }

  const processElement = (n1, n2, container) => {
    if (n1 == null) {
      mountElement(n2, container)
    } else {
      patchElement(n1, n2, container)
    }
  }

  const patch = (n1, n2, container) => {
    let { shapeFlag } = n2
    console.log(shapeFlag & ShapeFlags.STATEFUL_COMPONENT)
    if (shapeFlag & ShapeFlags.ELEMENT) {
      processElement(n1, n2, container)
    } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
      processComponent(n1, n2, container)
    }
  }

  const render = (vnode, container) => {
    patch(null, vnode, container)
  }

  return {
    createApp: createAppAPI(render)
  }
}