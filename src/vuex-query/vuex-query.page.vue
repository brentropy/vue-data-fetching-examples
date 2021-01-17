<template>
  <div>
    <h1>Vuex Query</h1>
    <color-table :colors="colors.data.colors" :loading="colors.loading" />
    <pagination
      :next="colors.data.meta.next"
      :prev="colors.data.meta.prev"
      @update:page="page = $event"
    />
  </div>
</template>

<script>
import ColorTable from "../shared/color-table.component.vue";
import Pagination from "../shared/pagination.component.vue";
import { mapQueries } from "./vuex-query";

const apiQueries = mapQueries("api", {
  colors() {
    return { page: this.page };
  }
});

export default {
  components: {
    "color-table": ColorTable,
    pagination: Pagination
  },
  data: () => ({
    page: 1
  }),
  computed: {
    ...apiQueries
  }
};
</script>

<style></style>
