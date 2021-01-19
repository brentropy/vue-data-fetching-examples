import Vuex from "vuex";
import { createClient } from "./client";
import { vuexQueryModule } from "./vuex-query/vuex-query.module";

export const createStore = ({ baseUrl }) =>
  new Vuex.Store({
    state: {
      config: {
        baseUrl
      }
    },
    mutations: {},
    actions: {},
    modules: {
      api: vuexQueryModule
    },
    getters: {
      client({ config }) {
        return createClient({ base: config.baseUrl });
      },
    }
  });
