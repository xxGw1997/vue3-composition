import { createVnode } from "./vnode"

export function createAppAPI(render) {
  return (rootComponent) => {
    const app = {
      mount(container) {  //和平台无关
        //用户调用的mount方法   
        //当用户 调用createApp(App).mount('#app')这个时
        //会走到这

        //创建 将用户传入的rootComponent(App对象)转换成一个vnode对象
        //创建组件的虚拟节点
        const vnode = createVnode(rootComponent)

        //根据虚拟节点 和 容器进行渲染
        //具体的内部渲染逻辑以及需要做的事情在renderer文件中,其实就是调用patch方法
        render(vnode, container)
      }
    }
    return app
  }
}