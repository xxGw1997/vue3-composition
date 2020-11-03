

export function effect(fn,options:any={}){
  const effect = createReactiveEffect(fn,options)
  if(!options.lazy){
    effect()
  }
  return effect
}

let activeEffect
let uid = 0

function createReactiveEffect(fn,options){
  const effect = function(){
    activeEffect = effect
    return fn()
  }
  effect.id = uid++
  effect.deps = []
  effect.options = options
  return effect
}

const targetMap = new WeakMap()

export function track(target,key){
  if(activeEffect == undefined) return
  let depsMap = targetMap.get(target)
  if(!depsMap){
    targetMap.set(target,(depsMap =new Map()))
  }
  let dep = depsMap.get(key)
  if(!dep){
    depsMap.set(key,(dep = new Set()))
  }
  if(!dep.has(activeEffect)){
    dep.add(activeEffect)
    activeEffect.deps.push(dep)
  }
}

export function trigger(target,key,value?,oldValue?){
  const depsMap = targetMap.get(target)
  const run = effects=>{
    if(effects) effects.forEach(effect =>effect())
  }
  run(depsMap.get(key))
}