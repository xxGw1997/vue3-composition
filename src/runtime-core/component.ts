import { isFunction } from "../shared/index"

export function createComponentInstance(vnode) {
  const instance = {
    type: vnode.type,
    props: {},
    vnode,
    render: null,
    isMounted: false,     //默认组件没有挂载
    setupState: null
  }

  return instance
}

export const setupComponent = instance => {
  //1、源码中会对属性初始化
  //2、会对插槽进行初始化
  //3、调用setup方法
  setupStatefulComponent(instance)
}

function setupStatefulComponent(instance) {
  const Component = instance.type   //组件的虚拟节点
  const { setup } = Component
  console.log("setup:", setup)
  if (setup) {
    const setUpResult = setup()      //获取setup返回的值
    console.log("setupReasult:", setUpResult)
    //判断返回值类型
    handleSetupResult(instance, setUpResult)
  }
}

function handleSetupResult(instance, setUpResult) {
  if (isFunction(setUpResult)) {
    instance.render = setUpResult
  } else {
    instance.setupState = setUpResult
  }
  finishComponentSetup(instance)
}

function finishComponentSetup(instance) {
  const Component = instance.type
  if (Component.render) {
    instance.render = Component.render
  } else if (!instance.render) {
    //compile(Component.template) 编译成render函数

  }

}