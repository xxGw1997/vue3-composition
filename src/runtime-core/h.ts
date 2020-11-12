import { createVnode } from "./vnode";

export function h(type, props = {}, children = null) {
  //创建元素的虚拟节点
  return createVnode(type, props, children)
}