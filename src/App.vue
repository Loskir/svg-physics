<template>
  <div id="app">
    <div class="controls">
      <button @click="stopSimulation" v-if="simulationRunning">Stop</button>
      <button @click="startSimulation" v-else>Start</button>

      <button @click="resumeSimulation" :disabled="!simulationRunning" v-if="simulationPaused">Resume</button>
      <button @click="pauseSimulation" :disabled="!simulationRunning" v-else>Pause</button>
    </div>
    <svg
      ref="svg"
      :viewBox="`0 0 ${vw} ${vh}`"
      @mousemove="handleSVGMousemove"
      @mouseup="cancelDrags"
      :class="{'cursor-all-scroll': anyDragging}">
      <g>
        <template v-for="i in gridXBreakpoints">
          <line :key="`x${i}`" class="grid" :x1="i" :x2="i" y1="0" :y2="vh"/>
        </template>
        <template v-for="i in gridYBreakpoints">
          <line :key="`y${i}`" class="grid" :y1="i" :y2="i" x1="0" :x2="vw"/>
        </template>
      </g>

      <!--      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle">{{vw}}, {{vh}}</text>-->

      <line class="axis" :x1="cx" :x2="cx" y1="0" :y2="vh"/>
      <line class="axis" :y1="cy" :y2="cy" x1="0" :x2="vw"/>

      <polyline :points="predictionPolyline" class="predictions"/>

      <polygon :points="boundingPoints" class="line"/>

      <!--      <path class="line" :d="squarePath"/>-->
      <Arrow
        :x1="formatX(fromPointX)"
        :y1="formatY(fromPointY)"
        :x2="formatX(fromPointSpeedAbsoluteX)"
        :y2="formatY(fromPointSpeedAbsoluteY)"/>
      <Arrow
        :x1="formatX(toPointX)"
        :y1="formatY(toPointY)"
        :x2="formatX(toPointSpeedAbsoluteX)"
        :y2="formatY(toPointSpeedAbsoluteY)"/>
      <circle
        class="point-filled"
        :cx="formatX(fromPointX)"
        :cy="formatY(fromPointY)"
        r="7"
        @mousedown="fromPointDragging = true"
      />
      <circle
        class="point"
        :cx="formatX(fromPointSpeedAbsoluteX)"
        :cy="formatY(fromPointSpeedAbsoluteY)"
        r="7"
        @mousedown="fromPointSpeedDragging = true"
      />
      <circle
        class="point"
        :cx="formatX(toPointX)"
        :cy="formatY(toPointY)"
        r="7"
        @mousedown="toPointDragging = true"
      />
      <circle
        class="point"
        :cx="formatX(toPointSpeedAbsoluteX)"
        :cy="formatY(toPointSpeedAbsoluteY)"
        r="7"
        @mousedown="toPointSpeedDragging = true"
      />

      <circle
        class="point"
        :cx="formatX(boundingTopLeftX)"
        :cy="formatY(boundingTopLeftY)"
        r="7"
        @mousedown="boundingTopLeftDragging = true"
      />
      <circle
        class="point"
        :cx="formatX(boundingBottomRightX)"
        :cy="formatY(boundingBottomRightY)"
        r="7"
        @mousedown="boundingBottomRightDragging = true"
      />
      <!--      <circle-->
      <!--        class="point"-->
      <!--        :cx="formatX(squarePointX)"-->
      <!--        :cy="formatY(squarePointY)"-->
      <!--        r="8"-->
      <!--        @mousedown="squarePointDragging = true"-->
      <!--      />-->
    </svg>
  </div>
</template>

<script>
  import Arrow from '@/components/Arrow.vue'

  const SCALE = 30 // pixels per cell

  export default {
    name: 'App',
    components: {
      Arrow,
    },
    data: () => ({
      fromPointX: 0,
      fromPointY: 0,
      fromPointDragging: false,

      fromPointSpeedX: 1,
      fromPointSpeedY: 1,
      fromPointSpeedDragging: false,

      toPointX: 5,
      toPointY: 5,
      toPointDragging: false,

      toPointSpeedX: -1,
      toPointSpeedY: 1,
      toPointSpeedDragging: false,

      boundingTopLeftX: -10,
      boundingTopLeftY: 10,
      boundingTopLeftDragging: false,
      boundingBottomRightX: 10,
      boundingBottomRightY: -10,
      boundingBottomRightDragging: false,

      vw: 0,
      vh: 0,

      accelerationX: 0,
      accelerationY: -2,

      fromPointInitialX: 0,
      fromPointInitialY: 0,
      fromPointInitialSpeedX: 0,
      fromPointInitialSpeedY: 0,

      ticks: 0,
      simulationPaused: false,
      simulationRunning: false,
      estimatedTime: 0,

      predictionTime: 5,
      predictionPrecision: 1/10,
      precision: 1/10,
    }),
    methods: {
      formatX(x) {
        return this.cx + x * SCALE
      },
      formatY(y) {
        return this.cy - y * SCALE
      },
      getCoords(e) {
        const {offsetX, offsetY} = e
        const x = (offsetX - this.cx) / SCALE
        const y = (this.cy - offsetY) / SCALE
        return {x, y}
      },
      handleSVGMousemove(e) {
        if (e.buttons === 0) {
          return this.cancelDrags()
        }
        if (!this.anyDragging) {
          return
        }
        let {x, y} = this.getCoords(e)
        const threshold = 0.15
        if (Math.abs(x - Math.round(x)) < threshold) {
          x = Math.round(x)
        }
        if (Math.abs(y - Math.round(y)) < threshold) {
          y = Math.round(y)
        }

        if (this.fromPointDragging) {
          this.fromPointX = x
          this.fromPointY = y
        } else if (this.fromPointSpeedDragging) {
          this.fromPointSpeedAbsoluteX = x
          this.fromPointSpeedAbsoluteY = y
        } else if (this.toPointDragging) {
          this.toPointX = x
          this.toPointY = y
        } else if (this.toPointSpeedDragging) {
          this.toPointSpeedAbsoluteX = x
          this.toPointSpeedAbsoluteY = y
        } else if (this.boundingTopLeftDragging) {
          this.boundingTopLeftX = Math.min(x, this.boundingBottomRightX)
          this.boundingTopLeftY = Math.max(y, this.boundingBottomRightY)
        } else if (this.boundingBottomRightDragging) {
          this.boundingBottomRightX = Math.max(x, this.boundingTopLeftX)
          this.boundingBottomRightY = Math.min(y, this.boundingTopLeftY)
        }
      },
      cancelDrags() {
        this.fromPointDragging = false
        this.fromPointSpeedDragging = false
        this.toPointDragging = false
        this.toPointSpeedDragging = false
        this.boundingTopLeftDragging = false
        this.boundingBottomRightDragging = false
      },

      updateSize() {
        const {innerWidth, innerHeight} = window
        this.vw = innerWidth
        this.vh = innerHeight
      },

      startSimulation() {
        this.fromPointInitialX = this.fromPointX
        this.fromPointInitialY = this.fromPointY
        this.fromPointInitialSpeedX = this.fromPointSpeedX
        this.fromPointInitialSpeedY = this.fromPointSpeedY

        this.ticks = 0
        this.simulationRunning = true
        this.simulationPaused = false

        return requestAnimationFrame(this.processAnimationFrame)
      },
      stopSimulation() {
        this.fromPointX = this.fromPointInitialX
        this.fromPointY = this.fromPointInitialY
        this.fromPointSpeedX = this.fromPointInitialSpeedX
        this.fromPointSpeedY = this.fromPointInitialSpeedY

        this.simulationRunning = false
        this.simulationPaused = false

        return requestAnimationFrame(this.processAnimationFrame)
      },
      pauseSimulation() {
        this.simulationPaused = true
      },
      resumeSimulation() {
        this.simulationPaused = false
        return requestAnimationFrame(this.processAnimationFrame)
      },
      processAnimationFrame() {
        this.ticks += 1
        // if (this.ticks > 1000) {
        //   return this.stopSimulation()
        // }
        if (!this.simulationRunning || this.simulationPaused) {
          return
        }

        const coef = 1/10

        const times = coef / this.precision

        for (let i = 0; i < times; ++i) {
          this.fromPointSpeedX += this.accelerationX * this.precision
          this.fromPointSpeedY += this.accelerationY * this.precision
          this.fromPointX += this.fromPointSpeedX * this.precision
          this.fromPointY += this.fromPointSpeedY * this.precision

          if (this.fromPointX > this.boundingBottomRightX) {
            this.fromPointX = 2 * this.boundingBottomRightX - this.fromPointX
            if (this.fromPointSpeedX > 0) {
              this.fromPointSpeedX *= -1
            }
          }
          if (this.fromPointX < this.boundingTopLeftX) {
            this.fromPointX = 2 * this.boundingTopLeftX - this.fromPointX
            if (this.fromPointSpeedX < 0) {
              this.fromPointSpeedX *= -1
            }
          }
          if (this.fromPointY > this.boundingTopLeftY) {
            this.fromPointY = 2 * this.boundingTopLeftY - this.fromPointY
            if (this.fromPointSpeedY > 0) {
              this.fromPointSpeedY *= -1
            }
          }
          if (this.fromPointY < this.boundingBottomRightY) {
            this.fromPointY = 2 * this.boundingBottomRightY - this.fromPointY
            if (this.fromPointSpeedY < 0) {
              this.fromPointSpeedY *= -1
            }
          }
        }

        return requestAnimationFrame(this.processAnimationFrame)
      },
    },
    computed: {
      width() {
        return this.vw / SCALE
      },
      height() {
        return this.vh / SCALE
      },

      cx() {
        return this.vw / 2
      },
      cy() {
        return this.vh / 2
      },

      gridXBreakpoints() {
        let v = []
        for (let i = this.cx; i <= this.vw; i += SCALE) {
          v.push(i)
        }
        for (let i = this.cx - 1; i >= 0; i -= SCALE) {
          v.push(i)
        }
        return v
      },
      gridYBreakpoints() {
        let v = []
        for (let i = this.cy; i <= this.vh; i += SCALE) {
          v.push(i)
        }
        for (let i = this.cy - 1; i >= 0; i -= SCALE) {
          v.push(i)
        }
        return v
      },

      anyDragging() {
        return this.fromPointDragging
          || this.fromPointSpeedDragging
          || this.toPointDragging
          || this.toPointSpeedDragging
          || this.boundingTopLeftDragging
          || this.boundingBottomRightDragging
      },

      fromPointSpeedAbsoluteX: {
        get() {
          return this.fromPointX + this.fromPointSpeedX
        },
        set(v) {
          this.fromPointSpeedX = v - this.fromPointX
        }
      },
      fromPointSpeedAbsoluteY: {
        get() {
          return this.fromPointY + this.fromPointSpeedY
        },
        set(v) {
          this.fromPointSpeedY = v - this.fromPointY
        }
      },
      toPointSpeedAbsoluteX: {
        get() {
          return this.toPointX + this.toPointSpeedX
        },
        set(v) {
          this.toPointSpeedX = v - this.toPointX
        }
      },
      toPointSpeedAbsoluteY: {
        get() {
          return this.toPointY + this.toPointSpeedY
        },
        set(v) {
          this.toPointSpeedY = v - this.toPointY
        }
      },

      boundingPoints() {
        return [
          [this.boundingTopLeftX, this.boundingTopLeftY],
          [this.boundingBottomRightX, this.boundingTopLeftY],
          [this.boundingBottomRightX, this.boundingBottomRightY],
          [this.boundingTopLeftX, this.boundingBottomRightY],
        ].map(([x, y]) => `${this.formatX(x)},${this.formatY(y)}`).join(' ')
      },

      distanceX() {
        return this.toPointX - this.fromPointX
      },

      predictionPoints() {
        let v = []

        let fromPointX = this.fromPointX
        let fromPointY = this.fromPointY
        let fromPointSpeedX = this.fromPointSpeedX
        let fromPointSpeedY = this.fromPointSpeedY
        for (let time = 0; time < this.predictionTime; time += this.predictionPrecision) {
          fromPointSpeedX += this.accelerationX * this.predictionPrecision
          fromPointSpeedY += this.accelerationY * this.predictionPrecision
          fromPointX += fromPointSpeedX * this.predictionPrecision
          fromPointY += fromPointSpeedY * this.predictionPrecision
          if (fromPointX > this.boundingBottomRightX) {
            fromPointX = 2 * this.boundingBottomRightX - fromPointX
            if (fromPointSpeedX > 0) {
              fromPointSpeedX *= -1
            }
          }
          if (fromPointX < this.boundingTopLeftX) {
            fromPointX = 2 * this.boundingTopLeftX - fromPointX
            if (fromPointSpeedX < 0) {
              fromPointSpeedX *= -1
            }
          }
          if (fromPointY > this.boundingTopLeftY) {
            fromPointY = 2 * this.boundingTopLeftY - fromPointY
            if (fromPointSpeedY > 0) {
              fromPointSpeedY *= -1
            }
          }
          if (fromPointY < this.boundingBottomRightY) {
            fromPointY = 2 * this.boundingBottomRightY - fromPointY
            if (fromPointSpeedY < 0) {
              fromPointSpeedY *= -1
            }
          }
          v.push([fromPointX, fromPointY])
        }

        return v
      },
      predictionPolyline() {
        return this.predictionPoints.map(([x, y]) => `${this.formatX(x)},${this.formatY(y)}`).join(' ')
      },
    },
    mounted() {
      this.updateSize()
      window.addEventListener('resize', () => this.updateSize())
    },
    beforeDestroy() {
      window.removeEventListener('resize', () => this.updateSize())
    }
  }
</script>

<style>
  body {
    margin: 0;
  }

  #app {
    font-family: "Avenir", Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: #2c3e50;

    width: 100vw;
    height: 100vh;
  }

  .controls {
    position: fixed;
    top: 0;
    right: 0;
    background: white;
    padding: 5px;
  }

  line.grid {
    stroke: #cbd5e0;
    stroke-width: 1;
  }

  line.axis {
    stroke: black;
    stroke-width: 2;
  }

  .point {
    /*fill: #d53f8c;*/
    fill: transparent;
    cursor: all-scroll;
  }
  .point-filled {
    fill: #d53f8c;
    /*fill: transparent;*/
    cursor: all-scroll;
  }

  .line {
    fill: none;
    stroke: #ed64a6;
    stroke-width: 5;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .arrow {
    fill: none;
    stroke: #ed64a6;
    stroke-width: 3;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .predictions {
    fill: none;
    stroke: #ed64a6;
    stroke-width: 2;
    stroke-linejoin: round;
    stroke-linecap: round;
  }

  .cursor-all-scroll {
    cursor: all-scroll;
  }

  .distance-overlay {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  text {
    font: bold 80px monospace;
    fill: #fed7e2;
    user-select: none;
  }
</style>
