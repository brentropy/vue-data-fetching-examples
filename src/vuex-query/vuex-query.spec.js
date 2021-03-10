import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { createQueryModule, QUERY, RESULT, UPDATE_CACHE, payloadToKey } from "./vuex-query";

jest.useFakeTimers();

describe("vuex-query", () => {
  beforeEach(() => {
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
    const ttl = 1000;
    let context;
    let state;
    let queries;
    let module;
    let query;

    beforeEach(() => {
      queries = {
        search: {
          action: jest.fn().mockResolvedValue(["result"]),
          default: []
        },
        short: jest.fn().mockResolvedValue("short"),
        error: jest.fn().mockRejectedValue("error")
      };
      module = createQueryModule({ ttl, queries });
      query = module.actions[QUERY];
      state = module.state();
      context = {
        state,
        commit: jest.fn(),
        getters: {
          [RESULT]: jest
            .fn()
            .mockImplementation((query, key) =>
              module.getters[RESULT](state)(query, key)
            )
        }
      };
    });

    test("throws if query is not defined", () => {
      expect(() => query(context, { query: "other", payload: {} })).toThrow();
    });

    test("caches expired default if no value for query/key", () => {
      query(context, { query: "search", payload: { q: "a" } });
      expect(context.commit).toBeCalledWith(UPDATE_CACHE, {
        query: "search",
        payload: { q: "a" },
        props: {
          data: [],
          loading: false,
          error: null,
          expiresAt: 0
        }
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
        expiresAt: Date.now() + ttl
      };
      query(context, { query: "search", payload });
      expect(queries.search.action).not.toBeCalled();
    });

    test("sets loading state", () => {
      const payload = { q: "a" };
      query(context, { query: "search", payload });
      expect(context.commit).toBeCalledWith(UPDATE_CACHE, {
        query: "search",
        payload,
        props: expect.objectContaining({
          loading: true
        })
      });
    });

    test("sets loading state false on success", () => {
      const payload = { q: "a" };
      query(context, { query: "search", payload });
      expect(context.commit).toBeCalledWith(UPDATE_CACHE, {
        query: "search",
        payload,
        props: expect.objectContaining({
          loading: false
        })
      });
    });
  });

  describe("invalidate", () => {});

  describe("result", () => {});

  describe("mapQueries", () => {});
});
