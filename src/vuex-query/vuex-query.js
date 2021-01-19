import Vue from "vue";

export const QUERY = "query";
export const INVALIDATE = "invalidate";
export const INVALIDATE_WHERE = "invalidateWhere";
export const UPDATE_CACHE = "updateCache";
export const MARK_IF_STALE = "markIfStale";

export function createQueryModule({ queries, ttl, ...module }) {
  const cache = {};
  Object.keys(queries).forEach(key => (cache[key] = {}));

  return {
    ...module,

    state: () => ({
      ...(module.state ? module.state() : null),
      cache
    }),

    actions: {
      ...module.actions,

      [QUERY](context, { query, payload = {} }) {
        const now = Date.now();
        const key = stableValueHash(payload);
        const cache = context.state.cache[query];

        const entry = cache[key] || {
          data: queries[query].default,
          loading: false,
          error: null,
          expiresAt: 0
        };

        if (!cache[key]) {
          context.commit(UPDATE_CACHE, { query, payload, props: entry });
        }

        if (entry.expiresAt <= now) {
          const queryTtl = queries[query].ttl || ttl;
          const expiresAt = now + queryTtl;
          setTimeout(
            () => context.commit(MARK_IF_STALE, { query, key }),
            queryTtl
          );
          context.commit(UPDATE_CACHE, {
            query,
            payload,
            props: { loading: true, expiresAt }
          });
          queries[query]
            .action(context, payload)
            .then(data => {
              context.commit(UPDATE_CACHE, {
                query,
                payload,
                props: { loading: false, error: null, data }
              });
            })
            .catch(error => {
              context.commit(UPDATE_CACHE, {
                query,
                payload,
                props: { loading: false, error }
              });
            });
        }

        return cache[key];
      },

      [INVALIDATE]({ dispatch, commit, state }, { query, key }) {
        if (!query) {
          const queries = Object.keys(state.cache);
          for (const query of queries) {
            dispatch(INVALIDATE, { query });
          }
          return;
        }
        if (!key) {
          const keys = Object.keys(state.cache[query]);
          for (const key of keys) {
            dispatch(INVALIDATE, { query, key });
          }
          return;
        }
        if (typeof key === "string") {
          key = JSON.parse(key);
        }
        if (state.cache[query] && state.cache[query][key]) {
          commit(UPDATE_CACHE, {
            query,
            payload: key,
            props: { expiresAt: Date.now(), stale: true }
          });
        }
      },

      [INVALIDATE_WHERE]({ dispatch, state }, { query, match }) {
        const keys = Object.keys(state.cache[query] || {});
        for (const key of keys) {
          const payload = JSON.parse(key);
          if (objectContains(payload, match)) {
            dispatch(INVALIDATE, { query, payload: payload });
          }
        }
      }
    },

    mutations: {
      ...module.mutations,

      [UPDATE_CACHE](state, { query, payload, props }) {
        const cache = state.cache[query];
        const key = stableValueHash(payload);
        Vue.set(cache, key, { ...cache[key], ...props });
      },

      [MARK_IF_STALE](state, { query, key }) {
        const cache = state.cache[query];
        const now = Date.now();
        if (cache[key] && cache[key].expiresAt <= now) {
          Vue.set(cache, key, { ...cache[key] });
        }
      }
    }
  };
}

export function mapQueries(path, map) {
  const pathArr = Array.isArray(path) ? path : [path];
  const computed = {};
  const keys = Object.keys(map);
  keys.forEach(key => {
    computed[key] = function() {
      const payload = map[key].call(this);
      const module = this.$store._modules.get(pathArr);
      const { actions } = module._rawModule;
      const local = module.context;
      const context = {
        dispatch: local.dispatch,
        commit: local.commit,
        getters: local.getters,
        state: local.state,
        rootState: this.$store.state,
        rootGetters: this.$store.getters
      };
      return actions.query(context, { query: key, payload });
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

// Copied from https://github.com/tannerlinsley/react-query
function stableValueHash(value) {
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
