import { isSymbol, isObject, isArray, isInteger, hasOwn } from "../shared/index"
import { reactive } from "./reactive"

function createGetter() {
  return function get(target, key, receiver) {
    const res = Reflect.get(target, key, receiver)
    if (isSymbol(key)) {
      return
    }
    //依赖收集  todo
    console.log('get:' + key)

    if (isObject(key)) {
      return reactive(key)
    }
    return res
  }
}

function createSetter() {
  return function set(target, key, value, receiver) {
    const oldValue = target[key]
    const hadKey = isArray(target) && isInteger(key) ? Number(key) < target.length : hasOwn(target, key)
    const res = Reflect.set(target, key, value, receiver)
    if (!hadKey) {
      console.log('新增属性')
    } else {
      console.log('修改属性')
    }
    return res
  }
}

const get = createGetter()
const set = createSetter()

export const mutableHandlers = {
  get, set
}