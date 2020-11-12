
function patchClass(el, value) {
  //class 属性直接覆盖之前的即可
  if (value == null) {
    //如果需要更新的class 是null,将需要修改的class的值清空即可
    value = ''
  }
  //将要更新的类名覆盖之前的即可
  el.className = value
}

function patchStyle(el, prev, next) {
  //{color:red}  {background:red}
  //获取当前元素的style属性
  const style = el.style
  if (!next) { //判断需要更新的style 是否有值,如果没有值,则说明不需要有样式
    //直接将style 移除掉即可
    el.removeAttribute('style')
  } else {  //如果有值
    for (let key in next) { //先遍历新的style中的属性,并且把新的属性更新到style中
      style[key] = next[key]
    }
    if (prev) { //判断之前style 属性 是否有值  如果有值
      for (let key in prev) { //遍历 之前style中的属性
        if (next[key] == null) {  //如果之前的style有该属性,但是在新的中没有,则需要把这个属性给移除掉
          style[key] = ''
        }
      }
    }
  }
}

function patchAttr(el, key, value) {
  if (value == null) {//如果需要更新的值为空,则直接移除之前的属性就可
    el.removeAttribute(key)
  } else {  // 否者设置对应属性即可
    el.setAttribute(key, value)
  }
}

export function patchProp(el, key, prevValue, nextValue) {
  switch (key) {
    case 'class':
      //修改class 
      patchClass(el, nextValue)
      break;
    case 'style':
      //修改style 
      patchStyle(el, prevValue, nextValue)
      break;
    default:
      //修改属性
      patchAttr(el, key, nextValue)
      break;
  }
}