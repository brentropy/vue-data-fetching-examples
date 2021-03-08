<template>
  <div>
    <h1>Vuex Query</h1>
    <color-table :colors="colors.colors" :loading="colorsLoading" />
    <pagination
      :next="colors.meta.next"
      :prev="colors.meta.prev"
      @update:page="page = $event"
    />
  </div>
</template>

<script>
import ColorTable from "../shared/color-table.component.vue";
import Pagination from "../shared/pagination.component.vue";
import { mapQueries } from "./vuex-query";

export default {
  components: {
    "color-table": ColorTable,
    pagination: Pagination
  },
  data: () => ({
    page: 1
  }),
  computed: {
    ...mapQueries("api", {
      colors() {
        return { page: this.page };
      }
    })
  }
};
</script>

<style></style>
