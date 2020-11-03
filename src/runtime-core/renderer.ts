import { createAppAPI } from "./apiCreateApp"

export function createRenderer(options) {
  return baseCreateRenderer(options)
}

function baseCreateRenderer(options) {
  const render = (vnode, container) => {

  }

  return {
    createApp: createAppAPI(render)
  }
}