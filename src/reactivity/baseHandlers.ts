import { isSymbol, isObject, isArray, isInteger, hasOwn, hasChanged } from "../shared/index";
import { reactive } from "./reactive";
import { track, trigger } from './effect'

function createGetter() {
  return function get(target, key, receiver) {  //获取属性的时候会自动执行get()方法
    const res = Reflect.get(target, key, receiver)  //相当于target[key]
    //如果取值是symbol类型 则需要忽略
    if (isSymbol(key)) {
      return res
    }
    //依赖收集
    //在调用effect()时,会将effect中使用到的属性添加对应的effect方法
    //个人理解的操作就是,收集每一个使用到该属性(比如name)的effect函数(比如将这个name属性赋值给页面上某个div中innerHTML的函数)给收集起来
    //因为在这个函数中使用到了name属性,所以name属性变化时,需要重新执行该函数
    //最后会生成一个map  {Object:{name:[effect1,effect2],age:[...]} 
    //effect1操作比如就是把name属性赋值给页面上div1的内容中  
    //effect2就是比如把name属性赋值给页面上div2的内容中
    track(target, key)
    console.log('数据get')

    if (isObject(res)) {  //取值是对象 再进行递归代理->懒递归
      return reactive(res)
    }
    return res
  }
}

function createSetter() {
  return function set(target, key, value, receiver) {  //设置属性的值的时候会自动执行set()方法
    //新增还是修改
    const oldValue = target[key]
    //看一下有没有这个属性

    //1、数组新增属性     2、对象新增属性
    const hadKey = isArray(target) && isInteger(key) ? Number(key) < target.length : hasOwn(target, key)
    const res = Reflect.set(target, key, value, receiver)
    if (!hadKey) {
      trigger(target, 'add', key, value)
    } else if (hasChanged(value, oldValue)) {
      trigger(target, 'set', key, value, oldValue)
    }
    return res
  }
}

//为了预先放参数
const get = createGetter()
const set = createSetter()


export const mutableHandlers = {
  get,
  set
}
