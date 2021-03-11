import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import {
  createQueryModule,
  QUERY,
  RESULT,
  UPDATE_CACHE,
  payloadToKey,
  MARK_IF_STALE,
  INVALIDATE,
  INVALIDATE_WHERE,
  mapQueries,
} from "./vuex-query";

jest.useFakeTimers();
jest.spyOn(Date, "now").mockReturnValue(0);

describe("vuex-query", () => {
  const ttl = 1000;
  let context;
  let state;
  let queries;
  let module;

  beforeEach(() => {
    queries = {
      search: {
        action: jest.fn().mockResolvedValue(["result"]),
        default: [],
      },
      short: jest.fn().mockResolvedValue("short"),
      error: jest.fn().mockRejectedValue("error"),
    };
    module = createQueryModule({ ttl, queries });
    state = module.state();
    context = {
      state,
      commit: jest.fn(),
      dispatch: jest.fn(),
      getters: {
        [RESULT]: jest
          .fn()
          .mockImplementation((query, key) =>
            module.getters[RESULT](state)(query, key)
          ),
      },
    };
    jest.clearAllMocks();
  });

  describe("module", () => {
    test("returns a new object with all non-special keys", () => {
      const other = "other";
      expect(createQueryModule({ other })).toEqual(
        expect.objectContaining({ other })
      );
    });

    test("merges state", () => {
      const state = () => ({ other: "other" });
      expect(createQueryModule({ state }).state()).toEqual(
        expect.objectContaining({ other: "other", cache: {} })
      );
    });

    test("merges actions", () => {
      const actions = { other: "other" };
      expect(createQueryModule({ actions }).actions).toEqual(
        expect.objectContaining({
          other: "other",
          [QUERY]: expect.any(Function),
        })
      );
    });

    test("merges mutations", () => {
      const mutations = { other: "other" };
      expect(createQueryModule({ mutations }).mutations).toEqual(
        expect.objectContaining({
          other: "other",
          [UPDATE_CACHE]: expect.any(Function),
        })
      );
    });

    test("merges getters", () => {
      const getters = { other: "other" };
      expect(createQueryModule({ getters }).getters).toEqual(
        expect.objectContaining({
          other: "other",
          [RESULT]: expect.any(Function),
        })
      );
    });

    test("excludes queries", () => {
      expect(createQueryModule({ queries: {} })).not.toHaveProperty("queries");
    });

    test("excludes ttl", () => {
      expect(createQueryModule({ ttl: 1000 })).not.toHaveProperty("ttl");
    });
  });

  describe("query", () => {
    let query;

    beforeEach(() => {
      query = module.actions[QUERY];
    });

    test("throws if query is not defined", () => {
      expect(() => query(context, { query: "other", payload: {} })).toThrow();
    });

    test("caches expired default if no value for query/key", () => {
      query(context, { query: "search", payload: { q: "a" } });
      expect(context.commit).toBeCalledWith(UPDATE_CACHE, {
        query: "search",
        key: '{"q":"a"}',
        props: {
          data: [],
          loading: false,
          error: null,
          expiresAt: Date.now(),
        },
      });
    });

    test("uses null as default for shorthand queries", () => {
      query(context, { query: "short", payload: { q: "a" } });
      expect(context.commit).toBeCalledWith(UPDATE_CACHE, {
        query: "short",
        key: '{"q":"a"}',
        props: expect.objectContaining({
          data: null,
        }),
      });
    });

    test("executes query if there is no value for query/key", () => {
      const payload = { q: "a" };
      query(context, { query: "search", payload });
      expect(queries.search.action).toBeCalledWith(context, payload);
    });

    test("executes query if cached entry is expired", () => {
      const payload = { q: "a" };
      state.cache.search[payloadToKey(payload)] = { expiresAt: 0 };
      query(context, { query: "search", payload });
      expect(queries.search.action).toBeCalledWith(context, payload);
    });

    test("does not execute query if cached entry is current", () => {
      const payload = { q: "a" };
      state.cache.search[payloadToKey(payload)] = {
        expiresAt: Date.now() + ttl,
      };
      query(context, { query: "search", payload });
      expect(queries.search.action).not.toBeCalled();
    });

    test("sets expires at to be ttl ms in the future", () => {
      const payload = { q: "a" };
      query(context, { query: "search", payload });
      expect(context.commit).toBeCalledWith(UPDATE_CACHE, {
        query: "search",
        key: '{"q":"a"}',
        props: expect.objectContaining({
          expiresAt: Date.now() + ttl,
        }),
      });
    });

    test("sets loading state", () => {
      const payload = { q: "a" };
      query(context, { query: "search", payload });
      expect(context.commit).toBeCalledWith(UPDATE_CACHE, {
        query: "search",
        key: '{"q":"a"}',
        props: expect.objectContaining({
          loading: true,
        }),
      });
    });

    test("sets loading state false on success", async () => {
      const payload = { q: "a" };
      state.cache.search[payloadToKey(payload)] = { expiresAt: 0 };
      query(context, { query: "search", payload });
      await queries.search.action();
      expect(context.commit).toBeCalledWith(UPDATE_CACHE, {
        query: "search",
        key: '{"q":"a"}',
        props: expect.objectContaining({
          loading: false,
        }),
      });
    });

    test("sets data with resolved query promise", async () => {
      const payload = { q: "a" };
      query(context, { query: "search", payload });
      await queries.search.action();
      expect(context.commit).toBeCalledWith(UPDATE_CACHE, {
        query: "search",
        key: '{"q":"a"}',
        props: expect.objectContaining({
          data: ["result"],
          error: null,
        }),
      });
    });

    test("sets error with rejected query promise", async () => {
      const payload = { q: "a" };
      query(context, { query: "error", payload });
      await queries.error.action().catch(() => {});
      expect(context.commit).toBeCalledWith(UPDATE_CACHE, {
        query: "error",
        key: '{"q":"a"}',
        props: expect.objectContaining({
          error: "error",
        }),
      });
    });

    test("marks if stale after ttl", () => {
      const payload = { q: "a" };
      query(context, { query: "search", payload });
      jest.advanceTimersByTime(ttl);
      expect(context.commit).toBeCalledWith(MARK_IF_STALE, {
        query: "search",
        key: payloadToKey(payload),
      });
    });
  });

  describe("invalidate", () => {
    let invalidate;

    beforeEach(() => {
      invalidate = module.actions[INVALIDATE];
    });

    test("invalidates all queries if no query specified", () => {
      invalidate(context);
      expect(context.dispatch).toBeCalledWith(INVALIDATE, { query: "search" });
      expect(context.dispatch).toBeCalledWith(INVALIDATE, { query: "short" });
      expect(context.dispatch).toBeCalledWith(INVALIDATE, { query: "error" });
    });

    test("invalidates all keys for a query if no key specified", () => {
      state.cache.search = { a: {}, b: {} };
      invalidate(context, { query: "search" });
      expect(context.dispatch).toBeCalledWith(INVALIDATE, {
        query: "search",
        key: "a",
      });
      expect(context.dispatch).toBeCalledWith(INVALIDATE, {
        query: "search",
        key: "b",
      });
    });

    test("invalidates query with key", () => {
      const payload = { q: "a" };
      const key = payloadToKey(payload);
      state.cache.search = { [key]: {} };
      invalidate(context, { query: "search", key });
      expect(context.commit).toBeCalledWith(UPDATE_CACHE, {
        query: "search",
        key,
        props: expect.objectContaining({
          expiresAt: Date.now(),
        }),
      });
    });

    test("invalidates query with payload", () => {
      const payload = { q: "a" };
      const key = payloadToKey(payload);
      state.cache.search = { [key]: {} };
      invalidate(context, { query: "search", payload });
      expect(context.commit).toBeCalledWith(UPDATE_CACHE, {
        query: "search",
        key,
        props: expect.objectContaining({
          expiresAt: Date.now(),
        }),
      });
    });
  });

  describe("invalidate where", () => {
    test("invalidates all keys for query with partial payload match", () => {
      const key1 = payloadToKey({ a: 1, b: 2 });
      const key2 = payloadToKey({ a: 1, b: 3 });
      const key3 = payloadToKey({ a: 4, b: 5 });
      state.cache.search = {
        [key1]: {},
        [key2]: {},
        [key3]: {},
      };
      module.actions[INVALIDATE_WHERE](context, {
        query: "search",
        match: { a: 1 },
      });
      expect(context.dispatch).toBeCalledWith(INVALIDATE, {
        query: "search",
        key: key1,
      });
      expect(context.dispatch).toBeCalledWith(INVALIDATE, {
        query: "search",
        key: key2,
      });
      expect(context.dispatch).not.toBeCalledWith(INVALIDATE, {
        query: "search",
        key: key3,
      });
    });
  });

  describe("update cache", () => {
    test("merges props with cache for query key", () => {
      state.cache.search.a = { a: 1, b: 2 };
      module.mutations[UPDATE_CACHE](state, {
        query: "search",
        key: "a",
        props: { b: 3, c: 4 },
      });
      expect(state.cache.search.a).toEqual({ a: 1, b: 3, c: 4 });
    });
  });

  describe("mark if stale", () => {
    test("does nothing if the entry is not expired", () => {
      state.cache.search.a = { expiresAt: Date.now() + 1 };
      const before = state.cache.search.a;
      module.mutations[MARK_IF_STALE](state, { query: "search", key: "a" });
      expect(state.cache.search.a).toBe(before);
    });

    test("sets cache entry to new object with the same values", () => {
      state.cache.search.a = { expiresAt: Date.now() };
      const before = state.cache.search.a;
      module.mutations[MARK_IF_STALE](state, { query: "search", key: "a" });
      expect(state.cache.search.a).toEqual(before);
      expect(state.cache.search.a).not.toBe(before);
    });
  });

  describe("result", () => {
    test("throws if query is not defined", () => {
      expect(() => module.getters[RESULT](state)("other", "key")).toThrow();
    });

    test("gets cache entry for query and key", () => {
      const entry = {};
      state.cache.search.a = entry;
      expect(module.getters[RESULT](state)("search", "a")).toBe(entry);
    });
  });

  describe("mapQueries", () => {
    let instance;
    let computed;

    beforeEach(() => {
      instance = {
        $store: {
          dispatch: jest.fn(),
          getters: {
            [RESULT]: jest.fn(),
          },
        },
      };
    });

    describe("namespaced", () => {
      let namespacedResult;

      beforeEach(() => {
        namespacedResult = `namespace/${RESULT}`;
        instance.$store.getters[namespacedResult] = jest.fn();
        computed = mapQueries("namespace", {
          search() {
            return { q: "a" };
          },
        });
      });

      test("dispatches namespaced query", () => {
        computed.searchState.call(instance);
        expect(instance.$store.dispatch).toBeCalledWith(`namespace/${QUERY}`, {
          query: "search",
          payload: { q: "a" },
          key: '{"q":"a"}',
        });
      });

      test("returns namespaced result", () => {
        const value = {};
        instance.$store.getters[namespacedResult].mockReturnValue(value);
        const result = computed.searchState.call(instance);
        expect(instance.$store.getters[namespacedResult]).toBeCalledWith(
          "search",
          '{"q":"a"}'
        );
        expect(result).toBe(value);
      });
    });

    describe("unnamespaced", () => {
      beforeEach(() => {
        computed = mapQueries({
          search() {
            return { q: "a" };
          },
        });
      });

      test("dispatches namespaced query", () => {
        computed.searchState.call(instance);
        expect(instance.$store.dispatch).toBeCalledWith(QUERY, {
          query: "search",
          payload: { q: "a" },
          key: '{"q":"a"}',
        });
      });

      test("returns namespaced result", () => {
        const value = {};
        instance.$store.getters[RESULT].mockReturnValue(value);
        const result = computed.searchState.call(instance);
        expect(instance.$store.getters[RESULT]).toBeCalledWith(
          "search",
          '{"q":"a"}'
        );
        expect(result).toBe(value);
      });
    });

    describe("computed properties", () => {
      beforeEach(() => {
        instance.searchState = {
          data: "data",
          loading: "loading",
          error: "error",
        };
        computed = mapQueries({
          search() {
            return {};
          },
        });
      });

      test('data computed property', () => {
        expect(computed.search.call(instance)).toBe("data");
      });

      test('loading computed property', () => {
        expect(computed.searchLoading.call(instance)).toBe("loading");
      });

      test('error computed property', () => {
        expect(computed.searchError.call(instance)).toBe("error");
      });
    })
  });
});
