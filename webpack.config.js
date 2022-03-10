const path = require('path');

module.exports = {
    entry: './public/js/storage.js',
    output: {
        filename: './public/js/bundle.storage.js',
        path: path.resolve(__dirname, '.'),
        libraryTarget: 'umd',
    },
    mode: 'production',

};