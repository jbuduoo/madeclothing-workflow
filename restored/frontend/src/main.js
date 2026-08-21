import { createApp } from "vue/dist/vue.esm-bundler.js";
import App from "./App.js";
import router from "./router";
import "./styles.css";

createApp(App).use(router).mount("#app");
