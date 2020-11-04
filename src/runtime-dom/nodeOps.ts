export const nodeOps = {
  createElement(type){
    console.log('123:',type)
    // return document.createElement('div')
    return document.createElement(type)
  },
  setElementText(el,text){
    el.textContent = text
  },
  insert(child,parent,anchor=null){
    parent.insertBefore(child,anchor)
  },
  remove(child){
    const parent = child.parentNode
    if(parent) parent.removeChild(child)
  }
}