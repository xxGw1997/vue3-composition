# vue3-composition
🖊Note study vue3 composition resouce code


## 1、reactive模块
这个模块主要的功能就是向外暴露一个方法reactive,此方法可以将传入的对象参数做响应式处理并且将这个proxy代理后的函数返回</br>
(目的就是当读取对象时会做依赖收集,当数据更新时会重新执行effect函数)</br>
```
export function reactive(target){
  //将目标对象变成响应式对象,Proxy
  return createReactiveObject(target,mutableHandlers) //核心操作就是当读取文件时做依赖收集,当数据变化时重新执行effect函数
}
```
为了更好的解耦，所以这里返回的是createReactiveObject(target,mutableHandlers)函数,</br>
因为可以根据第二个参数不同,后续还可以去做其他的操作，现在这里只是做对象的代理操作</br>
第一个参数是需要代理的对象,</br>
第二个参数实际上在这里做对象的代理就是new Proxy的第二个代理的具体操作</br>


```
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
```
在全局定义一个weakMap,因为weakMap可以使用object作为key,并且不可重复,所以可以用来对需要代理的对象和代理的结果做一个映射表,防止重复代理</br>
定义一个方法createReactiveObject(target,baseHandlers)这个方法接受两个参数</br>
第一个参数是需要处理的对象,第二个参数是需要处理的具体操作</br>
最后是返回一个代理后的proxy对象</br>
首先需要对象代理的对象进行一系列判断</br>
如果传入的不是一个对象则直接返回，不进行任何处理操作</br>
然后再到weakMap中查找之前是否对这个对象进行过操作,如果是则直接取值返回即可</br>
如果是一个需要新代理的对象则对该对象进行Proxy进行代理操作,具体的操作交给baseHandlers即可</br>
所以该模块只需要关心的是接收一个对象并对该对象进行一系列判断,然后将这个代理后的对象返回即可</br>
具体代理的操作和依赖收集只需要交给baseHandler模块去做就行</br>
至此reactive模块功能已经完成

## 2、baseHandlers模块
接着第一个模块中对象代理的具体操作需要具体做哪些事情,baseHandlers模块的工作就是对对象代理的具体操作</br>
其本质就是返回一个handler对象{get,set},里面有两个方法,分别是get和set。</br>
Proxy代理会将对象中每一个属性进行代理操作,访问对象中属性就是触发对应的get,对某个属性修改就会触发对应的set</br>
Proxy就是代替defineProperty的,所以当访问需要代理的对象中某一个方法时,会自动执行该handler对象中的get方法</br>
当修改需要代理对象中某一个属性时,会自动执行该handler对象中的set方法</br>
```
export const mutableHandlers = {
  get,
  set
}
```
返回一个对象,分别有get和set两个方法


```
const get = createGetter()
const set = createSetter()
```
利用函数柯里化给函数先预置参数</br>
createGetter(),createSetter()两个方法作用就是分别返回两个函数</br>
接下来要具体编写createGetter(),createSetter()</br>
### createGetter()
```
function createGetter() {
  return function get(target, key, receiver) {  //获取属性的时候会自动执行get()方法
    const res = Reflect.get(target, key, receiver)  //相当于target[key]
    //如果取值是symbol类型 则需要忽略
    if (isSymbol(key)) {
      return res
    }
    //依赖收集
    track(target, key)
    console.log('数据get')

    if (isObject(key)) {  //取值是对象 再进行递归代理->懒递归
      return reactive(key)
    }
    return res
  }
}
```
createGetter方法返回一个get函数</br>
当访问对象中某属性时,就是自动执行get函数，函数的参数target,key,receiver分别代表的是,</br>
需要代理的原对象,访问代理对象的属性key,用于接受代理的对象的receiver</br>
Reflect.get(target,key,receiver) 就相当于target[key],Reflect会返回操作成功或者失败,可以用来用作后续的判断</br>
先判断key是否是Symbol类型,如果是则直接返回</br>
reactive最主要就是在访问某个属性时做依赖收集,而在reactive({ name: 'ywx', age: 23, address: 'hangzhou' })时,就会对对象的属性做依赖收集,</br>
所以需要执行track函数</br>
然后再判断该key是否是对象,如果是对象才会去递归代理该对象</br>

### createSetter()
```
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
```
createSetter方法返回一个set函数</br>
当修改对象中某属性时,就会自动执行set函数，函数的参数target,key,value,receiver分别代表的是,</br>
代理的原对象,修改对象的属性key,修改的新值,用于接受代理的对象的receiver</br>
首先将之前的老值先保存,然后再判断该 代理的对象是一个Object还是Array并且修改的key是否是数组的下标</br>
1、如果不是数组则就是一个对象->再判断这个赋值操作是对原有属性修改还是新增一个属性</br>
2、如果是一个数组但是修改的不是数组的下标,那也当作对象来处理->再判断这个赋值操作是对原有属性修改还是新增一个属性</br>
3、如果是一个数组并且修改的是下标->判断是修改原数组中某一个下标的值还是新增一个值的操作</br>
对于修改属性和新增属性做出区别,分别进行对应属性需要触发更新的操作trgger()
