const { VueLoaderPlugin } = require('vue-loader');
const path = require('path');
module.exports = {
    // This is the "main" file which should include all other modules
    entry: './src/ui/main.js',
    // Where should the compiled file go?
    output: {
        path: path.resolve(__dirname, 'dist'),
        publicPath: 'dist/flamegraph-ui.js',
        filename: 'flamegraph-ui.js'
    },
    resolve: {
        alias: {
            vue: 'vue/dist/vue.js'
        }
    },
    module: {
        // Special compilation rules
        rules: [
            {
                // Ask webpack to check: If this file ends with .js, then apply some transforms
                test: /\.js$/,
                // Transform it with babel
                loader: 'babel-loader',
                // don't transform node_modules folder (which don't need to be compiled)
                exclude: /node_modules/
            },
            {
                // Ask webpack to check: If this file ends with .vue, then apply some transforms
                test: /\.vue$/,
                // don't transform node_modules folder (which don't need to be compiled)
                exclude: /(node_modules|bower_components)/,
                // Transform it with vue
                use: {
                    loader: 'vue-loader'
                }
            }
        ]
    },
    plugins: [
        new VueLoaderPlugin()
    ]
};
