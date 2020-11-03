import { isArray, isInteger } from "../shared/index";

export function effect(fn, options: any = {}) {  //effect => vue watcher
  //options默认没有用,但是在写计算属性时会用上
  const effect = createReactiveEffect(fn, options)
  if (!options.lazy) {
    effect()
  }
  return effect
}

let activeEffect //用来存储当前的effect函数
let uid = 0
const effectStack = []
function createReactiveEffect(fn, options) {
  const effect = function () {
    if (!effectStack.includes(effect)) {  //防止递归执行
      try {
        activeEffect = effect
        effectStack.push(activeEffect)
        //计算属性有返回值,所以需要return
        return fn()  //需要执行的逻辑,内部会对依赖的数据进行取值get()操作,在取值时可以拿到activeEffects
      } finally {
        effectStack.pop()
        activeEffect = effectStack[effectStack.length - 1]
      }
    }
  }
  effect.id = uid++
  effect.deps = []  //用来表示effect中依赖了哪些属性
  effect.options = options
  return effect
}

//{object:{key:[effect1,effect2]}}
const targetMap = new WeakMap()
//将属性和effect做一个关联
export function track(target, key) {
  if (activeEffect == undefined) {
    return
  }
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }
  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = new Set()))
  }
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect)
    activeEffect.deps.push(dep) //双向绑定
  }
}

//触发更新
export function trigger(target, type, key, value?, oldValue?) {   //{ name: 'ywx', age: 23, address: 'hangzhou' }
  const depsMap = targetMap.get(target)
  if (!depsMap) return
  const run = effects => {
    if (effects) effects.forEach(effect => effect())
  }
  //数组有特殊情况
  if (key === 'length' && isArray(target)) {
    depsMap.forEach((dep, key) => {
      if (key == 'length' || key >= value) {  //在数组中如果修改的长度小于原有数组的长度时，也要更新视图
        run(dep)
      }
      switch (type) {
        case 'add':
          if (isArray(target)) {  //给数组如果通过索引增加选项
            //如果页面中直接使用了数组,也会对数组进行取值操作,
            //对length进行收集,新增属性时,直接触发length即可
            if (isInteger(key)) run(depsMap.get('length'))
          }
          break;

        default:
          break;
      }
    })
  } else {
    //对象的处理
    if (key != void 0) {//说明修改了key
      run(depsMap.get(key))
    }
  }
}