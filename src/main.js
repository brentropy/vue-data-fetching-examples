import Vue from "vue";
import Vuex from "vuex";
import VueRouter from "vue-router";

import App from "./app.vue";
import { createClient } from "./client";
import { routes } from "./routes";
import { createStore } from "./store";

Vue.use(Vuex);
Vue.use(VueRouter);

Vue.config.productionTip = false;

const client = createClient({
  base: process.env.BASE_URL
});

const store = createStore({
  client
});

const router = new VueRouter({
  mode: "history",
  base: process.env.BASE_URL,
  routes
});

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount("#app");
