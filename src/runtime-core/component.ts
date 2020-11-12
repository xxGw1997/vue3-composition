import { isFunction } from "../shared/index"

export function createComponentInstance(vnode) {  //创建一个component实例
  const instance = {
    type: vnode.type,
    props: {},
    vnode,
    render: null,
    isMounted: false,     //默认组件没有挂载
    setupState: null
  }
  // console.log('instance.type:',instance.type)
  return instance
}

export const setupComponent = instance => { //拿到当前组件的setup方法
  //1、源码中会对属性初始化
  //2、会对插槽进行初始化
  //3、调用setup方法
  setupStatefulComponent(instance)
}

function setupStatefulComponent(instance) {
  const Component = instance.type   //组件的虚拟节点
  const { setup } = Component       //将setup方法获取
  console.log("setup:", setup)
  if (setup) {
    const setUpResult = setup()      //获取setup返回的值
    console.log("setupReasult:", setUpResult)
    //判断返回值类型
    handleSetupResult(instance, setUpResult)
  }
}

function handleSetupResult(instance, setUpResult) {
  if (isFunction(setUpResult)) {  //判断这个setup返回值是否是一个函数
    //是函数,将该返回值赋值给实例的render属性
    instance.render = setUpResult
  } else {
    //不是函数,把该返回值赋值给setup返回的state
    instance.setupState = setUpResult
  }
  //对当前的render和状态进行合并
  finishComponentSetup(instance)
}

function finishComponentSetup(instance) {
  //将组件实例的setup方法拿到
  const Component = instance.type
  //用户可能在setup中自己手写一个render方法
  if (Component.render) { //判断组件是否有render方法
    //有自己有render方法,则把用户自己写的覆盖setup函数返回的render方法
    //默认render的优先级高于setup返回的render
    instance.render = Component.render
  } else if (!instance.render) {
    //用户自己没有写render方法,并且也没有返回render函数
    //则需要进行模板解析操作,并把结果编译成render函数
    //compile(Component.template) 将模板编译成render函数
  }
  //TODO  vue3 兼容vue2 的一些操作
}