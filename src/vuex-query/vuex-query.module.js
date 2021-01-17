import { createVuexQueryModule } from "./vuex-query";

export const vuexQueryModule = createVuexQueryModule({
  ttl: 5 * 60 * 1000,
  namespaced: true,
  queries: {
    colors: {
      default: { colors: [], meta: { next: null, prev: null } },
      action({ rootGetters: { client } }, { page }) {
        return client.get(`/colors/${page}.json`).then(resp => resp.data);
      }
    }
  }
});
