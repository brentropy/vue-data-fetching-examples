function colors(client, page) {
  return client.get(`/colors/${page}.json`).then(resp => resp.data);
}
export const queries = { colors };

export const mutations = {};
