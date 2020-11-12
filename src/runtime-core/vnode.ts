import { isString, ShapeFlags, isObject, isArray } from "../shared/index"


export function createVnode(type, props: any = {}, children = null) {
  //type 可能是对象(组件) 也有可能是字符串
  //设置vnode 代表的类型
  const shapeFlag = isString(type) ?  //先判断type是否是字符串
    ShapeFlags.ELEMENT :  //是字符串 则代表是 元素
    isObject(type) ?      //不是字符串,再判断是否是对象类型
      ShapeFlags.STATEFUL_COMPONENT : //是对象 则代表是 状态组件
      0                               //不是对象  置为空
  const vnode = { //用来表示dom结果,也可以表示组件
    type,     //标签名 或 对象(组件)
    props,    //属性
    children, //
    component: null, //组件的实例
    el: null,      //虚拟节点和真实节点做一个映射关系
    key: props.key,
    shapeFlag     //用来标识当前虚拟节点的类型  元素、组件....
  }
  console.log("type:", vnode.type)
  if (isArray(children)) {  //判断儿子是否是数组类型
    //或操作不仅可以表示当前节点的类型,还能表示儿子组件的类型
    // 00000001 元素
    // 00010000 儿子组件
    // 00010001 代表两者都有

    //  使用或等操作把vnode的类型设置为 既可以表示vnode 的类型又可以表示vnode的children的类型
    //如果儿子 是数组类型  则把vnode类型设置为儿子节点是数组
    vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
  } else {
    //00000100
    //00001000
    //00001100
    //如果儿子不是数组类型  则把vnode 类型设置为儿子节点是文本类型
    vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN
  }


  return vnode
}