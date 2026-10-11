/** @type {import("prettier").Config} */
const config = {
    tabWidth: 4,
    plugins: ["prettier-plugin-tailwindcss"],
    tailwindStylesheet: "./apps/web/app/globals.css",
};

export default config;
