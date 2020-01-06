import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import json from "rollup-plugin-json";
import serve from "rollup-plugin-serve";

module.exports = {
  input: "lib/js/src/Redom.bs.js",
  output: {
    file: "./public/bundle.js",
    format: "iife",
    name: "reasonRedom",
    exports: "named"
  },
  plugins: [resolve(), commonjs(), json(), serve("public")]
};
