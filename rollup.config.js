import ts from 'rollup-plugin-typescript2'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import serve from 'rollup-plugin-serve'
import path from 'path'

export default {
  input:'src/index.ts',
  output:{
    name:'VueReactivity', //window.VueReactivity
    format:'umd',
    file:path.resolve('dist/vue.js'),
    sourcemap:true  //生成映射文件
  },
  plugins:[
    nodeResolve({
      extensions:['.js','.ts']
    }),
    ts({
      tsconfig:path.resolve(__dirname,'tsconfig.json')
    }),
    replace({
      'process.env.NODE_ENV':JSON.stringify('development')
    }),
    serve({
      open:true,
      openPage:'/public/index.html',
      port:3000,
      contentBase:''
    })
  ]
}