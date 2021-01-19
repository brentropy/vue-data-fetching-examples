import Vue from "vue";
import Vuex from "vuex";
import VueRouter from "vue-router";
import VueKwery from "vue-kwery";

import App from "./app.vue";
import { routes } from "./routes";
import { createStore } from "./store";
import { queries, mutations } from "./vue-kwery/vue-kwery.resolvers";

Vue.use(Vuex);
Vue.use(VueRouter);

Vue.config.productionTip = false;

Vue.use(VueKwery, { queries, mutations });

const store = createStore({
  baseUrl: process.env.BASE_URL
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
