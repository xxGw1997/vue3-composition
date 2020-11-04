import { nodeOps } from "./nodeOps"
import { createRenderer } from "../runtime-core/index"
import { patchProp } from "./patchProp"

const renderOptions = { ...nodeOps, patchProp }

function ensureRenderer() {
  return createRenderer(renderOptions)
}

export function createApp(rootComponent) {
  //1、根据组件创建一个渲染器
  const app = ensureRenderer().createApp(rootComponent)
  const { mount } = app
  app.mount = function (container) {
    console.log(container)
    container = document.querySelector(container)
    //1、挂载时需要先将容器清空 再进行挂载
    container.innerHTML = ''
    mount(container)
  }


  return app
}