import {mutableHandlers} from "./baseHandlers"
import { isObject } from "../shared/index"

export function reactive(target){
  return createReactiveObject(target,mutableHandlers)
}


const proxyMap = new WeakMap()
function createReactiveObject(target,baseHandlers){
  if(!isObject(target)) return target
  const existingProxy = proxyMap.get(target)
  if(existingProxy) return existingProxy
  const proxy = new Proxy(target,baseHandlers)
  proxyMap.set(target,existingProxy)
  return proxy
}