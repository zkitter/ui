const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");
const path = require('path');

const isProd = process.env.NODE_ENV === 'production';

const devServerEntries = [
    'webpack-dev-server/client?http://localhost:8080',
    'webpack/hot/only-dev-server',
];

const envPlugin = new webpack.EnvironmentPlugin({
    'NODE_ENV': '',
    'WEB3_HTTP_PROVIDER': '',
    'ENS_RESOLVER': '',
    'INDEXER_API': '',
    'GUN_PEERS': [],
});

const rules = [
    {
        test: /\.node$/,
        use: 'node-loader',
    },
    {
        test: /\.tsx?$/,
        exclude: /(node_modules|.webpack)/,
        use: [
            {
                loader: 'ts-loader',
                options: {
                    transpileOnly: true,
                },
            },
        ],
    },
];

const rendererRules = [
    {
        test: /\.(gif|png|jpe?g|svg)$/i,
        use: [
            'file-loader',
            {
                loader: 'image-webpack-loader',
                options: {
                    publicPath: 'assets',
                    bypassOnDebug: true, // webpack@1.x
                    disable: true, // webpack@2.x and newer
                },
            },
        ],
    },
    {
        test: /\.(s[ac]ss|css)$/i,
        use: [
            // Creates `style` nodes from JS strings
            'style-loader',
            // Translates CSS into CommonJS
            'css-loader',
            // Compiles Sass to CSS
            'sass-loader',
        ],
    },
];

module.exports = [
    {
        target: 'web',
        mode: isProd ? 'production' : 'development',
        entry: [
            ...(isProd ? [] : devServerEntries),
            `./src/app.tsx`,
        ],
        devtool: 'source-map',
        resolve: {
            extensions: ['.ts', '.tsx', '.js', '.jsx', '.png', '.svg'],
            modules: [
                path.resolve('./node_modules')
            ],
            fallback: {
                browserify: require.resolve("browserify"),
                stream: require.resolve("stream-browserify"),
                path: require.resolve("path-browserify"),
                crypto: require.resolve("crypto-browserify"),
                os: require.resolve("os-browserify/browser"),
                http: require.resolve("stream-http"),
                https: require.resolve("https-browserify"),
                fs: false,
            },
        },
        module: {
            rules: [
                ...rules,
                ...rendererRules,
            ],
        },
        output: {
            path: __dirname + '/build',
            publicPath: isProd ? '/' : 'http://localhost:8080/',
            filename: `app.js`,
        },
        plugins: [
            envPlugin,
            new webpack.ProvidePlugin({
                Buffer: ["buffer", "Buffer"],
            }),
            new webpack.ProvidePlugin({
                process: "process",
            }),
            new CopyPlugin([
                {
                    from: "./static/icons/favicon.png",
                    to: __dirname + '/build/favicon.png',
                },
            ]),
            new HtmlWebpackPlugin({
                template: `./static/index.html`,
                filename: `index.html`,
            }),
        ],
        devServer: {
            historyApiFallback: true,
            stats: "minimal",
            proxy: {
                "/rest": {
                    target: `http://127.0.0.1:8080`,
                    secure: true
                }
            }
        }
    },
];