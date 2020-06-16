<template>
  <g class="arrow">
    <line :x1="x1" :y1="y1" :x2="x2" :y2="y2"/>
    <line :x1="x2" :y1="y2" :x2="side1X" :y2="side1Y"/>
    <line :x1="x2" :y1="y2" :x2="side2X" :y2="side2Y"/>
  </g>
</template>

<script>
  const S = 10
  const ANGLE = Math.PI / 6 // 30deg
  export default {
    name: 'Arrow',
    props: {
      x1: Number,
      x2: Number,
      y1: Number,
      y2: Number,
    },
    computed: {
      w() {
        return this.x2 - this.x1
      },
      h() {
        return this.y2 - this.y1
      },
      angle() {
        return Math.atan2(this.w, this.h)
      },
      length() {
        return Math.sqrt(this.w ** 2 + this.h ** 2)
      },

      sideSize() {
        return Math.min(S, this.length / 2)
      },

      side1Angle() {
        return this.angle + ANGLE
      },
      side2Angle() {
        return this.angle - ANGLE
      },
      side1X() {
        return this.x2 - Math.sin(this.side1Angle) * this.sideSize
      },
      side1Y() {
        return this.y2 - Math.cos(this.side1Angle) * this.sideSize
      },
      side2X() {
        return this.x2 - Math.sin(this.side2Angle) * this.sideSize
      },
      side2Y() {
        return this.y2 - Math.cos(this.side2Angle) * this.sideSize
      },
    },
  }
</script>

<style scoped lang="stylus">

</style>