<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps<{
  character: 'yier' | 'bubu'
  state: 'idle' | 'thinking' | 'talking' | 'happy' | 'alert'
}>()

const emit = defineEmits<{
  click: []
  contextMenu: [e: MouseEvent]
}>()

// --- 状态 ---
const isBlinking = ref(false)
const showAlertBubble = ref(false)
let blinkTimer: ReturnType<typeof setInterval> | null = null
let alertTimer: ReturnType<typeof setTimeout> | null = null

// --- 眨眼 ---
function startBlinking() {
  stopBlinking()
  const tick = () => {
    isBlinking.value = true
    setTimeout(() => { isBlinking.value = false }, 150)
    blinkTimer = setTimeout(tick, 2500 + Math.random() * 3000)
  }
  blinkTimer = setTimeout(tick, 1500)
}
function stopBlinking() {
  if (blinkTimer) { clearTimeout(blinkTimer); blinkTimer = null }
}

// --- 闲置提醒 (布布) ---
function resetAlert() {
  showAlertBubble.value = false
  if (alertTimer) clearTimeout(alertTimer)
  if (props.character === 'bubu') {
    alertTimer = setTimeout(() => { showAlertBubble.value = true }, 45000)
  }
}

// --- 拖拽窗口 ---
let isDragging = false
let lastX = 0
let lastY = 0
let moveDistance = 0 // BUG-7 FIX: 累计移动距离
const DRAG_THRESHOLD = 5 // 5px 内视为点击

function onMouseDown(e: MouseEvent) {
  isDragging = false
  moveDistance = 0
  lastX = e.screenX
  lastY = e.screenY

  const onMove = (me: MouseEvent) => {
    const dx = me.screenX - lastX
    const dy = me.screenY - lastY
    moveDistance += Math.abs(dx) + Math.abs(dy)
    if (moveDistance > DRAG_THRESHOLD) {
      isDragging = true
    }
    lastX = me.screenX
    lastY = me.screenY
    window.petAPI?.dragWindow(dx, dy)
  }

  const onUp = () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
    if (!isDragging) {
      emit('click')
      resetAlert()
    }
    isDragging = false
  }

  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

onMounted(() => {
  startBlinking()
  resetAlert()
})

onUnmounted(() => {
  stopBlinking()
  if (alertTimer) clearTimeout(alertTimer)
})

watch(() => props.character, () => {
  resetAlert()
})
</script>

<template>
  <div
    class="pet-wrapper"
    :class="[`pet-${character}`, `state-${state}`]"
    @mousedown="onMouseDown"
    @contextmenu="(e: MouseEvent) => emit('contextMenu', e)"
  >
    <!-- 气泡 -->
    <Transition name="bubble-pop">
      <div v-if="state === 'thinking'" class="bubble thinking-bubble">
        <span class="dot-anim"><i></i><i></i><i></i></span>
      </div>
    </Transition>
    <Transition name="bubble-pop">
      <div v-if="showAlertBubble" class="bubble alert-bubble">嘿，还在吗？✨</div>
    </Transition>

    <!-- 角色 -->
    <div class="character-body">
      <!-- ========== 一二 ========== -->
      <template v-if="character === 'yier'">
        <div class="yier" :class="{ blinking: isBlinking, thinking: state === 'thinking' }">
          <!-- 耳朵 -->
          <div class="ear ear-l"></div>
          <div class="ear ear-r"></div>
          <!-- 头 -->
          <div class="head">
            <div class="eyes">
              <div class="eye" :class="{ closed: isBlinking }"><div class="pupil"></div></div>
              <div class="eye" :class="{ closed: isBlinking }"><div class="pupil"></div></div>
            </div>
            <div class="mouth" :class="{ talking: state === 'talking' }"></div>
            <div class="blush bl"></div>
            <div class="blush br"></div>
          </div>
          <!-- 手臂 -->
          <div class="arm arm-l"></div>
          <div class="arm arm-r"></div>
          <!-- 脚 -->
          <div class="foot foot-l"></div>
          <div class="foot foot-r"></div>
        </div>
      </template>

      <!-- ========== 布布 ========== -->
      <template v-if="character === 'bubu'">
        <div class="bubu" :class="{ blinking: isBlinking, thinking: state === 'thinking', happy: state === 'happy' }">
          <!-- 蝴蝶结 -->
          <div class="bow">
            <div class="bow-l"></div>
            <div class="bow-c"></div>
            <div class="bow-r"></div>
          </div>
          <!-- 头 -->
          <div class="head">
            <div class="eyes">
              <div class="eye" :class="{ closed: isBlinking }"><div class="pupil"></div><div class="sparkle"></div></div>
              <div class="eye" :class="{ closed: isBlinking }"><div class="pupil"></div><div class="sparkle"></div></div>
            </div>
            <div class="mouth" :class="{ talking: state === 'talking', happy: state === 'happy' }"></div>
            <div class="blush bl"></div>
            <div class="blush br"></div>
          </div>
          <!-- 手臂 -->
          <div class="arm arm-l"></div>
          <div class="arm arm-r"></div>
          <!-- 脚 -->
          <div class="foot foot-l"></div>
          <div class="foot foot-r"></div>
        </div>
      </template>
    </div>

    <!-- 地面阴影 -->
    <div class="ground-shadow" :class="{ bouncing: character === 'bubu' }"></div>
  </div>
</template>

<style scoped>
.pet-wrapper {
  position: relative;
  width: 120px;
  height: 150px;
  cursor: pointer;
  transition: transform 0.15s var(--pet-transition);
}
.pet-wrapper:active { transform: scale(0.96); }

.character-body { position: relative; width: 100%; height: 100%; }

/* ===== 气泡 ===== */
.bubble {
  position: absolute;
  top: -38px;
  left: 50%;
  transform: translateX(-50%);
  padding: 5px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  z-index: 10;
  box-shadow: 0 3px 10px rgba(0,0,0,0.08);
}
.thinking-bubble { background: rgba(255,255,255,0.95); color: #6C5CE7; }
.alert-bubble { background: rgba(255,255,255,0.95); color: #FD79A8; animation: float-gentle 2s ease-in-out infinite; }

.dot-anim i {
  display: inline-block;
  width: 5px; height: 5px;
  background: #6C5CE7;
  border-radius: 50%;
  margin: 0 1px;
  animation: dot-bounce 1.4s ease-in-out infinite;
}
.dot-anim i:nth-child(2) { animation-delay: 0.2s; }
.dot-anim i:nth-child(3) { animation-delay: 0.4s; }

@keyframes dot-bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }
@keyframes float-gentle { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(-3px)} }

.bubble-pop-enter-active { animation: pop-in 0.25s ease-out; }
.bubble-pop-leave-active { animation: pop-in 0.15s ease-in reverse; }
@keyframes pop-in { from{opacity:0;transform:translateX(-50%) scale(0.6)} to{opacity:1;transform:translateX(-50%) scale(1)} }

/* ===== 地面阴影 ===== */
.ground-shadow {
  position: absolute;
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 56px;
  height: 8px;
  background: radial-gradient(ellipse, rgba(0,0,0,0.12) 0%, transparent 70%);
  border-radius: 50%;
}
.ground-shadow.bouncing { animation: shadow-pulse 1.5s ease-in-out infinite; }
@keyframes shadow-pulse { 0%,100%{width:56px;opacity:0.8} 50%{width:40px;opacity:0.5} }

/* ==================== 一二 ==================== */
.yier { animation: yier-breathe 3s ease-in-out infinite; }
.yier.thinking { animation: yier-think 0.8s ease-in-out infinite; }

/* 耳朵 */
.yier .ear {
  position: absolute;
  width: 22px; height: 26px;
  background: #f5f5f5;
  border-radius: 50% 50% 0 0;
  top: 10px;
  border: 2px solid #e8e8e8;
  z-index: 0;
}
.yier .ear-l { left: 20px; transform: rotate(-12deg); }
.yier .ear-r { right: 20px; transform: rotate(12deg); }
.yier .ear::after {
  content: '';
  position: absolute;
  width: 10px; height: 12px;
  background: #FFE0E8;
  border-radius: 50% 50% 0 0;
  top: 5px; left: 50%;
  transform: translateX(-50%);
}

/* 头 */
.yier .head {
  position: absolute;
  width: 76px; height: 68px;
  background: #f8f8f8;
  border-radius: 38px 38px 34px 34px;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  border: 2px solid #e8e8e8;
  z-index: 1;
  box-shadow: inset 0 -3px 6px rgba(0,0,0,0.03);
}

/* 眼睛 */
.yier .eyes {
  display: flex;
  justify-content: center;
  gap: 18px;
  margin-top: 18px;
}
.yier .eye {
  width: 14px; height: 16px;
  background: #2D3436;
  border-radius: 50%;
  position: relative;
  transition: all 0.1s;
}
.yier .eye.closed { height: 3px; border-radius: 2px; margin-top: 7px; }
.yier .pupil {
  position: absolute;
  width: 5px; height: 5px;
  background: white;
  border-radius: 50%;
  top: 3px; left: 3px;
}

/* 嘴 */
.yier .mouth {
  display: flex; justify-content: center; margin-top: 6px;
}
.yier .mouth::after {
  content: '';
  width: 8px; height: 4px;
  border-bottom: 2px solid #DDD;
  border-radius: 0 0 50% 50%;
}
.yier .mouth.talking::after {
  width: 8px; height: 5px;
  border-bottom: 2px solid #CCC;
  animation: mouth-move 0.25s ease-in-out infinite alternate;
}

/* 腮红 */
.yier .blush {
  position: absolute;
  width: 12px; height: 7px;
  background: rgba(255,180,190,0.35);
  border-radius: 50%;
  top: 40px;
}
.yier .bl { left: 7px; }
.yier .br { right: 7px; }

/* 手臂 */
.yier .arm {
  position: absolute;
  width: 12px; height: 22px;
  background: #f0f0f0;
  border-radius: 6px;
  top: 78px;
  border: 2px solid #e8e8e8;
  z-index: 0;
}
.yier .arm-l { left: 14px; transform: rotate(8deg); }
.yier .arm-r { right: 14px; transform: rotate(-8deg); }

/* 脚 */
.yier .foot {
  position: absolute;
  width: 20px; height: 11px;
  background: #f0f0f0;
  border-radius: 10px 10px 7px 7px;
  bottom: 5px;
  border: 2px solid #e8e8e8;
}
.yier .foot-l { left: 28px; }
.yier .foot-r { right: 28px; }

@keyframes yier-breathe { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
@keyframes yier-think { 0%,100%{transform:translateY(0) rotate(0)} 25%{transform:translateY(-2px) rotate(-2deg)} 75%{transform:translateY(-2px) rotate(2deg)} }

/* ==================== 布布 ==================== */
.bubu { animation: bubu-float 1.5s ease-in-out infinite; }
.bubu.thinking { animation: bubu-think 0.6s ease-in-out infinite; }
.bubu.happy { animation: bubu-spin 0.7s ease-in-out; }

/* 蝴蝶结 */
.bubu .bow {
  position: absolute;
  top: 8px; left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  display: flex; align-items: center;
}
.bubu .bow-l, .bubu .bow-r {
  width: 12px; height: 9px;
  background: #FF6B9D;
  border-radius: 50%;
}
.bubu .bow-c {
  width: 5px; height: 5px;
  background: #FF4081;
  border-radius: 50%;
  margin: 0 -1px;
  z-index: 1;
}

/* 头 */
.bubu .head {
  position: absolute;
  width: 86px; height: 76px;
  background: linear-gradient(135deg, #FFE0EC 0%, #FFD0E0 100%);
  border-radius: 50% 50% 44% 44%;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  border: 2px solid #FFB0C8;
  z-index: 1;
  box-shadow: inset 0 -5px 10px rgba(255,150,180,0.12), 0 3px 12px rgba(255,100,150,0.08);
}

/* 眼睛 */
.bubu .eyes {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 20px;
}
.bubu .eye {
  width: 18px; height: 20px;
  background: #2D3436;
  border-radius: 50%;
  position: relative;
  transition: all 0.1s;
}
.bubu .eye.closed { height: 3px; border-radius: 2px; margin-top: 9px; }
.bubu .pupil {
  position: absolute;
  width: 7px; height: 7px;
  background: white;
  border-radius: 50%;
  top: 3px; left: 3px;
}
.bubu .sparkle {
  position: absolute;
  width: 3px; height: 3px;
  background: white;
  border-radius: 50%;
  top: 9px; right: 4px;
  opacity: 0.7;
}

/* 嘴 */
.bubu .mouth {
  display: flex; justify-content: center; margin-top: 7px;
}
.bubu .mouth::after {
  content: '';
  width: 10px; height: 5px;
  border-bottom: 2.5px solid #FF6B9D;
  border-radius: 0 0 50% 50%;
}
.bubu .mouth.talking::after {
  width: 8px; height: 7px;
  background: #FF6B9D;
  border-radius: 50%;
  border: none;
  animation: mouth-move 0.2s ease-in-out infinite alternate;
}
.bubu .mouth.happy::after {
  width: 14px; height: 7px;
  border-bottom: 3px solid #FF6B9D;
  border-radius: 0 0 50% 50%;
}

/* 腮红 */
.bubu .blush {
  position: absolute;
  width: 14px; height: 9px;
  background: rgba(255,100,150,0.25);
  border-radius: 50%;
  top: 44px;
}
.bubu .bl { left: 5px; }
.bubu .br { right: 5px; }

/* 手臂 */
.bubu .arm {
  position: absolute;
  width: 14px; height: 18px;
  background: #FFD0E0;
  border-radius: 7px;
  top: 78px;
  border: 2px solid #FFB0C8;
  z-index: 0;
}
.bubu .arm-l { left: 10px; transform: rotate(12deg); animation: wave-l 2s ease-in-out infinite; }
.bubu .arm-r { right: 10px; transform: rotate(-12deg); animation: wave-r 2s ease-in-out infinite; }

/* 脚 */
.bubu .foot {
  position: absolute;
  width: 22px; height: 12px;
  background: #FFD0E0;
  border-radius: 11px 11px 7px 7px;
  bottom: 4px;
  border: 2px solid #FFB0C8;
}
.bubu .foot-l { left: 26px; }
.bubu .foot-r { right: 26px; }

@keyframes bubu-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
@keyframes bubu-think { 0%,100%{transform:translateY(0) rotate(0)} 50%{transform:translateY(-3px) rotate(3deg)} }
@keyframes bubu-spin { 0%{transform:rotate(0) scale(1)} 50%{transform:rotate(180deg) scale(1.08)} 100%{transform:rotate(360deg) scale(1)} }
@keyframes wave-l { 0%,100%{transform:rotate(12deg)} 50%{transform:rotate(22deg)} }
@keyframes wave-r { 0%,100%{transform:rotate(-12deg)} 50%{transform:rotate(-22deg)} }

/* ===== 通用 ===== */
@keyframes mouth-move { from{transform:scaleY(1)} to{transform:scaleY(0.5)} }
</style>
