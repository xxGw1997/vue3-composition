import { isObject } from "../shared/index"
import { mutableHandlers } from "./baseHandlers"

export function reactive(target){
  //将目标对象变成响应式对象,Proxy
  return createReactiveObject(target,mutableHandlers) //核心操作就是当读取文件时做依赖收集,当数据变化时重新执行effect函数
}

const proxyMap = new WeakMap()

function createReactiveObject(target,baseHandlers){
  //如果目标不是对象,则直接返回
  if(!isObject(target)) return target
  const existingProxy = proxyMap.get(target)
  if(existingProxy) return existingProxy  //如果存在,则表示之前代理过,直接返回
  //只对最外层对象做代理,默认不会递归,而且不会重新重写对象中的属性
  const proxy = new Proxy(target,baseHandlers)
  proxyMap.set(target,proxy)  //将需要代理的对象和代理的结果做成一个映射表
  return proxy
}