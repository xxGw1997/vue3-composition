import { isString, ShapeFlags, isObject, isArray } from "../shared/index"


export function createVnode(type, props: any = {}, children = null) {
  //type 可能是对象 也有可能是字符串
  const shapeFlag = isString(type) ? ShapeFlags.ELEMENT : isObject(type) ? ShapeFlags.STATEFUL_COMPONENT : 0
  const vnode = { //用来表示dom结果,也可以表示组件
    type,
    props,
    children,
    component: null, //组件的实例
    el: null,      //虚拟节点和真实节点做一个映射关系
    key: props.key,
    shapeFlag     //用来标识当前虚拟节点的类型  元素、组件....
  }
  if (isArray(children)) {
    //或操作不仅可以表示当前节点的类型,还能表示儿子组件的类型
    // 00000001 元素
    // 00010000 儿子组件
    // 00010001 代表两者都有
    vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
  } else {
    vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN
  }


  return vnode
}