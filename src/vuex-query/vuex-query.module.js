import { createQueryModule, INVALIDATE } from "./vuex-query";

const client = context => context.rootGetters.client;

export const vuexQueryModule = createQueryModule({
  ttl: 5 * 60 * 1000,

  namespaced: true,

  queries: {
    colors(context, { page }) {
      return client(context)
        .get(`/colors/${page}.json`)
        .then(resp => resp.data);
    }
  },

  actions: {
    deleteColor(context, { name }) {
      return client(context)
        .delete(`/colors/${name}`)
        .then(() => {
          context.dispatch(INVALIDATE, { query: "colors" });
        });
    }
  }
});
