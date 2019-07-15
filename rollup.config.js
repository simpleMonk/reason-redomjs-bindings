import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';


module.exports = {
    input: 'lib/es6_global/src/Index.bs.js',
    output: {
      file: './public/bundle.js',
      format: 'iife',
      name: 'reasonStimulus',
    },
    plugins: [ resolve(), commonjs(),json() ]
};