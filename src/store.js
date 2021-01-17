import Vuex from "vuex";
import { vuexQueryModule } from "./vuex-query/vuex-query.module";

export const createStore = ({ client }) =>
  new Vuex.Store({
    state: {},
    mutations: {},
    actions: {},
    modules: {
      api: vuexQueryModule
    },
    getters: {
      client() {
        return client;
      }
    }
  });
