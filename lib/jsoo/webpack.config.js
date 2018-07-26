const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');
module.exports = {
    entry: [
        "babel-polyfill",
        path.join(__dirname, './src/index.js')
    ],
    output: {
        filename: "./index.js",
    },
    module: {
        rules: [{
            test: /\.js$/,
            use: ['babel-loader'],
            include: path.join(__dirname, 'src'),
            exclude: /node_modules/
        }]
    },
    resolve: {
        extensions: ['.js', '.jsx']
    },
    mode: 'development',
    plugins:[
        new CleanWebpackPlugin(['bundle'])
    ],
    devServer: {
        contentBase: path.join(__dirname, 'dist'),  //启动路径
        host:'localhost',  //域名
        port: 8018,  //端口号
    }
};