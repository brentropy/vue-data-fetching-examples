import Home from "./home.page.vue";

export const routes = [
  {
    path: "/",
    name: "Home",
    component: Home
  },
  {
    path: "/vuex-query",
    name: "Vuex Query",
    component: () =>
      import(/* webpackChunkName: "vuex-query" */ "./vuex-query/vuex-query.page.vue")
  }
];
