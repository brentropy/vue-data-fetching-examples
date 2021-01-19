import { createClient } from "../client";

// until the bug fix for injecting the client is published
const client = createClient({ base: process.env.BASE_URL });

function colors(page) {
  console.log("page", page)
  return client.get(`/colors/${page}.json`).then(resp => resp.data);
}
export const queries = { colors };

export const mutations = {};
