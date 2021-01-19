<template>
  <div>
    <h1>Vue Kwery</h1>
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

const apiQueries = {
  colors() {
    return this.$kwery.query("colors", [this.page]);
  }
};

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
