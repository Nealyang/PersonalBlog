const path = require('path');
module.exports = {
    entry:'./src/index.js',
    output:{
        publicPath:__dirname+'dist',//js 引用的路径也可以是 cdn 地址
        path:path.resolve(__dirname,'dist'),//出口目录地址
        filename:'[name].[hash].js'//输出的文件名
    },
    module:{
        rules:{
            test:/\.jsx?$/,
            exclude:/node_modules/,
            use:[
                {loader:'babel-loader'}
            ]
        }
    },
    plugins:[

    ],
    devServer:{
        contentBase:path.resolve(__dirname,'dist'),
        prot:9999,
        host:'localhost',
        overlay:true,
        compress:true//服务器返回浏览器的时候是否需要开启 gzip 压缩
    }
}