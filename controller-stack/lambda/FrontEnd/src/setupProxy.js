// 因为是cjs 需要require ，不能使用import
// 在初始化脚手架的时候http-proxy-middleware已经下载了
const {createProxyMiddleware: proxy} = require('http-proxy-middleware');// 暴露一个对象
const targetURL = "https://uulsyplxlg.execute-api.cn-north-1.amazonaws.com.cn/"
module.exports = function (app) {
//调用app的use方法
    app.use(
        proxy('/api', {
            // 转发给谁
            target: targetURL,
            // 让服务器知道从哪发出的 控制服务器收到的请求头的Host字段的值
            changeOrigin: true,
            // 把api1 替换成空格。去除请求前缀，保证交给后台服务器是正常请求地址
            // pathRewrite: {'^/api': ''}
        }),
        // 添加多个
        // proxy('/api/modifyrule', {
        //     target: targetURL + "modifyrule",
        //     changeOrigin: true,
        //     pathRewrite: {'^/modifyrule': ''}
        // }),
        // proxy('/api/deleteemail', {
        //     target: targetURL + "deleteemail",
        //     changeOrigin: true,
        //     pathRewrite: {'^/deleteemail': ''}
        // }),
        // proxy('/api/addemail', {
        //     target: targetURL + "addemail",
        //     changeOrigin: true,
        //     pathRewrite: {'^/addemail': ''}
        // }),
        // proxy('/api/master', {
        //     target: targetURL + "master",
        //     changeOrigin: true,
        //     pathRewrite: {'^/master': ''}
        // }),
        // proxy('/api/check_stack_state', {
        //     target: targetURL + "check_stack_state",
        //     changeOrigin: true,
        //     pathRewrite: {'^/check_stack_state': ''}
        // })
    )
}