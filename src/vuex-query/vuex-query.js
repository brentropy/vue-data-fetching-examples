import Vue from "vue";

export const QUERY = "vuex-query/query";
export const RESULT = "vuex-query/result";
export const INVALIDATE = "vuex-query/invalidate";
export const INVALIDATE_WHERE = "vuex-query/invalidateWhere";
export const UPDATE_CACHE = "vuex-query/updateCache";
export const MARK_IF_STALE = "vuex-query/markIfStale";

const DEFAULT_TTL = 60000;

export function createQueryModule({
  queries = {},
  ttl = DEFAULT_TTL,
  ...module
}) {
  const cache = {};
  Object.keys(queries).forEach((query) => {
    cache[query] = {};
    if (typeof queries[query] === "function") {
      queries[query] = {
        default: null,
        action: queries[query],
      };
    }
  });

  const assertQuery = (query) => {
    if (!queries[query]) {
      throw Error(`Query "${query}" is not defined.`);
    }
  };

  return {
    ...module,

    state: () => ({
      ...(module.state ? module.state() : null),
      cache,
    }),

    actions: {
      ...module.actions,

      [QUERY](context, { query, payload = {}, key }) {
        assertQuery(query);
        const now = Date.now();
        key = key || payloadToKey(payload);
        const entry = context.getters[RESULT](query, key);

        if (!entry) {
          context.commit(UPDATE_CACHE, {
            query,
            key,
            props: {
              data: queries[query].default,
              loading: false,
              error: null,
              expiresAt: now,
            },
          });
        }

        if (!entry || entry.expiresAt <= now) {
          const queryTtl = queries[query].ttl || ttl;
          const expiresAt = now + queryTtl;

          setTimeout(
            () => context.commit(MARK_IF_STALE, { query, key }),
            queryTtl
          );

          context.commit(UPDATE_CACHE, {
            query,
            key,
            props: { loading: true, expiresAt },
          });

          queries[query].action(context, payload)
            .then((data) => {
              context.commit(UPDATE_CACHE, {
                query,
                key,
                props: { loading: false, error: null, data },
              });
            })
            .catch((error) => {
              context.commit(UPDATE_CACHE, {
                query,
                key,
                props: { loading: false, error },
              });
            });
        }
      },

      [INVALIDATE]({ dispatch, commit, state }, { query, key, payload } = {}) {
        if (!query) {
          const queries = Object.keys(state.cache);
          for (const query of queries) {
            dispatch(INVALIDATE, { query });
          }
          return;
        }
        if (!key && !payload) {
          const keys = Object.keys(state.cache[query]);
          for (const key of keys) {
            dispatch(INVALIDATE, { query, key });
          }
          return;
        }
        if (key) {
          payload = JSON.parse(key);
        } else {
          key = payloadToKey(payload);
        }
        if (state.cache[query] && state.cache[query][key]) {
          commit(UPDATE_CACHE, {
            query,
            key,
            props: { expiresAt: Date.now() },
          });
        }
      },

      [INVALIDATE_WHERE]({ dispatch, state }, { query, match }) {
        const keys = Object.keys(state.cache[query] || {});
        for (const key of keys) {
          const payload = JSON.parse(key);
          if (objectContains(payload, match)) {
            dispatch(INVALIDATE, { query, key });
          }
        }
      },
    },

    mutations: {
      ...module.mutations,

      [UPDATE_CACHE](state, { query, key, props }) {
        const cache = state.cache[query];
        Vue.set(cache, key, { ...cache[key], ...props });
      },

      [MARK_IF_STALE](state, { query, key }) {
        const cache = state.cache[query];
        const now = Date.now();
        if (cache[key] && cache[key].expiresAt <= now) {
          Vue.set(cache, key, { ...cache[key] });
        }
      },
    },

    getters: {
      ...module.getters,

      [RESULT](state) {
        return (query, key) => {
          assertQuery(query);
          return state.cache[query][key];
        };
      },
    },
  };
}

export function mapQueries(namespace, map) {
  if (arguments.length === 1) {
    map = namespace;
    namespace = null;
  }

  const prefix = namespace ? `${namespace}/` : "";
  const computed = {};
  const queries = Object.keys(map);

  queries.forEach((query) => {
    const stateKey = `${query}State`;
    computed[stateKey] = function() {
      const payload = map[query].call(this);
      const key = payloadToKey(payload);
      this.$store.dispatch(`${prefix}${QUERY}`, { query, payload, key });
      return this.$store.getters[`${prefix}${RESULT}`](query, key);
    };
    computed[query] = function() {
      return this[stateKey].data;
    };
    computed[`${query}Loading`] = function() {
      return this[stateKey].loading;
    };
    computed[`${query}Error`] = function() {
      return this[stateKey].error;
    };
  });

  return computed;
}

function objectContains(obj, props) {
  const keys = Object.keys(props);
  for (const prop of keys) {
    const val = props[prop];
    if (isPlainObject(val) || Array.isArray(val)) {
      if (!objectContains(obj[prop], val)) {
        return false;
      }
    } else {
      if (props[prop] !== obj[prop]) {
        return false;
      }
    }
  }
  return true;
}

// Based on stableValueHash from https://github.com/tannerlinsley/react-query
export function payloadToKey(value) {
  return JSON.stringify(value, (_, val) =>
    isPlainObject(val)
      ? Object.keys(val)
          .sort()
          .reduce((result, key) => {
            result[key] = val[key];
            return result;
          }, {})
      : val
  );
}

// Copied from: https://github.com/jonschlinkert/is-plain-object
function isPlainObject(o) {
  if (!hasObjectPrototype(o)) {
    return false;
  }

  // If has modified constructor
  const ctor = o.constructor;
  if (typeof ctor === "undefined") {
    return true;
  }

  // If has modified prototype
  const prot = ctor.prototype;
  if (!hasObjectPrototype(prot)) {
    return false;
  }

  // If constructor does not have an Object-specific method
  // eslint-disable-next-line no-prototype-builtins
  if (!prot.hasOwnProperty("isPrototypeOf")) {
    return false;
  }

  // Most likely a plain Object
  return true;
}

function hasObjectPrototype(o) {
  return Object.prototype.toString.call(o) === "[object Object]";
}
