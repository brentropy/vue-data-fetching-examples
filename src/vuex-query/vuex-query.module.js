import { createQueryModule, INVALIDATE } from "./vuex-query";

export const vuexQueryModule = createQueryModule({
  ttl: 5 * 60 * 1000,
  namespaced: true,
  queries: {
    colors: {
      default: { colors: [], meta: { next: null, prev: null } },
      action({ rootGetters: { client } }, { page }) {
        return client.get(`/colors/${page}.json`).then(resp => resp.data);
      }
    }
  },
  actions: {
    // since this is static this endpoint does not actually exist
    // this is just meant to illustrate cache invalidation for updates
    deleteColor({ dispatch, rootGetters: { client } }, { name }) {
      return client.delete(`/colors/${name}`).then(() => {
        dispatch(INVALIDATE, { query: "colors" });
      });
    }
  }
});
