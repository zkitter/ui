const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const path = require('path');

const isProd = process.env.NODE_ENV === 'production';

const devServerEntries = [
  // 'webpack-dev-server/client?http://localhost:8080',
  // 'webpack/hot/only-dev-server',
];

const envPlugin = new webpack.EnvironmentPlugin({
  NODE_ENV: '',
  BASE_URL: '',
  WEB3_HTTP_PROVIDER: '',
  ENS_RESOLVER: '',
  INDEXER_API: '',
  ARB_HTTP_PROVIDER: '',
  ARB_REGISTRAR: '',
  ARB_EXPLORER: '',
  GUN_PEERS: [],
  APP_TITLE: 'Zkitter',
  APP_LOGO: '',
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
    entry: {
      app: path.join(__dirname, 'src', 'app.tsx'),
      serviceWorker: path.join(__dirname, 'src', 'serviceWorkers', 'index.ts'),
    },
    // [
    //     ...(isProd ? [] : devServerEntries),
    //     `./src/app.tsx`,
    // ],
    output: {
      path: __dirname + '/build',
      publicPath: isProd ? '/' : 'http://localhost:8080/',
      filename: `[name].js`,
    },
    devtool: 'source-map',
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.png', '.svg'],
      modules: [path.resolve('./node_modules')],
      fallback: {
        browserify: require.resolve('browserify'),
        stream: require.resolve('stream-browserify'),
        path: require.resolve('path-browserify'),
        crypto: require.resolve('crypto-browserify'),
        os: require.resolve('os-browserify/browser'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        constants: false,
        fs: false,
      },
    },
    module: {
      rules: [...rules, ...rendererRules],
    },
    plugins: [
      envPlugin,
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
      }),
      new webpack.ProvidePlugin({
        process: 'process',
      }),
      new CopyPlugin({
        patterns: [
          {
            from: process.env.FAVICON || __dirname + '/static/icons/favicon.zkitter.png',
            to: __dirname + '/build/favicon.png',
          },
          {
            from: process.env.MANIFEST || __dirname + '/static/manifest.zkitter.json',
            to: __dirname + '/build/manifest.json',
          },
          {
            from: process.env.APP_LOGO || __dirname + '/static/icons/zkitter_logo.svg',
            to: __dirname + '/build/applogo.svg',
          },
        ],
      }),
      new HtmlWebpackPlugin({
        template: './static/index.template.ejs',
        filename: `index.html`,
        title: process.env.APP_TITLE || 'Zkitter',
        inject: true,
      }),
    ],
    stats: 'minimal',
    devServer: {
      historyApiFallback: true,
      proxy: {
        '/rest': {
          target: `http://127.0.0.1:8080`,
          secure: true,
        },
      },
    },
    // optimization: {
    //     runtimeChunk: 'single'
    // },
  },
];
