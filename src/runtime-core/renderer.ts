import { createAppAPI } from "./apiCreateApp"
import { ShapeFlags } from "../shared/index"
import { createComponentInstance, setupComponent } from "./component"
import { effect } from "../reactivity/index"
import { patchProp } from "../runtime-dom/patchProp"

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
    let el = vnode.el = hostCreateElement(vnode.type)
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

  const patchProps = (oldProps,newProps,el)=>{
    if(oldProps !== newProps){
      //1.新的属性需要覆盖掉老的属性
      for(let key in newProps){
        const prev = oldProps[key]
        const next = newProps[key]
        if(prev !== next){
          hostPatchProp(el,key,prev,next)
        }
      }
      //2.老的有的属性   新的没有  需要将老的删除掉
      for(const key in oldProps){
        if(!(key in newProps)){
          hostPatchProp(el,key,oldProps[key],key)
        }
      }
    }
  }

  const patchKeyChildren = (c1,c2,el)=>{
    //内部有优化策略
    //abc   i = 0
    //abde  先从头开始比
    let i = 0
    let e1 = c1.length - 1  //老 儿子中最后一项索引
    let e2 = c2.length - 1  //新 儿子中最后一项索引
    while(i <= e1 && i <= e2){
      const n1 = c1[i]
      const n2 = c2[i]
      if(isSameVnodeType(n1,n2)){
        patch(n1,n2,el) //会递归比对子元素
      }else{
        break
      }
      i++
    }
    //abc
    //eabc  再从后开始比
    while(i <= e1 && i <= e2){
      const n1 = c1[e1]
      const n2 = c2[e2]
      if(isSameVnodeType(n1,n2)){
        patch(n1,n2,el)
      }else{
        break
      }
      e1--
      e2--
    }

  }

  const patchChildren = (n1,n2,el)=>{
    const c1 = n1.children  //获取所有老的子节点
    const c2 = n2.children  //获取所有新的子节点
    const prevShapeFlag = n1.shapeFlag  //上一次的元素类型
    const shapeFlag = n2.shapeFlag  //本次的元素类型

    if(shapeFlag & ShapeFlags.TEXT_CHILDREN){ //文本元素
      //1、老的是文本 && 新的是文本 =>  新的覆盖掉老的
      //2、老的是数组 && 新的是文本 =>  覆盖掉老的即可
      if(c2 !== c1){
        hostSetElementText(el,c2)
      }
    }else{
      //新的是数组
      if(prevShapeFlag & ShapeFlags.ARRAY_CHILDREN){
        //新的是数组 老的是数组 => diff算法
        console.log('diff 算法')
        patchKeyChildren(c1,c2,el)
      }else{
        //新的是数组 老的是文本 => 
        if(prevShapeFlag & ShapeFlags.TEXT_CHILDREN){
          //移除老的文本
          hostSetElementText(el,'')
        }
        if(shapeFlag & ShapeFlags.ARRAY_CHILDREN){
          //把新的元素进行挂载,并生成新的节点塞进去
          for(let i=0;i<c2.length;i++){
            patch(null,c2[i],el)
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
    patchProps(oldProps,newProps,el)  //比对前后属性的元素差异

    patchChildren(n1,n2,el)

  }

  const mountComponent = (initialVnode, container) => {
    //组件挂载  1、创建组件的实例  2、初始化组件(找到组件的render方法)  3、执行render
    //组件的实例要记住组件的状态
    const instance = initialVnode.component = createComponentInstance(initialVnode)
    setupComponent(instance)
    //调用render方法,如果render方法中数据变了 会重新渲染
    setupRenderEffect(instance, initialVnode, container)   //给组件创建一个effect,用于渲染
  }

  const setupRenderEffect = (instance, initialVnode, container) => {
    //组件的effect
    effect(function componentEffect() {
      if (!instance.isMounted) {
        //渲染组件中的内容
        const subTree = instance.subTree = instance.render()    //组件对应渲染的结果
        console.log('subTree:', subTree)
        patch(null, subTree, container)

        instance.isMounted = true
      } else {
        //更新逻辑
        let prev = instance.subTree   //上一次的渲染结果
        let next = instance.render()
        // console.log(prev, next) //接下来就是做dom diff 操作
        patch(prev,next,container)
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
    } else {  //比较两个虚拟节点
      patchElement(n1, n2, container)
    }
  }

  const isSameVnodeType= (n1,n2)=>{
    return n1.type == n2.type && n1.key === n2.key
  }

  const patch = (n1, n2, container) => {
    let { shapeFlag } = n2

    //先判断是否有上一次节点,再判断上次节点和本次节点是否是相同
    if(n1 && !isSameVnodeType(n1,n2)){
      //删除老节点 老节点的虚拟节点上对应着真实节点
      hostRemove(n1.el)
      n1 = null

    }


    if (shapeFlag & ShapeFlags.ELEMENT) {
      processElement(n1, n2, container)
    } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
      processComponent(n1, n2, container)
    }
  }

  const render = (vnode, container) => {
    //首次render是挂载,所以n1(上一次的vnode)是null
    patch(null, vnode, container)
  }

  return {
    createApp: createAppAPI(render)
  }
}