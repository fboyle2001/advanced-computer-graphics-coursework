/*
Boilerplate code is from:
https://threejs.org/docs/#manual/en/introduction/Installation
https://webpack.js.org/guides/typescript/
https://sbcode.net/threejs
*/

const path = require('path')

module.exports = {
    entry: './src/index.ts',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, './dist'),
    },
    mode: 'development',
    devtool: 'eval-source-map',
    devServer: {
        static: {
            directory: path.join(__dirname, './dist'),
        },
        hot: true,
    },
}