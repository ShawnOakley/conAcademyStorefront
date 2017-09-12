module.exports = {
    entry: "./app/js/app.js",
    output: {
        path: __dirname + "/build/app/js",
        filename: "app.js"
    },
    module: {
        loaders: [
            {
              test: /\.scss$/,
              loader: 'style!css!sass'
            },
            {
              test: /\.css$/,
              loader: 'style!css'
            }
        ]
    }
}