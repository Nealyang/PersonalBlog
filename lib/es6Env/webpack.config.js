const webpack = require('webpack')
module.exports = {
    entry:'./src/index.js',
    output:{
        filename:'prd/build.js'
    },
    module:{
        rules:[
            {test:/\.js$/,loader:'babel-loader'}
        ]
    },
    resolve: {
      extensions: ['.js', '.jsx']
    },
    plugins: [
        new webpack.HotModuleReplacementPlugin(),
    ],
    devtool:'eval-source-map',
    mode: "development"
}