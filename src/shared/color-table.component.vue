<template>
  <table :class="{ loading }">
    <thead>
      <tr>
        <th>Name</th>
        <th>RGB</th>
        <th>Hex</th>
        <th>Preview</th>
      </tr>
    </thead>
    <tbody>
      <tr v-if="loading && colors.length === 0">
        <td colspan="4">Loading</td>
      </tr>
      <tr v-for="color in colors" :key="color.name">
        <td>{{ color.name }}</td>
        <td>
          <code>{{ rgb[color.name] }}</code>
        </td>
        <td>
          <code>{{ hex[color.name] }}</code>
        </td>
        <td>
          <div
            class="color-preview"
            :style="{ backgroundColor: hex[color.name] }"
          ></div>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script>
const paddedHex = n => `0${n.toString(16)}`.slice(-2);

export default {
  name: "color-table",
  props: {
    colors: Array,
    loading: Boolean
  },
  computed: {
    rgb() {
      const rgb = {};
      for (const c of this.colors) {
        rgb[c.name] = `rgb(${c.red}, ${c.green}, ${c.blue})`;
      }
      return rgb;
    },
    hex() {
      const hex = {};
      for (const color of this.colors) {
        const r = paddedHex(color.red);
        const g = paddedHex(color.green);
        const b = paddedHex(color.blue);
        hex[color.name] = `#${r}${g}${b}`;
      }
      return hex;
    }
  }
};
</script>

<style scoped>
table {
  width: 100%;
}

th {
  padding: 4px;
  border-bottom: 1px solid #d3d3d3;
  text-align: center;
}

td {
  padding: 4px;
  border-bottom: 1px solid #f5f5f5;
  text-align: center;
}

.color-preview {
  width: 22px;
  height: 22px;
  border: 2px solid #fff;
  box-shadow: 0 0 3px 1px rgba(0, 0, 0, 0.1);
  margin: 0 auto;
}
</style>
