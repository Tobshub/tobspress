import dts from "rollup-plugin-dts";
import esbuild from "rollup-plugin-esbuild";
import commonjs from "@rollup/plugin-commonjs";
import packageJson from "./package.json" assert { type: "json" };

const name = packageJson.main.replace(/\.js$/, "");

const bundle = (config) => ({
  ...config,
  input: "./src/index.ts",
  external: (id) => !/^[./]/.test(id),
});

export default [
  bundle({
    plugins: [
      esbuild({ minify: true }),
      commonjs({ esmExternals: true, requireReturnsDefault: true }),
    ],
    output: [
      {
        file: `${name}.js`,
        format: "cjs",
        sourcemap: false,
        exports: "named",
      },
    ],
  }),
  bundle({
    plugins: [dts()],
    output: {
      file: `${name}.d.ts`,
      format: "es",
    },
  }),
];
