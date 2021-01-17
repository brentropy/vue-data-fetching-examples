<template>
  <div>
    <button :disabled="!prev" @click="$emit('update:page', prev)">
      Previous
    </button>
    <button :disabled="!next" @click="$emit('update:page', next)">Next</button>
  </div>
</template>

<script>
export default {
  name: "pagination",
  props: {
    next: Number,
    prev: Number
  }
};
</script>

<style scoped></style>
