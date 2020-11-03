
function patchClass(el, value) {
  if (value == null) {
    value = ''
  }
  el.className = value
}

function patchStyle(el, prev, next) {
  //{color:red}  {background:red}
  const style = el.style
  if (!next) {
    el.removeAttribute('style')
  } else {
    for (let key in prev) {
      style[key] = next[key]
    }
    if (prev) {
      for (let key in prev) {
        if (next[key] == null) {
          style[key] = ''
        }
      }
    }
  }
}

export function patchProp(el, key, prevValue, nextValue) {
  switch (key) {
    case 'class':
      patchClass(el, nextValue)
      break;
    case 'style':
      //{color:'red'}
      patchStyle(el, prevValue, nextValue)
      break;
    default:
      break;
  }
}