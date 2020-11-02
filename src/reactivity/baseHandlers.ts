
function createGetter(){
  return function get(target,key,receiver){  //获取属性的时候会自动执行get()方法
    
  }
}

function createSetter(){
  return function set(target,key,value,receiver){  //设置属性的值的时候会自动执行set()方法

  }
}

//为了预先放参数
const get = createGetter()
const set = createGetter()


export const mutableHandlers = {
  get,
  set
}
