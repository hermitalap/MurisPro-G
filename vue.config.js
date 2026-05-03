const { defineConfig } = require('@vue/cli-service')
const Components = require('unplugin-vue-components/webpack')
const { NaiveUiResolver } = require('unplugin-vue-components/resolvers')

module.exports = defineConfig({
  transpileDependencies: true,

  configureWebpack: {
    plugins: [
      Components({
        resolvers: [NaiveUiResolver()],
        dts: false,
      }),
    ],
  },

  // 开发服务器配置
  devServer: {
    port: 8080,
    host: 'localhost',
    open: true,
    hot: true,

    // 代理配置 - 将 API 请求转发到 Flask 后端
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        logLevel: 'debug'
      }
    },

    compress: true,

    client: {
      logging: 'info',
      overlay: {
        errors: true,
        warnings: false
      }
    }
  },

  // 生产环境配置
  publicPath: './',

  outputDir: 'dist',

  productionSourceMap: process.env.NODE_ENV !== 'production',

  css: {
    extract: process.env.NODE_ENV === 'production',
    sourceMap: process.env.NODE_ENV !== 'production'
  }
})
